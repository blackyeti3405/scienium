import 'server-only'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/observability/log'

/**
 * Age-based retention (REFACTOR2 P1-R9).
 *
 * Two halves, deliberately separated:
 *
 *  - This REGISTRY declares which models may be pruned and how — the mechanism,
 *    which is a code decision.
 *  - `retention_policies` holds the NUMBER of days — the policy, which is a
 *    FERPA/COPPA decision this project cannot make on its own. That table ships
 *    EMPTY (docs/TODO.md → "Retention windows").
 *
 * The fail-safe direction is KEEP: a model with no registry default and no
 * policy row is never touched. Turning one on later is an `INSERT`, not a
 * project — which is the whole point of building the mechanism now.
 *
 * Exactly one default is set today, because exactly one was endorsed:
 * `showcase_view`. Those rows are pseudonymous visitor fingerprints that grow
 * without bound and serve no product purpose past the daily-count aggregate they
 * already fed. The 90 is still flagged in `docs/TODO.md` as a number to confirm.
 */

export interface PrunableModel {
  /** Policy key — the `retention_policies` primary key. */
  key: string
  /** What a row is, for the operator reading the TODO table. */
  label: string
  /**
   * Days to keep when no policy row exists. `null` means UNREVIEWED: nothing is
   * pruned until somebody qualified writes a number into the table.
   */
  defaultRetainDays: number | null
  /** Delete at most `limit` rows older than `cutoff`. Returns how many went. */
  prune(cutoff: Date, limit: number): Promise<number>
}

/**
 * Bounded delete. Prisma's `deleteMany` has no `take`, so the ids are selected
 * first — one page per run, the same rule as every other cron loop here. A
 * backlog drains over several runs instead of one statement locking a table.
 */
async function pruneOlderThan(
  model: {
    findMany(a: { where: object; select: { id: true }; take: number }): Promise<{ id: string }[]>
    deleteMany(a: { where: { id: { in: string[] } } }): Promise<{ count: number }>
  },
  column: string,
  cutoff: Date,
  limit: number,
): Promise<number> {
  const doomed = await model.findMany({
    where: { [column]: { lt: cutoff } },
    select: { id: true },
    take: limit,
  })
  if (doomed.length === 0) return 0
  const { count } = await model.deleteMany({ where: { id: { in: doomed.map((r) => r.id) } } })
  return count
}

export const PRUNABLE_MODELS: PrunableModel[] = [
  {
    key: 'showcase_view',
    label: 'Showcase visitor fingerprints (pseudonymous, unbounded growth)',
    defaultRetainDays: 90,
    prune: (cutoff, limit) => pruneOlderThan(db.showcaseView, 'viewedAt', cutoff, limit),
  },
  {
    key: 'activity_feed',
    label: 'Per-student activity feed entries',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.activityFeed, 'createdAt', cutoff, limit),
  },
  {
    key: 'notification',
    label: 'In-app notifications',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.notification, 'createdAt', cutoff, limit),
  },
  {
    key: 'notification_email',
    label: 'Delivered email outbox rows (recipient address + subject)',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.notificationEmail, 'createdAt', cutoff, limit),
  },
  {
    key: 'paper_chat_message',
    label: 'Vega paper-chat transcripts (student-written text)',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.paperChatMessage, 'createdAt', cutoff, limit),
  },
  {
    key: 'vega_study_message',
    label: 'Study-with-Vega transcripts (student-written text)',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.vegaStudyMessage, 'createdAt', cutoff, limit),
  },
  {
    key: 'ai_operation',
    label: 'AI replay ledger (provider results, cached verbatim)',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.aiOperation, 'createdAt', cutoff, limit),
  },
  {
    key: 'ai_usage',
    label: 'AI spend accounting (token counts, no content)',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.aiUsage, 'createdAt', cutoff, limit),
  },
  {
    key: 'teacher_feedback',
    label: 'Teacher feedback on student work',
    defaultRetainDays: null,
    prune: (cutoff, limit) => pruneOlderThan(db.teacherFeedback, 'createdAt', cutoff, limit),
  },
]

/**
 * The effective window for each model: a policy row overrides the registry
 * default, INCLUDING overriding it to null. "Reviewed, decided not to prune" has
 * to be expressible, or the table cannot record a decision to keep.
 */
export async function effectiveRetention(): Promise<Map<string, number | null>> {
  const rows = await db.retentionPolicy.findMany({ select: { key: true, retainDays: true } })
  const byKey = new Map(rows.map((r) => [r.key, r.retainDays]))
  return new Map(
    PRUNABLE_MODELS.map((m) => [m.key, byKey.has(m.key) ? byKey.get(m.key)! : m.defaultRetainDays]),
  )
}

/**
 * Prune every model that has a window. Returns per-key counts.
 *
 * Never throws: it shares a cron invocation with the data-request worker, and
 * one model's failure must not stop the rest.
 */
export async function runRetentionPrune(limitPerModel: number): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  let windows: Map<string, number | null>
  try {
    windows = await effectiveRetention()
  } catch (err) {
    logEvent({
      event: 'retention.window_read_failed',
      outcome: 'error',
      detail: err instanceof Error ? err.constructor.name : 'unknown',
    })
    return out
  }

  const now = Date.now()
  for (const model of PRUNABLE_MODELS) {
    const days = windows.get(model.key)
    // Null (unreviewed or explicitly parked) and non-positive both mean keep.
    if (days == null || days <= 0) continue
    try {
      out[model.key] = await model.prune(new Date(now - days * 86_400_000), limitPerModel)
    } catch (err) {
      logEvent({
        event: 'retention.prune_failed',
        outcome: 'error',
        detail: `key=${model.key} ${err instanceof Error ? err.constructor.name : 'unknown'}`,
      })
    }
  }
  return out
}
