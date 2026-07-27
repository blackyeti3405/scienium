import { NextRequest, NextResponse } from 'next/server'
import { assertCron } from '@/lib/cron/auth'
import { mapWithConcurrency } from '@/lib/concurrency'
import { loadFairIndex, matchFairRowsFromIndex, type FairIndex } from '@/lib/fairs/match'
import { computeNotifications, type FairDeadlineInput } from '@/lib/notifications/compute'
import { emailConfigured } from '@/lib/notifications/email'
import { deliverNotificationEmails } from '@/lib/notifications/outbox'
import { logEvent } from '@/lib/observability/log'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Team-level reminders use the default windows; per-user windows drive only email. */
const DEFAULT_DEADLINE_DAYS = [30, 14, 7, 1]

/** Teams fetched per query — bounds the working set instead of loading the roster at once. */
const TEAM_PAGE_SIZE = 100
/** Safety cap on teams handled in one invocation (~1/20 of the daily budget at
 *  the production schedule — see vercel.json). */
const MAX_TEAMS_PER_RUN = 1000
/** Teams processed concurrently. Modest: with PgBouncer (connection_limit=1) DB
 *  work serializes anyway — the win is overlapping the network-bound email
 *  sends of different teams. */
const TEAM_CONCURRENCY = 5
/** Soft deadline: stop cleanly (stoppedEarly) with time to respond, instead of
 *  the 60s serverless cap killing the run mid-team. */
const RUN_BUDGET_MS = 50_000
/** Run-ledger rows older than this many days are pruned each run. */
const RUN_LEDGER_KEEP_DAYS = 3
/** A claimed-but-unfinished team is a crashed run's after this, and is retaken. */
const TEAM_CLAIM_TTL_MS = 5 * 60_000
/** Outbox rows delivered per invocation — bounded like every other cron batch. */
const EMAIL_BATCH = 100

