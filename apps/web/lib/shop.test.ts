/**
 * Content-shape tests for the building shop catalog (`SHOP_BUILDINGS`).
 *
 * Guards the exact regression class F7 fixes: a lab type silently shipping with
 * no lab-specific catalog (falls back to placeholder-only cards), or a catalog
 * entry whose `sprite` slug doesn't exist in the manifest (silently renders the
 * text placeholder instead of art). Pure content assertions — no DB, no Next
 * server (mirrors lib/economy.test.ts / lib/sprites/manifest.test.ts style).
 */

import { describe, it, expect } from 'vitest'
import { SHOP_BUILDINGS, TIER_LADDER } from '@/lib/shop'
import { BUILDING_SPRITES } from '@/lib/sprites/manifest'
import { LAB_TYPES } from '@/lib/phase'

/** The shared (cost, minClearance) economy curve every lab-specific catalog mirrors. */
const ECONOMY_CURVE: Array<[number, number]> = TIER_LADDER.map((t) => [t.cost, t.minClearance])

function sortPairs(pairs: Array<[number, number]>): Array<[number, number]> {
  return [...pairs].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

describe('SHOP_BUILDINGS — per-lab catalog completeness', () => {
  for (const labType of LAB_TYPES) {
    it(`${labType} has exactly 10 catalog entries`, () => {
      const entries = SHOP_BUILDINGS.filter((b) => b.labType === labType)
      expect(entries).toHaveLength(10)
    })
  }
})

describe('SHOP_BUILDINGS — sprite/manifest membership (no silent placeholder fallback)', () => {
  for (const labType of LAB_TYPES) {
    it(`every ${labType} entry's sprite is a real manifest slug`, () => {
      const slugs = BUILDING_SPRITES[labType]
      expect(slugs).toBeDefined()
      const entries = SHOP_BUILDINGS.filter((b) => b.labType === labType)
      for (const entry of entries) {
        expect(entry.sprite).toBeTruthy()
        expect(slugs).toContain(entry.sprite)
      }
    })

    it(`every ${labType} manifest slug is used by exactly one catalog entry (no orphans)`, () => {
      const slugs = BUILDING_SPRITES[labType]!
      const entries = SHOP_BUILDINGS.filter((b) => b.labType === labType)
      for (const slug of slugs) {
        const matches = entries.filter((e) => e.sprite === slug)
        expect(matches).toHaveLength(1)
      }
    })
  }
})

describe('SHOP_BUILDINGS — key uniqueness', () => {
  it('every key is unique across the entire catalog', () => {
    const keys = SHOP_BUILDINGS.map((b) => b.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('SHOP_BUILDINGS — economy curve parity across all lab-specific catalogs', () => {
  for (const labType of ['volt_lab', 'biocore', 'chemworks', 'terrabase', 'mindframe', 'axiom'] as const) {
    it(`${labType}'s (cost, minClearance) multiset equals the shared economy curve`, () => {
      const entries = SHOP_BUILDINGS.filter((b) => b.labType === labType)
      const pairs = entries.map((e) => [e.cost, e.minClearance] as [number, number])
      expect(sortPairs(pairs)).toEqual(sortPairs(ECONOMY_CURVE))
    })
  }
})

describe('SHOP_BUILDINGS — content completeness', () => {
  it('every entry has a non-empty name and description', () => {
    for (const entry of SHOP_BUILDINGS) {
      expect(entry.name.trim().length).toBeGreaterThan(0)
      expect(entry.description.trim().length).toBeGreaterThan(0)
    }
  })
})
