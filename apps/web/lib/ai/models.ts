import 'server-only'

/**
 * The one place that says which model runs which paid call, and what it costs
 * (REFACTOR2 P1-R3, budget half).
 *
 * Before this, the model was a hardcoded string literal in sixteen separate
 * files. Nothing could be measured or changed without touching all of them, so
 * "should this call be on a cheaper model?" was unanswerable in practice — the
 * single biggest lever on spend was the one that took sixteen edits to pull.
 *
 * This module is a pure refactor of that: **every operation keeps exactly the
 * model it had.** Moving work down the ladder is a separate, measured change —
 * see `docs/TODO.md` → "AI cost review".
 */

/** Every paid provider call in the app. Add a member here, not a literal at a call site. */
export type AiOperationName =
  // ── Haiku tier: extraction and classification over supplied text ──────────
  | 'paper_metadata'
  | 'paper_relevance'
  | 'phase_advance_classify'
  | 'study_plan_tracks'
  // ── Sonnet tier: generation, grading, and conversation ────────────────────
  | 'quiz_generate'
  | 'quiz_grade'
  | 'quiz_retry_generate'
  | 'quiz_retry_grade'
  | 'explain_grade'
  | 'paper_chat'
  | 'synthesis_check'
  | 'expertise_generate'
  | 'expertise_grade'
  | 'vocab_curate'
  | 'failure_followup'
  | 'research_plan_review'
  | 'idea_check'
  | 'vega_study'

export type AiModelId = 'claude-sonnet-5' | 'claude-haiku-4-5-20251001'

/**
 * Operation → model. Changing a line here changes one call's model, and the
 * `AiUsage` rows show what it cost before and after.
 */
export const AI_MODELS: Record<AiOperationName, AiModelId> = {
  paper_metadata: 'claude-haiku-4-5-20251001',
  paper_relevance: 'claude-haiku-4-5-20251001',
  phase_advance_classify: 'claude-haiku-4-5-20251001',
  study_plan_tracks: 'claude-haiku-4-5-20251001',

  quiz_generate: 'claude-sonnet-5',
  quiz_grade: 'claude-sonnet-5',
  quiz_retry_generate: 'claude-sonnet-5',
  quiz_retry_grade: 'claude-sonnet-5',
  explain_grade: 'claude-sonnet-5',
  paper_chat: 'claude-sonnet-5',
  synthesis_check: 'claude-sonnet-5',
  expertise_generate: 'claude-sonnet-5',
  expertise_grade: 'claude-sonnet-5',
  vocab_curate: 'claude-sonnet-5',
  failure_followup: 'claude-sonnet-5',
  research_plan_review: 'claude-sonnet-5',
  idea_check: 'claude-sonnet-5',
  vega_study: 'claude-sonnet-5',
}

export function modelFor(operation: AiOperationName): AiModelId {
  return AI_MODELS[operation]
}

/**
 * Published list prices in **micro-dollars per 1,000 tokens** ($1 = 1,000,000 µ$).
 *
 * Per-1,000 rather than per-token so every arithmetic step stays an integer even
 * for cached tokens, which bill at a tenth of the base rate. Money in floats is a
 * rounding bug waiting to happen in a running total.
 *
 * `AI_RATE_VERSION` is stamped on every `AiUsage` row. Rates change; a stored
 * cost must stay attributable to the prices that produced it, or every
 * historical total silently rewrites itself the day a price moves.
 */
export const AI_RATE_VERSION = '2026-07-sonnet5-intro'

export interface AiRate {
  /** µ$ per 1,000 uncached input tokens. */
  input: number
  /** µ$ per 1,000 output tokens. */
  output: number
}

export const AI_RATES: Record<AiModelId, AiRate> = {
  // Sonnet 5 INTRODUCTORY pricing: $2.00 / $10.00 per MTok, through 2026-08-31.
  // Standard is $3.00 / $15.00 — a 50% rise, not a doubling. Bump this table and
  // AI_RATE_VERSION together. See docs/TODO.md → "AI cost review".
  'claude-sonnet-5': { input: 2_000, output: 10_000 },
  // Haiku 4.5: $1.00 / $5.00 per MTok.
  'claude-haiku-4-5-20251001': { input: 1_000, output: 5_000 },
}

/** A cache read bills at a tenth of the base input rate. */
const CACHE_READ_MULTIPLIER = 0.1
/** Writing a 5-minute cache entry bills at 1.25x. Every site here uses `ephemeral`. */
const CACHE_WRITE_MULTIPLIER = 1.25

export interface AiTokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

/**
 * Cost of one call in micro-dollars.
 *
 * Cached tokens are priced separately and it matters: ten of the app's paid
 * sites lead with a cached block, so charging cache reads at the full input rate
 * would overstate the bill on exactly the calls that were optimised. `usage`
 * reports the three input buckets disjointly — `input_tokens` is the uncached
 * remainder, not the total.
 *
 * An unknown model costs 0 rather than throwing: a missing rate must never fail
 * a student's request, and a zero row is an obvious gap in the accounting.
 */
export function costMicros(model: string, usage: AiTokenUsage): number {
  const rate = AI_RATES[model as AiModelId]
  if (!rate) return 0
  const perThousand =
    usage.inputTokens * rate.input +
    usage.cacheReadInputTokens * rate.input * CACHE_READ_MULTIPLIER +
    usage.cacheCreationInputTokens * rate.input * CACHE_WRITE_MULTIPLIER +
    usage.outputTokens * rate.output
  return Math.round(perThousand / 1_000)
}
