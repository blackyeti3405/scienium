import { differenceInCalendarDays, getISOWeek, getISOWeekYear } from 'date-fns'

/**
 * Pure notification computation (spec §13.7) — kept DB-free so the deadline-window
 * and smart-urgency rules have a unit-test surface and the cron just feeds it data.
 *
 * Two notification kinds:
 *   - `fair_deadline`: a reminder as a fair's registration / abstract / event date
 *     approaches, fired once per *bracket* (the configured 30/14/7/1-day windows).
 *   - `urgency`: a gentle nudge when a fair is near but the team's Project Log has
 *     gone stale, fired at most weekly.
 *
 * Every draft carries a deterministic `dedupeKey`; the unique column on
 * `notifications` makes the daily cron idempotent — a re-run (or a caught-up
 * missed run) never double-inserts the same reminder.
 */

export type NotificationKind = 'fair_deadline' | 'urgency'

export interface FairDeadlineInput {
  fairName: string
  fairId: string
  eventId: string
  eventDate: Date | null
  registrationDeadline: Date | null
  abstractDeadline: Date | null
}

export interface NotifyComputeInput {
  teamId: string
  now: Date
  /** Days-before-deadline windows (e.g. [30, 14, 7, 1]). */
  deadlineDays: number[]
  fairs: FairDeadlineInput[]
  /** Most recent progress Project Log timestamp, or null if the team has none. */
  lastProgressLogAt: Date | null
}

export interface NotificationDraft {
  teamId: string
  userId: string | null
  kind: NotificationKind
  title: string
  body: string
  linkUrl: string | null
  dedupeKey: string
}

/** Days a fair is allowed to be near while the log is stale before we nudge. */
const STALE_LOG_DAYS = 10

interface DeadlineField {
  key: 'registration' | 'abstract' | 'event'
  label: string
  date: Date | null
}

export function computeNotifications(input: NotifyComputeInput): NotificationDraft[] {
  const drafts: NotificationDraft[] = []
  const windowsAsc = [...new Set(input.deadlineDays)].filter((d) => d > 0).sort((a, b) => a - b)
  if (windowsAsc.length === 0) return drafts
  const maxWindow = windowsAsc[windowsAsc.length - 1]!

  for (const fair of input.fairs) {
    const fields: DeadlineField[] = [
      { key: 'registration', label: 'Registration', date: fair.registrationDeadline },
      { key: 'abstract', label: 'Abstract submission', date: fair.abstractDeadline },
      { key: 'event', label: 'Fair day', date: fair.eventDate },
    ]

    for (const field of fields) {
      if (!field.date) continue
      const daysUntil = differenceInCalendarDays(field.date, input.now)
      if (daysUntil < 0) continue // already passed
      // Fire once per bracket: the smallest configured window that still contains
      // daysUntil. As the date nears it moves into tighter brackets, one each.
      const bracket = windowsAsc.find((w) => daysUntil <= w)
      if (bracket === undefined) continue

      const when =
        daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
      drafts.push({
        teamId: input.teamId,
        userId: null,
        kind: 'fair_deadline',
        title: `${field.label}: ${fair.fairName}`,
        body: `${field.label} for ${fair.fairName} is ${when}.`,
        linkUrl: '/fair-hub/calendar',
        dedupeKey: `deadline:${input.teamId}:${fair.eventId}:${field.key}:${bracket}`,
      })
    }
  }

  // Smart urgency: the nearest upcoming fair date within the largest window, when
  // the Project Log has gone stale. At most one per fair per ISO week.
  const upcoming = input.fairs
    .map((f) => ({ fair: f, daysUntil: f.eventDate ? differenceInCalendarDays(f.eventDate, input.now) : Infinity }))
    .filter((e) => e.daysUntil >= 0 && e.daysUntil <= maxWindow)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0]

  if (upcoming) {
    const logStale =
      input.lastProgressLogAt === null ||
      differenceInCalendarDays(input.now, input.lastProgressLogAt) >= STALE_LOG_DAYS
    if (logStale) {
      const weekTag = `${getISOWeekYear(input.now)}-W${getISOWeek(input.now)}`
      const sinceText = input.lastProgressLogAt
        ? `your last project log was ${differenceInCalendarDays(input.now, input.lastProgressLogAt)} days ago`
        : `you haven't logged any project work yet`
      drafts.push({
        teamId: input.teamId,
        userId: null,
        kind: 'urgency',
        title: `${upcoming.fair.fairName} is ${upcoming.daysUntil} days away`,
        body: `${upcoming.fair.fairName} is in ${upcoming.daysUntil} days and ${sinceText}. A quick Project Log entry keeps your momentum going.`,
        linkUrl: '/daily/log',
        dedupeKey: `urgency:${input.teamId}:${upcoming.fair.eventId}:${weekTag}`,
      })
    }
  }

  return drafts
}
