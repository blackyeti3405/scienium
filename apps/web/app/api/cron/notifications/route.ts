import { NextRequest, NextResponse } from 'next/server'
import { assertCron } from '@/lib/cron/auth'
import { matchFairs } from '@/lib/fairs/match'
import { computeNotifications, type FairDeadlineInput, type NotificationDraft } from '@/lib/notifications/compute'
import { emailConfigured, sendNotificationEmail } from '@/lib/notifications/email'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Team-level reminders use the default windows; per-user windows drive only email. */
const DEFAULT_DEADLINE_DAYS = [30, 14, 7, 1]

/** Teams fetched per query — bounds the working set instead of loading the roster at once. */
const TEAM_PAGE_SIZE = 100
/** Safety cap on teams handled in one invocation (well above pilot scale). */
const MAX_TEAMS_PER_RUN = 1000
/** Teams processed concurrently. Modest: with PgBouncer (connection_limit=1) DB
 *  work serializes anyway — the win is overlapping fair-match/log reads with the
 *  network-bound email sends of other teams. */
const TEAM_CONCURRENCY = 5
/** Email sends in flight at once within one team's batch. */
const EMAIL_CONCURRENCY = 5
/** Soft deadline: stop cleanly (stoppedEarly) with time to respond, instead of
 *  the 60s serverless cap killing the run mid-team. */
const RUN_BUDGET_MS = 50_000

/**
 * GET /api/cron/notifications — daily deadline + smart-urgency reminder pass
 * (spec §13.7). For every team with a location it matches the team's regional /
 * state / ISEF fairs, computes which reminders are due, and inserts them. The
 * `notifications.dedupe_key` unique column makes this idempotent — re-runs and
 * caught-up missed runs never double-notify. Each team is isolated so one
 * team's failure can't abort the batch.
 *
 * Teams are streamed in id-ordered pages and processed with bounded concurrency
 * (PERF-5), so the memory and per-query cost stay flat as the roster grows while
 * a page no longer takes teams × (match + emails) serially.
 *
 * Progress cursor across runs (PERF-5): there is no cron-state model, so resume
 * is derived from the data itself — deterministic id-asc ordering plus a skip of
 * every team that already received a cron notification today. Within one
 * calendar day the computed drafts are deterministic (brackets come from
 * calendar-day diffs; urgency is keyed per ISO week), so "notified today" ⇒
 * "done for today". If a run dies partway, the next run skips the finished
 * teams cheaply and picks up the tail instead of perpetually re-starting from
 * the same teams. Teams that produced zero drafts are re-checked on a re-run —
 * that costs a couple of reads, writes nothing, and emails nobody (dedupeKey
 * stays the durable backstop).
 */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const startedAt = Date.now()
  const outOfBudget = () => Date.now() - startedAt > RUN_BUDGET_MS

  // Teams already handled today (see doc comment) — the resume "cursor".
  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)
  const alreadyNotified = new Set(
    (
      await db.notification.findMany({
        where: { kind: { in: ['fair_deadline', 'urgency'] }, createdAt: { gte: todayUtc } },
        select: { teamId: true },
        distinct: ['teamId'],
      })
    ).map((n) => n.teamId),
  )

  let created = 0
  let failedTeams = 0
  let processed = 0
  let skippedDone = 0
  let cursor: string | null = null
  let stoppedEarly = false

  while (true) {
    const page: TeamRow[] = await db.team.findMany({
      where: { locationState: { not: null }, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: { id: true, locationState: true, locationLat: true, locationLng: true },
      orderBy: { id: 'asc' },
      take: TEAM_PAGE_SIZE,
    })
    if (page.length === 0) break

    await mapWithConcurrency(page, TEAM_CONCURRENCY, async (team) => {
      if (alreadyNotified.has(team.id)) {
        skippedDone++
        return
      }
      // Cap/budget reached with a team still in hand — genuinely more work remains.
      if (processed >= MAX_TEAMS_PER_RUN || outOfBudget()) {
        stoppedEarly = true
        return
      }
      processed++
      try {
        created += await processTeam(team)
      } catch (err) {
        failedTeams++
        console.error(`[cron/notifications] team ${team.id} failed:`, err)
      }
    })

    if (stoppedEarly || page.length < TEAM_PAGE_SIZE) break // capped, or roster exhausted.
    cursor = page[page.length - 1].id
  }

  if (stoppedEarly) {
    console.warn(
      `[cron/notifications] stopped early (cap ${MAX_TEAMS_PER_RUN} teams / budget ${RUN_BUDGET_MS}ms); the next run resumes past the already-notified teams`,
    )
  }

  return NextResponse.json({ teams: processed, created, failedTeams, skippedDone, stoppedEarly })
}