/**
 * GET /api/cron/notifications — deadline + smart-urgency reminder pass
 * (spec §13.7), redesigned for the 10,000-user / ~3,300-team target (A4).
 *
 * Durable coverage: every team CHECKED for the current UTC day gets a
 * `NotificationRunTeam` row — drafts produced or not — so continuation runs
 * skip finished teams from a durable ledger instead of inferring "done" from
 * notification side effects (which zero-draft teams never produce, so they
 * were re-checked forever). The cron fires many times a day (vercel.json:
 * every 15 minutes over a morning window); each invocation claims up to
 * MAX_TEAMS_PER_RUN unchecked teams and exits cheaply once the roster is
 * covered. 20 runs × 1,000 teams comfortably covers the target population in
 * ONE day, not one team-page per day.
 *
 * Bounded work per team: the fair table (a few hundred rows, with latest
 * events) is loaded ONCE per run and matched in memory; last-progress-log
 * timestamps are grouped per page. The per-team cost is the dedupe read +
 * insert for teams that actually produce drafts, and email sends. The old
 * per-team `matchFairs` + fairEvent + projectLog reads were the run's
 * dominant query fan-out.
 *
 * `notifications.dedupe_key` stays the durable idempotency backstop — re-runs
 * and overlapping runs never double-notify.
 */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const startedAt = Date.now()
  const outOfBudget = () => Date.now() - startedAt > RUN_BUDGET_MS

  const now = new Date()
  const runDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  /** Fences this run's claims; a team is only processed if its row carries this. */
  const claimToken = randomUUID()
  const staleClaimBefore = new Date(now.getTime() - TEAM_CLAIM_TTL_MS)

  // Teams already FINISHED today, or claimed by a run that is still within its
  // lease — the durable resume cursor (one indexed read). A claim older than the
  // lease with no completion belongs to a crashed run and is fair game again.
  const held = await db.notificationRunTeam.findMany({
    where: {
      runDay,
      OR: [{ completedAt: { not: null } }, { checkedAt: { gte: staleClaimBefore } }],
    },
    select: { teamId: true },
  })
  const checked = new Set(held.map((r) => r.teamId))

  // Prune old ledger days (working state, not history).
  const pruneBefore = new Date(runDay.getTime() - RUN_LEDGER_KEEP_DAYS * 24 * 60 * 60 * 1000)
  await db.notificationRunTeam.deleteMany({ where: { runDay: { lt: pruneBefore } } })

  // The fair index is shared by every team this run.
  const fairIndex = await loadFairIndex()

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

    const todo = page.filter((t) => {
      if (checked.has(t.id)) {
        skippedDone++
        return false
      }
      return true
    })

    // Bulk inputs for the page: one grouped read instead of one per team.
    const lastLogByTeam = new Map<string, Date>()
    if (todo.length > 0) {
      const lastLogs = await db.projectLog.groupBy({
        by: ['teamId'],
        where: { teamId: { in: todo.map((t) => t.id) }, entryType: 'progress' },
        _max: { createdAt: true },
      })
      for (const l of lastLogs) {
        if (l._max.createdAt) lastLogByTeam.set(l.teamId, l._max.createdAt)
      }
    }

    // CLAIM BEFORE WORK (P1-R5). The ledger row used to be written after
    // processing, so two overlapping runs both saw the same teams as unchecked
    // and both did the work — including the email. Claiming first means a team
    // is processed by whoever's token is on the row, and by nobody else.
    const owned = await claimTeams(runDay, todo, claimToken, staleClaimBefore)

    const completedIds: string[] = []
    const releasedIds: string[] = []
    await mapWithConcurrency(owned, TEAM_CONCURRENCY, async (team) => {
      // Cap/budget reached with a team still in hand — genuinely more work remains.
      if (processed >= MAX_TEAMS_PER_RUN || outOfBudget()) {
        stoppedEarly = true
        releasedIds.push(team.id)
        return
      }
      processed++
      try {
        created += await processTeam(team, fairIndex, lastLogByTeam.get(team.id) ?? null)
        completedIds.push(team.id)
      } catch (err) {
        failedTeams++
        releasedIds.push(team.id)
        console.error(`[cron/notifications] team ${team.id} failed:`, err)
      }
    })

    // Both writes are BATCHED per page, not per team: the run's query count has
    // to scale with pages, or 3,500 teams becomes 3,500 round trips inside a
    // 60-second function — the exact fan-out this cron was rebuilt to avoid.
    if (completedIds.length > 0) {
      // Conditional on still owning the claim.
      await db.notificationRunTeam.updateMany({
        where: { runDay, teamId: { in: completedIds }, claimToken },
        data: { completedAt: new Date() },
      })
    }
    if (releasedIds.length > 0) {
      // RELEASE rather than hold. A team we know we abandoned — failed, or
      // skipped at the budget — should be retried by the next run immediately,
      // not made to wait out a lease that exists for crashes we cannot see.
      await db.notificationRunTeam
        .updateMany({
          where: { runDay, teamId: { in: releasedIds }, claimToken, completedAt: null },
          data: { checkedAt: new Date(0) },
        })
        .catch(() => {})
    }

    if (stoppedEarly || page.length < TEAM_PAGE_SIZE) break // capped, or roster exhausted.
    cursor = page[page.length - 1].id
  }

  // Deliver whatever the outbox holds — this run's enqueues plus anything a
  // previous run enqueued and did not get to. Bounded, and never throws.
  const emailed = emailConfigured() ? await deliverNotificationEmails(EMAIL_BATCH) : 0

  if (stoppedEarly) {
    logEvent({
      event: 'cron.notifications.stopped_early',
      detail: `processed=${processed} cap=${MAX_TEAMS_PER_RUN} budgetMs=${RUN_BUDGET_MS}; the next scheduled run continues from the run ledger`,
    })
  }

  return NextResponse.json({ teams: processed, created, emailed, failedTeams, skippedDone, stoppedEarly })
}

