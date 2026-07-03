import type { Prisma, CredibilityTier } from '@prisma/client'
import { visitKp, clampToDailyCap } from '@/lib/discovery/economy'

// ─── First-visit KP award (shared by tree POST + reflection PATCH) ────────────
// Deterministic, idempotent, daily-capped. No LLM, no network. The visit-ledger
// @@unique([teamId, nodeId]) is the SOLE idempotency gate: re-clicking, re-
// branching, and delete-and-recreate all trip P2002 and pay nothing.

export interface AwardVisitInput {
  teamId: string
  userId: string
  nodeId: string
  /** Source-node credibility tier (server-read); null for wiki/youtube. */
  tier?: CredibilityTier | null
}

export interface AwardVisitResult {
  /** KP actually credited to the team (post-cap; 0 if capped or already visited). */
  kpAwarded: number
  /** True when the node was already in the visit ledger (idempotent no-op). */
  alreadyVisited: boolean
}

/** UTC-midnight Date for "today" — matches LabCreditClaim.day (project-log route). */
function utcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Award the first-visit KP for reaching `nodeId`, inside the caller's `tx`.
 *
 * Steps (increment `day` first, then `teamCurrency`, all in one txn so a crash
 * can't credit KP without recording it against the cap):
 *   1. Insert the visit-ledger row (kpAwarded 0) — P2002 ⇒ already visited, pay 0.
 *   2. Read/seed today's DiscoveryKpDay rollup, clamp the want to the headroom.
 *   3. If any headroom: bump the rollup, backfill the ledger row's kpAwarded, and
 *      upsert TeamCurrency.kp (upsert since a discovery-phase team may have no row).
 */
export async function awardDiscoveryVisit(
  tx: Prisma.TransactionClient,
  { teamId, userId, nodeId, tier }: AwardVisitInput,
): Promise<AwardVisitResult> {
  const want = visitKp(tier)

  try {
    await tx.discoverySourceVisit.create({
      data: { teamId, nodeId, userId, kpAwarded: 0 },
    })
  } catch (err) {
    // Unique violation → this node was already reached by the team: pay nothing.
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return { kpAwarded: 0, alreadyVisited: true }
    }
    throw err
  }

  const day = utcDay()
  const rollup = await tx.discoveryKpDay.upsert({
    where: { teamId_day: { teamId, day } },
    create: { teamId, day, kpTotal: 0 },
    update: {},
    select: { kpTotal: true },
  })

  const granted = clampToDailyCap(want, rollup.kpTotal)
  if (granted > 0) {
    await tx.discoveryKpDay.update({
      where: { teamId_day: { teamId, day } },
      data: { kpTotal: { increment: granted } },
    })
    await tx.discoverySourceVisit.update({
      where: { teamId_nodeId: { teamId, nodeId } },
      data: { kpAwarded: granted },
    })
    await tx.teamCurrency.upsert({
      where: { teamId },
      create: { teamId, kp: granted },
      update: { kp: { increment: granted } },
    })
  }

  return { kpAwarded: granted, alreadyVisited: false }
}
