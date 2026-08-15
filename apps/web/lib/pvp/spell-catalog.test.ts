import { describe, expect, it } from 'vitest'
import { LAB_TYPES } from '@/lib/phase'
import { SHOP_BUILDINGS } from '@/lib/shop'
import { SPELL_CATALOG, spellForBuilding, spellShapeFor } from './spell-catalog'

describe('spell catalog integrity', () => {
  it('defines exactly one spell for every economy building', () => {
    const shopKeys = SHOP_BUILDINGS.map((building) => building.key).sort()
    const spellKeys = SPELL_CATALOG.map((spell) => spell.buildingKey).sort()

    expect(new Set(spellKeys).size).toBe(spellKeys.length)
    expect(spellKeys).toEqual(shopKeys)
  })

  it('looks up the canonical entry and returns undefined for an unknown building', () => {
    for (const spell of SPELL_CATALOG) {
      expect(spellForBuilding(spell.buildingKey)).toBe(spell)
    }
    expect(spellForBuilding('not_a_building')).toBeUndefined()
  })

  it('keeps the runtime shape and icon consistent with spell behavior', () => {
    for (const spell of SPELL_CATALOG) {
      expect(spell.shape).toBe(spellShapeFor(spell.radius, spell.lingering))
      expect(spell.baseDamage).toBeGreaterThan(0)
      expect(spell.radius).toBeGreaterThan(0)
      expect(spell.cooldownMs).toBeGreaterThan(0)
      if (!spell.icon.startsWith('sig_')) {
        expect(spell.icon).toBe(`${spell.shape}_${spell.type}`)
      }
    }
  })

  it('gives every lab signatures at tiers 1, 5, 8, 9 and 10', () => {
    const spellByBuilding = new Map(SPELL_CATALOG.map((spell) => [spell.buildingKey, spell]))

    for (const labType of LAB_TYPES) {
      const buildings = SHOP_BUILDINGS.filter((building) => building.labType === labType)
      const signatureTiers = buildings
        .filter((building) => spellByBuilding.get(building.key)?.icon.startsWith('sig_'))
        .map((building) => building.tier)
        .sort((a, b) => (a ?? -1) - (b ?? -1))

      expect(signatureTiers, labType).toEqual([0, 4, 7, 8, 9])
      expect(new Set(buildings.map((building) => spellByBuilding.get(building.key)?.type))).toEqual(
        new Set(['empirical', 'theoretical', 'applied']),
      )
    }
  })
})
