import { describe, it, expect } from 'vitest'
import type { Prisma } from '@prisma/client'
import { LAB_TYPES, type LabType } from '@/lib/phase'
import { SHOP_BUILDINGS, TIER_LADDER, shopBuilding, buildingAtTier } from '@/lib/shop'
import { transferBuildingsToLabType } from '@/lib/lab-type/transfer'

/** Minimal stand-in for the slice of `tx` the transfer touches. */
function fakeTx(rows: Array<{ id: string; buildingKey: string }>) {
  const store = rows.map((r) => ({ ...r }))
  return {
    store,
    teamShopBuilding: {
      findMany: async () => store.map((r) => ({ id: r.id, buildingKey: r.buildingKey })),
      update: async ({ where, data }: { where: { id: string }; data: { buildingKey: string } }) => {
        const row = store.find((r) => r.id === where.id)!
        row.buildingKey = data.buildingKey
        return row
      },
    },
  }
}

/** The fake implements only the two calls the transfer makes; the cast says so. */
const asTx = (t: ReturnType<typeof fakeTx>) => t as unknown as Prisma.TransactionClient

describe('lab catalogs cover the ladder — the invariant transfer relies on', () => {
  it.each(LAB_TYPES)('%s covers tiers 0..9 exactly once', (labType) => {
    const tiers = SHOP_BUILDINGS.filter((b) => b.labType === labType).map((b) => b.tier)
    expect([...tiers].sort((a, b) => a! - b!)).toEqual(TIER_LADDER.map((_, i) => i))
  })

  it('every building resolves to a counterpart in every other lab', () => {
    for (const b of SHOP_BUILDINGS) {
      for (const target of LAB_TYPES) {
        expect(buildingAtTier(target, b.tier!)).toBeDefined()
      }
    }
  })
})

describe('transferBuildingsToLabType', () => {
  it('remaps every building to the same tier in the target lab', async () => {
    // Volt Lab's cheapest (tier 0) and its premium (tier 9).
    const tx = fakeTx([
      { id: 'a', buildingKey: 'workshop' }, // tier 0
      { id: 'b', buildingKey: 'ai_incubator' }, // tier 9
    ])

    const out = await transferBuildingsToLabType(asTx(tx), 'team1', 'biocore')

    expect(out.moved).toBe(2)
    expect(out.skipped).toEqual([])
    // tier 0 → Greenhouse, tier 9 → Bioinformatics Suite (BioCore's premium).
    expect(tx.store.map((r) => r.buildingKey)).toEqual(['greenhouse', 'bioinformatics_suite'])
    // The user's example: the highest building stays the highest building.
    expect(shopBuilding('bioinformatics_suite')!.tier).toBe(9)
  })

  it('preserves tier across a full 10-building plot, for every lab pair', async () => {
    const volt = SHOP_BUILDINGS.filter((b) => b.labType === 'volt_lab')
    for (const target of LAB_TYPES.filter((l) => l !== 'volt_lab')) {
      const tx = fakeTx(volt.map((b, i) => ({ id: String(i), buildingKey: b.key })))
      const out = await transferBuildingsToLabType(asTx(tx), 'team1', target as LabType)

      expect(out.moved).toBe(10)
      // Every resulting row belongs to the target lab and kept its rung.
      const after = tx.store.map((r) => shopBuilding(r.buildingKey)!)
      expect(after.every((b) => b.labType === target)).toBe(true)
      expect(after.map((b) => b.tier)).toEqual(volt.map((b) => b.tier))
      // No two buildings collapsed onto the same key (@@unique teamId+key).
      expect(new Set(tx.store.map((r) => r.buildingKey)).size).toBe(10)
    }
  })

  it('is idempotent — re-running against the same lab moves nothing', async () => {
    const tx = fakeTx([{ id: 'a', buildingKey: 'greenhouse' }])
    const out = await transferBuildingsToLabType(asTx(tx), 'team1', 'biocore')
    expect(out.moved).toBe(0)
    expect(tx.store[0].buildingKey).toBe('greenhouse')
  })

  it('ignores keys that are no longer in the catalog rather than throwing', async () => {
    const tx = fakeTx([{ id: 'a', buildingKey: 'retired_building' }])
    const out = await transferBuildingsToLabType(asTx(tx), 'team1', 'axiom')
    expect(out.moved).toBe(0)
    expect(tx.store[0].buildingKey).toBe('retired_building')
  })
})
