/**
 * Pure economy arithmetic — the KP / Clearance / purchase decisions that used to
 * live inline in the grade and buildings routes.
 *
 * Pulling these out gives the highest-stakes rules (the ones that mint currency)
 * a unit-test surface with **no DB**, and keeps the route handlers thin. Each
 * function is a faithful extraction: it returns exactly the values the routes
 * previously computed inline, so behaviour is unchanged — the tests pin that.
 *
 * The *atomicity* of applying these decisions still belongs to the database
 * (conditional `updateMany` debits, unique constraints, `lt` guards); these
 * helpers only compute the numbers that go into those transactions.
 */

/** Clamp any model-returned score into a 0–100 integer (NaN → 0). */
export function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ─── Quiz proficiency (per-student KP high-water) ─────────────────────────────

export interface QuizAwardInput {
  passed: boolean
  /** Aggregate quiz score, already a 0–100 integer. */
  aggregate: number
  /** This student's prior `kpAwarded` high-water for the paper (0 if none). */
  priorKp: number
  /** This student's prior `bestScore` for the paper (0 if none). */
  priorBest: number
}

export interface QuizAward {
  /** KP to credit the team now — only the improvement over the prior high-water. */
  kpEarned: number
  /** New `bestScore` high-water to persist (never below prior). */
  newBestScore: number
  /** New `kpAwarded` high-water to persist (never below prior, capped at the max). */
  newKpAwarded: number
}

/**
 * Most KP one source can ever grant one student. Was 100 — literally the quiz
 * score used as a KP amount — which made reading a paper worth a fifth of the
 * cheapest building. Reading sources is the core loop, so it is now the loop
 * that funds the lab.
 */
export const KP_PER_SOURCE_MAX = 500

/** A quiz aggregate (0–100) as KP. Kept proportional so score still IS the reward. */
export function sourceKp(aggregate: number): number {
  return Math.round(clampScore(aggregate) * (KP_PER_SOURCE_MAX / 100))
}

/**
 * A source grants each student at most `KP_PER_SOURCE_MAX` KP — scaled from their
 * best passing quiz score — and only ever tops up by the improvement over their
 * own prior high-water. A failing quiz, or a passing retake that doesn't beat the
 * prior best, grants nothing.
 *
 *   kpEarned     = passed ? max(0, sourceKp(aggregate) - priorKp) : 0
 *   newKpAwarded = max(priorKp, sourceKp(aggregate))
 *   newBestScore = max(priorBest, aggregate)
 *
 * `priorKp` is a KP high-water (0–500), `priorBest`/`aggregate` are 0–100 scores —
 * the two live in different units on purpose, so raising the ceiling never
 * rescales a stored score.
 */
export function computeQuizAward({ passed, aggregate, priorKp, priorBest }: QuizAwardInput): QuizAward {
  if (!passed) {
    return { kpEarned: 0, newBestScore: priorBest, newKpAwarded: priorKp }
  }
  const earned = sourceKp(aggregate)
  return {
    kpEarned: Math.max(0, earned - priorKp),
    newBestScore: Math.max(priorBest, aggregate),
    newKpAwarded: Math.max(priorKp, earned),
  }
}

// ─── Quiz retry aggregate (targeted re-answer loop) ──────────────────────────

export interface RetryAggregateInput {
  /** Latest score for every question in the CURRENT full set (carried-forward
   *  passed scores + freshly-graded failed/new scores). */
  scores: number[]
  /** Aggregate score (0-100) required to demonstrate proficiency. */
  threshold: number
  /** Flat ceiling applied to a retried aggregate — see `RETRY_SCORE_CAP`. */
  cap: number
}

export interface RetryAggregate {
  aggregate: number
  passed: boolean
}

/**
 * Aggregate/pass semantics for a retry: the mean of every current question's
 * latest score (clamped 0–100), then flat-capped at `cap`. The cap is the
 * anti-gaming guard — once any retry has occurred, the best reachable score is
 * strictly below a clean first-try 100, so there is never an incentive to
 * intentionally miss questions in order to retry them. `passed` uses the same
 * `>= threshold` rule as a first attempt.
 */
export function computeRetryAggregate({ scores, threshold, cap }: RetryAggregateInput): RetryAggregate {
  const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + clampScore(s), 0) / scores.length : 0
  const aggregate = Math.min(cap, Math.round(mean))
  return { aggregate, passed: aggregate >= threshold }
}

// ─── Clearance (team mastery high-water) ──────────────────────────────────────

export interface ClearanceRaiseInput {
  passed: boolean
  /** The level this exam grants on a pass. */
  targetLevel: number
  /** The team's current clearance level. */
  currentLevel: number
  /** Bonus KP for first reaching `targetLevel`. */
  levelKpBonus: number
}

export interface ClearanceRaise {
  /** Whether this pass actually lifts the team's clearance (high-water). */
  raised: boolean
  /** KP bonus to grant (0 unless this pass raises clearance). */
  kpBonus: number
}

/**
 * A clearance raise is a high-water mark: a pass only advances clearance when its
 * target exceeds the team's current level (so a teammate who already lifted it
 * past this exam's target since it began yields no further bonus). Mirrors the
 * prior inline logic in expertise/grade exactly.
 */
export function computeClearanceRaise({ passed, targetLevel, currentLevel, levelKpBonus }: ClearanceRaiseInput): ClearanceRaise {
  const raised = passed && targetLevel > currentLevel
  return { raised, kpBonus: raised ? levelKpBonus : 0 }
}