type TeamRow = {
  id: string
  locationState: string | null
  locationLat: number | null
  locationLng: number | null
}

/**
 * Hand-rolled bounded-concurrency mapper (no p-limit dependency): runs `fn`
 * over `items` with at most `limit` in flight, preserving result order.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

async function processTeam(team: TeamRow): Promise<number> {
  const coords: [number, number] | null =
    team.locationLat != null && team.locationLng != null
      ? [team.locationLat, team.locationLng]
      : null

  const match = await matchFairs(team.locationState, coords)
  const fairIds = [match.regional?.id, match.stateFair?.id, match.isef?.id].filter(
    (x): x is string => !!x,
  )
  if (fairIds.length === 0) return 0

  // Latest event per matched fair (deadlines live on the most recent year).
  const events = await db.fairEvent.findMany({
    where: { fairId: { in: fairIds } },
    orderBy: [{ fairId: 'asc' }, { year: 'desc' }],
    include: { fair: { select: { name: true } } },
  })
  const latestByFair = new Map<string, (typeof events)[number]>()
  for (const e of events) if (!latestByFair.has(e.fairId)) latestByFair.set(e.fairId, e)

  const fairs: FairDeadlineInput[] = [...latestByFair.values()].map((e) => ({
    fairName: e.fair.name,
    fairId: e.fairId,
    eventId: e.id,
    eventDate: e.eventDate,
    registrationDeadline: e.registrationDeadline,
    abstractDeadline: e.abstractDeadline,
  }))

  const lastLog = await db.projectLog.findFirst({
    where: { teamId: team.id, entryType: 'progress' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const drafts = computeNotifications({
    teamId: team.id,
    now: new Date(),
    deadlineDays: DEFAULT_DEADLINE_DAYS,
    fairs,
    lastProgressLogAt: lastLog?.createdAt ?? null,
  })
  if (drafts.length === 0) return 0

  // Batched, idempotent insert (PERF-5): one read of the dedupe keys already
  // present, one createMany for the rest — the rest are the NEW reminders to
  // email. `skipDuplicates` keeps a concurrent run from double-inserting; the
  // tiny check-then-create window means overlapping runs could at worst re-email
  // one reminder, never duplicate a notification row.
  const existing = await db.notification.findMany({
    where: { dedupeKey: { in: drafts.map((d) => d.dedupeKey) } },
    select: { dedupeKey: true },
  })
  const existingKeys = new Set(existing.map((e) => e.dedupeKey))
  const fresh = drafts.filter((d) => !existingKeys.has(d.dedupeKey))
  if (fresh.length === 0) return 0
  await db.notification.createMany({ data: fresh, skipDuplicates: true })

  if (emailConfigured()) {
    await emailFreshNotifications(team.id, fresh)
  }
  return fresh.length
}

/** Email opted-in members of the team for each fresh notification. Best-effort;
 *  sends run with bounded concurrency (`sendNotificationEmail` never throws). */
async function emailFreshNotifications(teamId: string, fresh: NotificationDraft[]) {
  const prefs = await db.notificationPref.findMany({
    where: { emailEnabled: true, user: { teamMemberships: { some: { teamId } } } },
    select: { email: true, user: { select: { email: true } } },
  })
  const recipients = prefs.map((p) => p.email ?? p.user.email).filter((e): e is string => !!e)
  if (recipients.length === 0) return

  const sends = fresh.flatMap((n) =>
    recipients.map((to) => ({ to, subject: n.title, body: n.body })),
  )
  await mapWithConcurrency(sends, EMAIL_CONCURRENCY, (s) => sendNotificationEmail(s))
}
