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

/**
 * GET /api/cron/notifications — daily deadline + smart-urgency reminder pass
 * (spec §13.7). For every team with a location it matches the team's regional /
 * state / ISEF fairs, computes which reminders are due, and inserts them. The
 * `notifications.dedupe_key` unique column makes this idempotent — re-runs and
 * caught-up missed runs never double-notify. Each team is isolated so one
 * team's failure can't abort the batch.
 *
 * Teams are streamed in id-ordered pages rather than loaded all at once, so the
 * memory and per-query cost stay flat as the roster grows. A per-run cap bounds a
 * single invocation; if it's ever hit, `stoppedEarly` in the response makes the
 * truncation visible instead of silently skipping teams.
 */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  let created = 0
  let failedTeams = 0
  let processed = 0
  let cursor: string | null = null
  let stoppedEarly = false

  pages: while (true) {
    const page: TeamRow[] = await db.team.findMany({
      where: { locationState: { not: null }, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: { id: true, locationState: true, locationLat: true, locationLng: true },
      orderBy: { id: 'asc' },
      take: TEAM_PAGE_SIZE,
    })
    if (page.length === 0) break

    for (const team of page) {
      // Cap reached with a team still in hand — genuinely more work remains.
      if (processed >= MAX_TEAMS_PER_RUN) {
        stoppedEarly = true
        break pages
      }
      processed++
      try {
        created += await processTeam(team)
      } catch (err) {
        failedTeams++
        console.error(`[cron/notifications] team ${team.id} failed:`, err)
      }
    }

    if (page.length < TEAM_PAGE_SIZE) break // last page — roster exhausted.
    cursor = page[page.length - 1].id
  }

  if (stoppedEarly) {
    console.warn(`[cron/notifications] hit per-run cap of ${MAX_TEAMS_PER_RUN} teams; more remain`)
  }

  return NextResponse.json({ teams: processed, created, failedTeams, stoppedEarly })
}

type TeamRow = {
  id: string
  locationState: string | null
  locationLat: number | null
  locationLng: number | null
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

  // Insert one at a time so we know which are NEW (createMany+skipDuplicates would
  // hide that) and can email only the fresh ones.
  const fresh: NotificationDraft[] = []
  for (const draft of drafts) {
    try {
      await db.notification.create({ data: draft })
      fresh.push(draft)
    } catch (err) {
      // P2002 = already sent this exact reminder (idempotent skip).
      if (!(typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002')) {
        throw err
      }
    }
  }

  if (fresh.length > 0 && emailConfigured()) {
    await emailFreshNotifications(team.id, fresh)
  }
  return fresh.length
}

/** Email opted-in members of the team for each fresh notification. Best-effort. */
async function emailFreshNotifications(teamId: string, fresh: NotificationDraft[]) {
  const prefs = await db.notificationPref.findMany({
    where: { emailEnabled: true, user: { teamMemberships: { some: { teamId } } } },
    select: { email: true, user: { select: { email: true } } },
  })
  const recipients = prefs.map((p) => p.email ?? p.user.email).filter((e): e is string => !!e)
  if (recipients.length === 0) return

  for (const n of fresh) {
    for (const to of recipients) {
      await sendNotificationEmail({ to, subject: n.title, body: n.body })
    }
  }
}
