/**
 * Unit tests for getBuildingSprite — specifically the tier-2 skin path resolution.
 *
 * AC7: at level >= 4, getBuildingSprite returns a path ending with _t2.png;
 *      below level 4 it returns the base path (no _t2 suffix).
 *
 * These run in vitest (pure function, no DB, no Next server).
 */

import { describe, it, expect } from 'vitest'
import { getBuildingSprite } from '@/lib/sprites/manifest'

describe('getBuildingSprite — tier-2 skin resolution (AC7)', () => {
  const labType = 'volt_lab'
  const slug = '3d-printing-shop' // a slug with a real sprite in BUILDING_SPRITES

  it('returns null for an unknown slug (sprite not in manifest)', () => {
    expect(getBuildingSprite(labType, 'nonexistent-building', 1)).toBeNull()
  })

  it('level 1 → base path (no _t2 suffix)', () => {
    const entry = getBuildingSprite(labType, slug, 1)
    expect(entry).not.toBeNull()
    expect(entry!.path).not.toMatch(/_t2\.png$/)
    expect(entry!.path).toMatch(/\.png$/)
    expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}.png`)
  })

  it('level 3 → base path (below tier-2 threshold)', () => {
    const entry = getBuildingSprite(labType, slug, 3)
    expect(entry).not.toBeNull()
    expect(entry!.path).not.toMatch(/_t2\.png$/)
    expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}.png`)
  })

  it('level 4 → tier-2 path (exactly at threshold)', () => {
    const entry = getBuildingSprite(labType, slug, 4)
    expect(entry).not.toBeNull()
    expect(entry!.path).toMatch(/_t2\.png$/)
    expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}_t2.png`)
  })

  it('level 15 (max) → tier-2 path', () => {
    const entry = getBuildingSprite(labType, slug, 15)
    expect(entry).not.toBeNull()
    expect(entry!.path).toMatch(/_t2\.png$/)
    expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}_t2.png`)
  })

  it('default level (no argument) behaves as level 1 — base path', () => {
    const entry = getBuildingSprite(labType, slug)
    expect(entry).not.toBeNull()
    expect(entry!.path).not.toMatch(/_t2\.png$/)
  })

  it('description includes "(tier 2)" at level >= 4', () => {
    const tier2 = getBuildingSprite(labType, slug, 4)
    expect(tier2!.description).toContain('tier 2')

    const base = getBuildingSprite(labType, slug, 3)
    expect(base!.description).not.toContain('tier 2')
  })

  it('anchor is the same for base and tier-2 (tier-2 reuses base anchor)', () => {
    const base = getBuildingSprite(labType, slug, 1)
    const tier2 = getBuildingSprite(labType, slug, 4)
    // Both should resolve the same anchor (or both be undefined).
    expect(tier2!.anchor).toEqual(base!.anchor)
  })
})
