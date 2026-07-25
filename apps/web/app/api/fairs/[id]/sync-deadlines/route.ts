import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { Firecrawl } from 'firecrawl'
import { serverEnv } from '@/lib/env'

// Built lazily on first use (never at import) so a missing FIRECRAWL_API_KEY
// can't fail `next build`; validated by serverEnv when the route actually runs.
/**
 * Ceiling on the Firecrawl extract. Generous because the job crawls a whole
 * site and runs an LLM extraction, but finite: an unbounded await here is a
 * request that never returns.
 */
const FIRECRAWL_TIMEOUT_MS = 60_000

/** A sync claim older than this is assumed dead and may be taken over. */
const SYNC_CLAIM_TTL_MS = 2 * 60_000

/**
 * How long a completed crawl stands before another is allowed. `Fair` is a
 * GLOBAL row: without a cooldown, every matched student in a state could pay for
 * the same crawl, repeatedly, on a dataset that changes a few times a year.
 */
const SYNC_COOLDOWN_MS = 12 * 60 * 60_000

/**
 * Plausible event years. A model that returns 1999 or 2190 has misread the page,
 * and this writes to a row every team in the state reads.
 */
function isPlausibleYear(year: number): boolean {
  const now = new Date().getUTCFullYear()
  return Number.isInteger(year) && year >= now - 1 && year <= now + 3
}

/**
 * Resolve `promise`, or reject once `ms` elapses. The underlying work is not
 * cancellable (the Firecrawl SDK exposes no abort signal) — this bounds how
 * long WE wait, which is what the caller and the platform care about.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Firecrawl extract timed out after ${ms}ms`)), ms).unref?.(),
    ),
  ])
}

let cachedFirecrawl: Firecrawl | undefined
function firecrawl(): Firecrawl {
  return (cachedFirecrawl ??= new Firecrawl({ apiKey: serverEnv.FIRECRAWL_API_KEY() }))
}

/**
 * Schema passed to Firecrawl extract. Firecrawl uses it to steer its LLM and
 * type-check the response — we get validated structured data back, no Claude
 * post-processing step needed.
 */
const DatesSchema = z.object({
  year: z.number().nullable().describe('Calendar year of the upcoming fair event'),
  eventDate: z
    .string()
    .nullable()
    .describe('Main competition/fair day in YYYY-MM-DD format'),
  registrationDeadline: z
    .string()
    .nullable()
    .describe('Student registration deadline in YYYY-MM-DD format'),
  abstractDeadline: z
    .string()
    .nullable()
    .describe('Abstract or project-summary submission deadline in YYYY-MM-DD format'),
  venue: z.string().nullable().describe('Short venue name or city/location string'),
})

type ExtractedDates = z.infer<typeof DatesSchema>