type TeamRow = {
  id: string
  locationState: string | null
  locationLat: number | null
  locationLng: number | null
}

/**
 * Take ownership of as many of `teams` as this run can, and return only those.
 *
 * Two steps because the ledger row may or may not exist: `createMany` +
 * `skipDuplicates` wins the fresh ones, then a conditional `updateMany` takes
 * over rows abandoned by a crashed run (claimed, never completed, past the
 * lease). Both write THIS run's token, so the read that follows returns exactly
 * what we own — no counting, no inference.
 */
async function claimTeams(
  runDay: Date,
  teams: TeamRow[],
  claimToken: string,
  staleClaimBefore: Date,
): Promise<TeamRow[]> {
  if (teams.length === 0) return []
  const ids = teams.map((t) => t.id)

  await db.notificationRunTeam.createMany({
    data: ids.map((teamId) => ({ runDay, teamId, claimToken })),
    skipDuplicates: true,
  })
  await db.notificationRunTeam.updateMany({
    where: {
      runDay,
      teamId: { in: ids },
      completedAt: null,
      checkedAt: { lt: staleClaimBefore },
    },
    data: { claimToken, checkedAt: new Date() },
  })

  const mine = new Set(
    (
      await db.notificationRunTeam.findMany({
        where: { runDay, teamId: { in: ids }, claimToken },
        select: { teamId: true },
      })
    ).map((r) => r.teamId),
  )
  return teams.filter((t) => mine.has(t.id))
}

async function processTeam(
  team: TeamRow,
  fairIndex: FairIndex,
  lastProgressLogAt: Date | null,
): Promise<number> {
  const coords: [number, number] | null =
    team.locationLat != null && team.locationLng != null
      ? [team.locationLat, team.locationLng]
      : null

  const match = matchFairRowsFromIndex(fairIndex, team.locationState, coords)
  const fairs: FairDeadlineInput[] = [match.regional, match.stateFair, match.isef]
    .filter((f): f is NonNullable<typeof f> => !!f)
    .flatMap((f) => {
      const e = f.events[0] // latest event rides on the index (year desc, take 1)
      if (!e) return []
      return [
        {
          fairName: f.name,
          fairId: f.id,
          eventId: e.id,
          eventDate: e.eventDate,
          registrationDeadline: e.registrationDeadline,
          abstractDeadline: e.abstractDeadline,
        },
      ]
    })
  if (fairs.length === 0) return 0

  const drafts = computeNotifications({
    teamId: team.id,
    now: new Date(),
    deadlineDays: DEFAULT_DEADLINE_DAYS,
    fairs,
    lastProgressLogAt,
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

  const recipients = emailConfigured() ? await teamEmailRecipients(team.id) : []

  // Notification rows and their outbox entries commit TOGETHER (P1-R5). Enqueued,
  // not sent: delivery is a separate claimed pass, and `(dedupeKey, recipient)`
  // unique means a duplicated run cannot produce a duplicated email even if it
  // gets this far.
  await db.$transaction(async (tx) => {
    await tx.notification.createMany({ data: fresh, skipDuplicates: true })
    if (recipients.length > 0) {
      await tx.notificationEmail.createMany({
        data: fresh.flatMap((n) =>
          recipients.map((recipient) => ({
            dedupeKey: n.dedupeKey,
            recipient,
            subject: n.title,
            body: n.body,
          })),
        ),
        skipDuplicates: true,
      })
    }
  })

  return fresh.length
}

/** Opted-in email addresses for the team's members. */
async function teamEmailRecipients(teamId: string): Promise<string[]> {
  const prefs = await db.notificationPref.findMany({
    where: { emailEnabled: true, user: { teamMemberships: { some: { teamId } } } },
    select: { email: true, user: { select: { email: true } } },
  })
  return prefs.map((p) => p.email ?? p.user.email).filter((e): e is string => !!e)
}
