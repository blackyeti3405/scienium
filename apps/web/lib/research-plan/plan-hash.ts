import 'server-only'
import { createHash } from 'crypto'

/**
 * The identity of the plan an AI result was produced from (REFACTOR2 P2-S7).
 *
 * `review-service.ts` already stamped this hash inside `lastReviewJson` and used
 * it as an unchanged-plan cache key (PERF-7). The same value answers a second
 * question the register raised: once a review has legitimately committed and the
 * student then saves NEW text, nothing marked the stored review as out of date —
 * GET handed it back beside the new text and it read as current. Comparing the
 * stored hash to the live one is that marker, and it needs no new column and no
 * second convention.
 *
 * The formula is byte-for-byte what `review-service.ts` used, so every review
 * already persisted keeps replaying from cache rather than silently re-paying.
 *
 * ponytail: the idea check's own input is the text alone, so re-picking a
 * project type marks its verdict stale when strictly it need not. One hash,
 * erring toward "check this again" — split it only if that nag proves annoying.
 */
export function planHashOf(plan: {
  projectType: string | null
  projectSubtype: string | null
  lastSyncedText: string | null
}): string {
  return createHash('sha256')
    .update(
      `${plan.projectType}\n${plan.projectSubtype}\n${(plan.lastSyncedText ?? '').slice(0, 80000)}`,
    )
    .digest('hex')
}

/**
 * Was this stored AI result produced from the plan as it stands now?
 *
 * A result with no hash at all is a legacy row (written before the stamp
 * existed). Those are reported NOT stale: we cannot prove they are outdated,
 * and flagging every historical review as suspect on the strength of a missing
 * field would be a lie in the other direction.
 */
export function isResultStale(result: unknown, currentHash: string): boolean {
  if (!result || typeof result !== 'object') return false
  const stamped = (result as { planHash?: unknown }).planHash
  return typeof stamped === 'string' && stamped !== currentHash
}