/**
 * POST /api/fairs/[id]/sync-deadlines
 *
 * Replaces the old `fetch + htmlToText + Claude` pipeline with a single
 * Firecrawl extract call. Firecrawl handles JS-rendered pages, follows links
 * to /dates, /schedule, /registration sub-pages, and returns structured JSON
 * that matches DatesSchema — no extra LLM step required.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Strict rate limit: each call triggers a paid Firecrawl job.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const fair = await db.fair.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, websiteUrl: true, level: true, state: true },
  })
  if (!fair) return NextResponse.json({ error: 'Fair not found' }, { status: 404 })

  // `Fair` is a GLOBAL catalog row and `FairEvent` is shared by every team, so
  // "caller has some team" is not authority to rewrite it (BLK-5). Restrict the
  // paid scrape to fairs this team is actually matched with — ISEF or a fair in
  // the team's own state (the same set matchFairs surfaces in the UI).
  if (fair.level !== 'international') {
    const team = await db.team.findUnique({
      where: { id: ctx.teamId },
      select: { locationState: true },
    })
    if (!team?.locationState || fair.state !== team.locationState) {
      return NextResponse.json({ error: 'Fair not found' }, { status: 404 })
    }
  }

  if (!fair.websiteUrl) {
    return NextResponse.json({ error: 'This fair has no website to read' }, { status: 400 })
  }

  // Never overwrite curated data with scrape output: if the latest event is
  // already `confirmed`, return it as-is — no Firecrawl spend, no downgrade.
  const latest = await db.fairEvent.findFirst({
    where: { fairId: fair.id },
    orderBy: { year: 'desc' },
  })
  if (latest?.status === 'confirmed') {
    return NextResponse.json({
      event: {
        year: latest.year,
        eventDate: latest.eventDate?.toISOString() ?? null,
        registrationDeadline: latest.registrationDeadline?.toISOString() ?? null,
        abstractDeadline: latest.abstractDeadline?.toISOString() ?? null,
        venue: latest.venue,
        status: 'confirmed',
      },
    })
  }

  // ── Claim the crawl before paying for it (REFACTOR2 P1-S10) ───────────────
  // One conditional stamp elects a single crawler and enforces the cooldown in
  // the same statement: the row must have no live claim AND not have been synced
  // recently. Losers are told to wait rather than each starting their own paid
  // job against a row they all share.
  const claimStamp = new Date()
  const claim = await db.fair.updateMany({
    where: {
      id: fair.id,
      OR: [
        { syncClaimedAt: null },
        { syncClaimedAt: { lt: new Date(claimStamp.getTime() - SYNC_CLAIM_TTL_MS) } },
      ],
      AND: [
        {
          OR: [
            { lastSyncedAt: null },
            { lastSyncedAt: { lt: new Date(claimStamp.getTime() - SYNC_COOLDOWN_MS) } },
          ],
        },
      ],
    },
    data: { syncClaimedAt: claimStamp },
  })
  if (claim.count !== 1) {
    return NextResponse.json(
      {
        error:
          'These dates were refreshed recently, or another student is refreshing them right now. Try again later.',
      },
      { status: 429 },
    )
  }
  /** Hand the slot back so a failure does not hold the fair for the full TTL. */
  const releaseClaim = () =>
    db.fair
      .updateMany({ where: { id: fair.id, syncClaimedAt: claimStamp }, data: { syncClaimedAt: null } })
      .catch(() => {})

  const today = new Date().toISOString().slice(0, 10)

  // Pass both the homepage and a wildcard so Firecrawl can follow links to
  // /schedule, /dates, /registration pages where deadlines usually live.
  const base = fair.websiteUrl.replace(/\/$/, '')
  let extracted: ExtractedDates | null = null

  try {
    // Bound the call. Firecrawl crawls and LLM-extracts across a whole site, so
    // it is the slowest external dependency here — and its SDK takes no abort
    // signal, which left this the ONE unbounded external call in the codebase.
    // A stalled crawl would otherwise hold the request open until the platform
    // killed it, with the student watching a spinner. `Promise.race` cannot
    // cancel the underlying work, but it does return control on time.
    const res = await withTimeout(
      firecrawl().extract({
      urls: [fair.websiteUrl, `${base}/*`],
      prompt: `Extract the next upcoming event dates for the ${fair.name} science fair.
Today is ${today}. Find:
- The main competition / fair day
- The student registration deadline
- The abstract or project-summary submission deadline
- The venue or city

Use YYYY-MM-DD date format. If only a month is given, use the 1st of that month.
Return null for any date not found on the site — do not guess.`,
        schema: DatesSchema,
      }),
      FIRECRAWL_TIMEOUT_MS,
    )

    if (res.success && res.data) {
      // VALIDATE, don't cast (P1-S10). Firecrawl steers an LLM with the schema
      // but the response is still provider output landing in a row every team
      // in the state reads — a cast would let any shape through.
      const parsed = DatesSchema.safeParse(res.data)
      extracted = parsed.success ? parsed.data : null
    }
  } catch (err) {
    console.error('[sync-deadlines] Firecrawl extract failed:', err)
    await releaseClaim()
    return NextResponse.json(
      { error: "Could not read the fair's site — check it manually" },
      { status: 502 },
    )
  }

  if (!extracted?.year || !isPlausibleYear(Number(extracted.year))) {
    await releaseClaim()
    return NextResponse.json(
      { error: "Couldn't find clear dates on that page — please verify manually" },
      { status: 422 },
    )
  }

  const year = Number(extracted.year)
  const data = {
    eventDate: parseDate(extracted.eventDate),
    registrationDeadline: parseDate(extracted.registrationDeadline),
    abstractDeadline: parseDate(extracted.abstractDeadline),
    venue: extracted.venue?.slice(0, 200) ?? null,
    status: 'estimated' as const,
  }

  // Publish under a COMPARE-AND-SET, not a read-then-write (P1-S10). The old
  // findFirst→update was last-writer-wins on a row every team in the state
  // reads, and its `confirmed` check was a stale pre-read. Predicating the
  // update on `status: 'estimated'` makes the database refuse to downgrade
  // curated data, whoever wins the race.
  const published = await db.fairEvent.updateMany({
    where: { fairId: fair.id, year, status: 'estimated' },
    data,
  })
  if (published.count === 0) {
    const created = await db.fairEvent
      .create({ data: { fairId: fair.id, year, ...data } })
      .catch(() => null)
    if (!created) {
      // Either a `confirmed` row already stands for this year, or another
      // crawler created one first. Curated data is never downgraded.
      await db.fair.updateMany({
        where: { id: fair.id, syncClaimedAt: claimStamp },
        data: { syncClaimedAt: null, lastSyncedAt: claimStamp, lastSyncedByUserId: ctx.dbUserId },
      })
      return NextResponse.json(
        { error: 'This year\'s dates are already confirmed and cannot be overwritten.' },
        { status: 409 },
      )
    }
  }

  const event = await db.fairEvent.findFirstOrThrow({ where: { fairId: fair.id, year } })

  // Release the claim and start the cooldown, with provenance for the shared row.
  await db.fair.updateMany({
    where: { id: fair.id, syncClaimedAt: claimStamp },
    data: { syncClaimedAt: null, lastSyncedAt: new Date(), lastSyncedByUserId: ctx.dbUserId },
  })

  return NextResponse.json({
    event: {
      year: event.year,
      eventDate: event.eventDate?.toISOString() ?? null,
      registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
      abstractDeadline: event.abstractDeadline?.toISOString() ?? null,
      venue: event.venue,
      status: 'estimated',
    },
  })
}

function parseDate(value?: string | null): Date | null {
  if (!value || value.trim() === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
