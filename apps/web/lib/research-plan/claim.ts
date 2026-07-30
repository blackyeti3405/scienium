import 'server-only'
import { db } from '@/lib/db'

/**
 * Pre-call claim for the two paid research-plan workflows (REFACTOR2 P1-S9).
 *
 * Same shape as `Team.advanceClaimedAt`, `QuizSession.retryGradeClaimedAt`, and
 * `FairEvent.syncClaimedAt`: stamp a column with a unique timestamp BEFORE the
 * provider call, conditional on the column being free or its TTL elapsed, and
 * release it if the work fails. Two of them on one table is where inlining the
 * pattern a sixth time stops paying for itself.
 *
 * The claim is not only about cost. Holding it is what makes a count taken
 * afterwards exact: with one run per team in flight, nothing else can be
 * counting the same day's rows at the same moment.
 */

/** A claim orphaned by a crash is reclaimable after this. */
export const PLAN_CLAIM_TTL_MS = 5 * 60_000

type PlanClaimField = 'reviewClaimedAt' | 'ideaCheckClaimedAt'

export interface PlanClaim {
  /** Hand the slot back so a failure does not hold the team for the full TTL. */
  release: () => Promise<void>
}

/**
 * Claim one paid plan workflow for `teamId`, or return `null` if another run
 * already holds it. The stamp is unique per claim, so `release` and any
 * compare-and-set can only ever match the claim they belong to.
 */
export async function claimPlanWork(
  teamId: string,
  field: PlanClaimField,
): Promise<PlanClaim | null> {
  const stamp = new Date()
  const stale = new Date(stamp.getTime() - PLAN_CLAIM_TTL_MS)
  const claimed = await db.researchPlan.updateMany({
    where: { teamId, OR: [{ [field]: null }, { [field]: { lt: stale } }] },
    data: { [field]: stamp },
  })
  if (claimed.count !== 1) return null
  return {
    release: () =>
      db.researchPlan
        .updateMany({ where: { teamId, [field]: stamp }, data: { [field]: null } })
        .then(() => undefined)
        .catch(() => undefined),
  }
}