// ─── Anti-inflation guard for AI-graded gains ─────────────────────────────────

/**
 * Defence-in-depth against prompt-injection of the grader (V1): cap how much a
 * single AI-graded attempt may *raise* a student's high-water in one shot. The
 * grading model is fed attacker-controllable text (uploaded paper / project
 * notes) as ground truth, so an injected "award full marks" could spike a score.
 * Legitimate gains are gradual; this clamps an implausible jump without affecting
 * normal play.
 *
 * Returns the aggregate unchanged when the jump is within `maxGain`, otherwise
 * `priorBest + maxGain`. With `maxGain = 100` (the default) it is a no-op, so it
 * can be wired in inert and tightened via config without code changes.
 */
export function clampScoreGain(aggregate: number, priorBest: number, maxGain = 100): number {
  const ceiling = Math.min(100, priorBest + Math.max(0, maxGain))
  return Math.min(aggregate, ceiling)
}

// ─── Building upgrade cost (KP always; LC only at tier-up levels) ────────────

/** Max upgrade level for a placed economy building. */
export const MAX_BUILDING_LEVEL = 15

/**
 * Slope of the per-level upgrade price, as a fraction of the building's base cost.
 *
 * Was 0.25, which summed to `baseCost × 26.25` to take one building from L1 to
 * L15 — maxing a single premium building cost 472,500 KP, more than a class could
 * earn in a term, so in practice nothing was ever levelled. At 0.06 the same
 * journey is `baseCost × 6.3`: a real long-term goal instead of a fictional one.
 * THE upgrade knob — tune here, nowhere else.
 */
export const UPGRADE_COST_SLOPE = 0.06

/**
 * KP cost to raise a building TO `toLevel` (it starts at level 1):
 *   round(baseCost × UPGRADE_COST_SLOPE × (toLevel − 1))
 * so premium buildings still cost proportionally more to level up. Caller
 * validates the building is below MAX_BUILDING_LEVEL before charging.
 */
export function upgradeKpCost(baseCost: number, toLevel: number): number {
  return Math.round(baseCost * UPGRADE_COST_SLOPE * (toLevel - 1))
}

/**
 * Lab-Credit cost to raise a building TO `toLevel`. LC is charged ONLY on the four
 * tier-up transitions (3→4, 6→7, 9→10, 14→15); every other upgrade costs 0 LC.
 * Total to fully max one building = 2+4+6+10 = 22 LC.
 */
const LC_TIER_COST: Record<number, number> = { 4: 2, 7: 4, 10: 6, 15: 10 }
export function upgradeLcCost(toLevel: number): number {
  return LC_TIER_COST[toLevel] ?? 0
}

// ─── Building sell refund ─────────────────────────────────────────────────────

/** Fraction of the KP paid that a sold building refunds (the rest is the sink). */
export const SELL_REFUND_RATE = 0.9

/**
 * KP refunded when an economy building is sold — 90% of what the team paid for it
 * (`costPaid`), floored to a whole KP. Selling at a loss is the deliberate sink;
 * gateways are never sellable (enforced at the route, not here).
 */
export function sellRefund(costPaid: number): number {
  return Math.floor(Math.max(0, costPaid) * SELL_REFUND_RATE)
}

// ─── Team-size cost multiplier ────────────────────────────────────────────────

/**
 * Team-size cost multiplier (Feature 1c) — bigger labs pay proportionally more.
 * The one formula three places computed independently (`lib/shop-server.ts`'s
 * authoritative `ShopState.multiplier`, `ShopPanel`'s displayed price, and the
 * plot hook's optimistic prediction before the real cost comes back). Centralized
 * so a future tuning change can't drift between what a student is shown, what
 * they're optimistically charged, and what the server actually charges.
 */
export function teamCostMultiplier(memberCount: number): number {
  return Math.max(1, memberCount)
}

// ─── Building purchase pre-check ──────────────────────────────────────────────

export interface ShopStateLike {
  owned: string[]
  kp: number
  clearanceLevel: number
  /** team-size cost multiplier (>= 1). */
  multiplier: number
  /** The team's assigned lab type (null until classified). */
  labType?: string | null
}

export interface ShopBuildingLike {
  key: string
  cost: number
  minClearance: number
  /** If set, only teams of this lab type may buy this building. */
  labType?: string | null
}

export type PurchaseCheck =
  | { ok: true; cost: number }
  | { ok: false; cost: number; status: number; error: string }

/**
 * The purchase pre-check — owned/clearance/affordability — exactly as it ran
 * inline in buildings POST, returned as data so the route stays declarative.
 * The actual debit remains an atomic conditional `updateMany` in the DB; this is
 * the fast rejection path that also computes the team-size-adjusted cost.
 */
export function evaluatePurchase(state: ShopStateLike, building: ShopBuildingLike): PurchaseCheck {
  const cost = building.cost * state.multiplier
  if (building.labType && building.labType !== state.labType) {
    return { ok: false, cost, status: 403, error: "This building isn't available to your lab type." }
  }
  if (state.owned.includes(building.key)) {
    return { ok: false, cost, status: 409, error: 'Your lab already owns this building.' }
  }
  if (state.clearanceLevel < building.minClearance) {
    return { ok: false, cost, status: 403, error: `Requires Clearance Level ${building.minClearance}.` }
  }
  if (state.kp < cost) {
    return { ok: false, cost, status: 402, error: 'Not enough Knowledge Points.' }
  }
  return { ok: true, cost }
}
