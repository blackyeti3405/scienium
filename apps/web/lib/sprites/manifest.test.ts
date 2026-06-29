/**
 * Unit tests for getBuildingSprite / buildingStageSuffix — the upgrade-stage sprite
 * path resolution. A building evolves at the four LC tier-ups:
 *   L1–3 base · L4–6 _t2 · L7–9 _t3 · L10–14 _t4 · L15 _t5
 *
 * These run in vitest (pure function, no DB, no Next server).
 */

import { describe, it, expect } from 'vitest'
import { getBuildingSprite, buildingStageSuffix } from '@/lib/sprites/manifest'

describe('buildingStageSuffix — level → upgrade stage', () => {
  it('maps levels to the right stage suffix at the LC tier-ups', () => {
    expect(buildingStageSuffix(1)).toBe('')
    expect(buildingStageSuffix(3)).toBe('')
    expect(buildingStageSuffix(4)).toBe('_t2')
    expect(buildingStageSuffix(6)).toBe('_t2')
    expect(buildingStageSuffix(7)).toBe('_t3')
    expect(buildingStageSuffix(9)).toBe('_t3')
    expect(buildingStageSuffix(10)).toBe('_t4')
    expect(buildingStageSuffix(14)).toBe('_t4')
    expect(buildingStageSuffix(15)).toBe('_t5')
  })
})

describe('getBuildingSprite — staged sprite resolution', () => {
  const labType = 'volt_lab'
  const slug = '3d-printing-shop' // a slug with a real sprite in BUILDING_SPRITES

  it('returns null for an unknown slug (sprite not in manifest)', () => {
    expect(getBuildingSprite(labType, 'nonexistent-building', 1)).toBeNull()
  })

  it('levels 1 and 3 → base path (no stage suffix)', () => {
    for (const lvl of [1, 3]) {
      const entry = getBuildingSprite(labType, slug, lvl)
      expect(entry).not.toBeNull()
      expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}.png`)
    }
  })

  it('each tier-up resolves to its stage sprite', () => {
    const cases: Array<[number, string]> = [
      [4, '_t2'],
      [7, '_t3'],
      [10, '_t4'],
      [15, '_t5'],
    ]
    for (const [lvl, suffix] of cases) {
      const entry = getBuildingSprite(labType, slug, lvl)
      expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}${suffix}.png`)
    }
  })

  it('default level (no argument) behaves as level 1 — base path', () => {
    const entry = getBuildingSprite(labType, slug)
    expect(entry!.path).toBe(`/sprites/buildings/${labType}/${slug}.png`)
  })

  it('description notes the stage at level >= 4, not at the base', () => {
    expect(getBuildingSprite(labType, slug, 4)!.description).toContain('stage')
    expect(getBuildingSprite(labType, slug, 3)!.description).not.toContain('stage')
  })

  it('anchor is identical across stages (stages reuse the base footprint anchor)', () => {
    const base = getBuildingSprite(labType, slug, 1)
    for (const lvl of [4, 7, 10, 15]) {
      expect(getBuildingSprite(labType, slug, lvl)!.anchor).toEqual(base!.anchor)
    }
  })
})
