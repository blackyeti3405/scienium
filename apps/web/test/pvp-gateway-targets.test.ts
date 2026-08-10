import { describe, it, expect } from 'vitest'
import {
  buildGatewayTarget,
  buildBuildingTarget,
  GATEWAY_HEALTH,
  GATEWAY_SPELL_TYPES,
  BUILDING_BASE_HEALTH,
  BUILDING_HEALTH_PER_LEVEL,
} from '@/lib/pvp/combat-engine'
import { GATEWAY_KEYS } from '@/lib/sprites/manifest'

/**
 * Gateways became raidable targets, which means they flow through the same
 * damage resolution, destroyed-percentage and trophy maths as economy
 * buildings. These pin the two things that make that safe: the target shape is
 * genuinely identical, and every gateway the game can place has a spell type
 * (a missing one would silently fall out of the type cycle).
 */
describe('gateway raid targets', () => {
  const target = buildGatewayTarget('pl_1', 'Discovery building', 'discovery', -1, 2, 'empirical')

  it('carries every field an economy building target does', () => {
    // A superset, not an exact match: `isGateway` is optional and an economy
    // building omits it. What matters is that nothing downstream — damage
    // resolution, the destroyed-percentage, the results sheet — can hit an
    // undefined field because it was handed a gateway instead of a building.
    const building = buildBuildingTarget('b_1', 'Workshop', 3, 0, 0, 'applied', 'workshop')
    for (const key of Object.keys(building)) {
      expect(target, `gateway target is missing "${key}"`).toHaveProperty(key)
    }
  })

  it('starts at full health and carries the gateway flag + key', () => {
    expect(target.currentHealth).toBe(GATEWAY_HEALTH)
    expect(target.maxHealth).toBe(GATEWAY_HEALTH)
    expect(target.isGateway).toBe(true)
    // `sprite` carries the KEY (resolved against the lab skin), not a slug.
    expect(target.sprite).toBe('discovery')
    expect(target.position).toEqual({ x: -1, y: 2 })
  })

  it('has no upgrade level, because gateways do not upgrade', () => {
    expect(target.level).toBe(0)
    // …and its health must NOT come from the level formula, which at level 0
    // would make a gateway the flimsiest thing on the plot.
    expect(target.maxHealth).not.toBe(BUILDING_BASE_HEALTH + BUILDING_HEALTH_PER_LEVEL * 0)
  })

  it('sits between a fresh and a maxed economy building in toughness', () => {
    const fresh = BUILDING_BASE_HEALTH + BUILDING_HEALTH_PER_LEVEL * 1
    const maxed = BUILDING_BASE_HEALTH + BUILDING_HEALTH_PER_LEVEL * 15
    expect(GATEWAY_HEALTH).toBeGreaterThan(fresh)
    expect(GATEWAY_HEALTH).toBeLessThan(maxed)
  })

  it('assigns a spell type to every gateway the game can place', () => {
    for (const key of GATEWAY_KEYS) {
      expect(GATEWAY_SPELL_TYPES[key], `no spell type for gateway "${key}"`).toBeDefined()
    }
  })
})
