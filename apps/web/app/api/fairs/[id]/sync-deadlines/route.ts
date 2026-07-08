import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { Firecrawl } from 'firecrawl'
import { serverEnv } from '@/lib/env'

// Built lazily on first use (never at import) so a missing FIRECRAWL_API_KEY
// can't fail `next build`; validated by serverEnv when the route actually runs.
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
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Strict rate limit: each call triggers a paid Firecrawl job.
  const { error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const fair = await db.fair.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, websiteUrl: true },
  })
  if (!fair) return NextResponse.json({ error: 'Fair not found' }, { status: 404 })
  if (!fair.websiteUrl) {
    return NextResponse.json({ error: 'This fair has no website to read' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Pass both the homepage and a wildcard so Firecrawl can follow links to
  // /schedule, /dates, /registration pages where deadlines usually live.
  const base = fair.websiteUrl.replace(/\/$/, '')
  let extracted: ExtractedDates | null = null

  try {
    const res = await firecrawl().extract({
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
    })

    if (res.success && res.data) {
      extracted = res.data as ExtractedDates
    }
  } catch (err) {
    console.error('[sync-deadlines] Firecrawl extract failed:', err)
    return NextResponse.json(
      { error: "Could not read the fair's site — check it manually" },
      { status: 502 },
    )
  }

  if (!extracted?.year) {
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

  const existing = await db.fairEvent.findFirst({
    where: { fairId: fair.id, year },
    select: { id: true },
  })
  const event = existing
    ? await db.fairEvent.update({ where: { id: existing.id }, data })
    : await db.fairEvent.create({ data: { fairId: fair.id, year, ...data } })

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
