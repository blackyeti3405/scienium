import 'server-only'
import type { Prisma } from '@prisma/client'
import type { LabType } from '@/lib/phase'
import { shopBuilding, buildingAtTier } from '@/lib/shop'

/**
 * Carry a team's plot across a lab-type reassignment.
 *
 * A team picks a lab type when it creates its lab, but the REAL one is decided
 * later from its topic/idea — so a lab that spent a term building Volt Lab can be
 * told it is actually BioCore. Without this, every one of those buildings becomes
 * unbuyable (`shopBuildingsForLabType` filters them out), unsellable, and
 * unrenderable: the team is punished for the game changing its mind.
 *
 * The mapping is by TIER, not by name. Every lab catalog covers `TIER_LADDER`
 * steps 0–9 exactly once, so a building's rung is the thing that means something
 * across labs: the tier-9 Volt Lab building (AI Incubator) becomes the tier-9
 * BioCore building (Bioinformatics Suite). Grid position, upgrade level and the
 * KP actually paid all ride along untouched, so nothing is lost and a later sell
 * still refunds the true purchase price.
 *
 * Idempotent by construction: a row already belonging to `toLabType` maps to
 * itself and is skipped. Runs in the CALLER's transaction so the plot rewrite and
 * the `Team.labType` write commit together — a crash between them would leave a
 * BioCore team holding Volt Lab buildings, which is the exact state this exists
 * to prevent.
 */
export interface LabTypeTransfer {
  /** Rows whose `buildingKey` was rewritten. */
  moved: number
  /** `oldKey → newKey` for each rewrite, for the activity log and tests. */
  remapped: Array<{ from: string; to: string; tier: number }>
  /**
   * Rows left alone because the catalog had no counterpart. Always empty while
   * every lab covers all ten tiers; surfaced rather than silently dropped so a
   * future lab with a short catalog is a visible bug, not a vanished building.
   */
  skipped: string[]
}

export async function transferBuildingsToLabType(
  tx: Prisma.TransactionClient,
  teamId: string,
  toLabType: LabType,
): Promise<LabTypeTransfer> {
  const rows = await tx.teamShopBuilding.findMany({
    where: { teamId },
    select: { id: true, buildingKey: true },
  })

  const result: LabTypeTransfer = { moved: 0, remapped: [], skipped: [] }

  for (const row of rows) {
    const from = shopBuilding(row.buildingKey)
    // Unknown key (catalog entry retired) or already the right lab — nothing to do.
    if (!from || from.tier === undefined || from.labType === toLabType) continue

    const to = buildingAtTier(toLabType, from.tier)
    if (!to || to.key === row.buildingKey) {
      result.skipped.push(row.buildingKey)
      continue
    }

    // Safe one row at a time despite @@unique([teamId, buildingKey]): source and
    // target keys come from different labs, so the two key sets are disjoint and
    // no intermediate state can collide.
    await tx.teamShopBuilding.update({
      where: { id: row.id },
      data: { buildingKey: to.key },
    })
    result.moved++
    result.remapped.push({ from: row.buildingKey, to: to.key, tier: from.tier })
  }

  return result
}
