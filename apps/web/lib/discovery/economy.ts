/**
 * Pure economy arithmetic for the Discovery→economy bridge (#1).
 *
 * Mirrors the style of `lib/economy.ts`: no DB, no network, no LLM — just the
 * numbers that go into the award transaction (`lib/discovery/awardVisit.ts`).
 * Pulling the cap/tier math out here gives it a unit-test surface with no DB.
 *
 * Judge-defensible: KP is deterministic (base × host-derived tier multiplier),
 * hard-capped per team per day, and never re-paid for a node already reached.
 */

import type { CredibilityTier } from '@prisma/client'

// ─── Constants (named exports so tests + the plan agree; tune here later) ─────

/** Base KP for the first visit to any Discovery node (wiki/youtube = base ×1). */
export const DISCOVERY_VISIT_KP = 5

/**
 * Hard cap on KP a team can earn from Discovery visits in one real calendar day.
 * ≈ enough for a normal exploratory session; blocks grinding. Awards that would
 * cross the cap are clamped to the remaining headroom (partial, down to 0).
 */
export const DISCOVERY_DAILY_KP_CAP = 60

/** One-time-ever bonus granted when a team first locks in its research topic. */
export const TOPIC_LOCK_KP = 25

/**
 * Credibility-tier multipliers for `source` nodes. Peer-reviewed > preprint /
 * open-access > wiki/youtube (no tier → ×1). The tier is ALWAYS read from the
 * server-persisted `ExternalSource.credibilityTier` (never trusted from client).
 */
export const TIER_KP_MULTIPLIER: Record<CredibilityTier, number> = {
  peer_reviewed: 3, // 15 KP
  preprint: 2, // 10 KP
  open_access: 2, // 10 KP
}

/** Base × tier multiplier. Null/undefined tier (wiki/youtube) → base ×1. */
export function visitKp(tier?: CredibilityTier | null): number {
  const mult = tier ? TIER_KP_MULTIPLIER[tier] ?? 1 : 1
  return DISCOVERY_VISIT_KP * mult
}

/**
 * Clamp a wanted award to the remaining daily headroom: never negative, never
 * more than `cap - alreadyToday`. A team at or over the cap earns 0.
 */
export function clampToDailyCap(
  want: number,
  alreadyToday: number,
  cap = DISCOVERY_DAILY_KP_CAP,
): number {
  return Math.max(0, Math.min(want, cap - alreadyToday))
}
