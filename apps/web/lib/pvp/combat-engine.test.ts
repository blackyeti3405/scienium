/**
 * Unit tests for the PvP combat engine — pure-function assertions only.
 * No DB mocking. Mirrors the pattern from lib/shop.test.ts / lib/economy.test.ts.
 *
 * Covers:
 *   - resolveCast: AOE damage, type effectiveness, power multiplier, health clamp
 *   - typeEffectiveness: full 9-pair matrix (super-effective, resist, neutral)
 *   - calculateTrophyDelta: gain branch (>= 30%) and loss branch (< 30%, behind TROPHY_LOSS_TODO)
 */

import { describe, it, expect } from 'vitest'
import {
  resolveCast,
  calculateTrophyDelta,
  typeEffectiveness,
  MAX_TROPHY_GAIN,
  TROPHY_LOSS_THRESHOLD,
  MAX_TROPHY_LOSS,
  TROPHY_LOSS_TODO,
  SPELL_BASE_DAMAGE,
  SPELL_AOE_RADIUS,
  SPELL_DAMAGE_PER_LEVEL,
  scaleDamage,
  buildSpell,
} from './combat-engine'
import type { RaidSession, RaidCastEvent, BuildingTarget, Spell } from '@scienium/shared-types'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 'spell-1',
    name: 'Test Spell',
    buildingId: 'building-1',
    level: 1,
    damage: SPELL_BASE_DAMAGE,
    aoeRadius: SPELL_AOE_RADIUS,
    castDelay: 1500,
    labType: 'biocore',
    type: 'empirical',
    ...overrides,
  }
}

function makeBuilding(overrides: Partial<BuildingTarget> = {}): BuildingTarget {
  return {
    buildingId: 'bldg-1',
    name: 'Greenhouse',
    maxHealth: 120,
    currentHealth: 120,
    position: { x: 0, y: 0 },
    type: 'empirical',
    level: 1,
    ...overrides,
  }
}

function makeSession(overrides: Partial<RaidSession> = {}): RaidSession {
  return {
    id: 'raid-1',
    attackerTeamId: 'attacker-1',
    defenderTeamId: 'defender-1',
    timeLimit: 15_000,
    spellsAvailable: [makeSpell()],
    defenderBase: [makeBuilding()],
    startedAt: Date.now(),
    ...overrides,
  }
}

// ─── resolveCast ───────────────────────────────────────────────────────────

describe('resolveCast', () => {
  // Positions are PLOT CELLS (lib/plot.ts gx/gy, each in [-3, 3]) and aoeRadius
  // is a tile distance. This used to be an 80-PIXEL radius compared against
  // those cell coordinates, so the blast always covered the whole plot — the
  // far corner below is the case that regressed.
  it('damages buildings within AOE radius (tiles), spares those outside', () => {
    const spell = makeSpell({ type: 'empirical', damage: 25, aoeRadius: 1.5 })
    const buildingIn = makeBuilding({
      buildingId: 'bldg-in',
      currentHealth: 120,
      maxHealth: 120,
      position: { x: 1, y: 0 }, // 1 tile away < 1.5
    })
    const buildingOut = makeBuilding({
      buildingId: 'bldg-out',
      currentHealth: 120,
      maxHealth: 120,
      position: { x: 3, y: 3 }, // opposite corner of the plot, ~4.2 tiles
    })
    const session = makeSession({
      spellsAvailable: [spell],
      defenderBase: [buildingIn, buildingOut],
    })
    const event: RaidCastEvent = { spellId: 'spell-1', x: 0, y: 0, clientTs: 1000 }

    const result = resolveCast(session, event, 1.0)

    // In-range building takes damage: 25 * 1.0 (typeEffectiveness) * 1.0 (powerMultiplier)
    const inBuilding = result.find((b) => b.buildingId === 'bldg-in')!
    expect(inBuilding.currentHealth).toBeLessThan(inBuilding.maxHealth)
    expect(inBuilding.currentHealth).toBe(120 - 25) // 25 damage, same type = 1.0 neutral

    // Out-of-range building unchanged
    const outBuilding = result.find((b) => b.buildingId === 'bldg-out')!
    expect(outBuilding.currentHealth).toBe(120)
  })

  it('applies type effectiveness multipliers: 2x super-effective, 0.5x resist, 1x neutral', () => {
    const superEffEvent: RaidCastEvent = { spellId: 'spell-emp', x: 0, y: 0, clientTs: 1000 }
    const resistEvent: RaidCastEvent = { spellId: 'spell-theo', x: 0, y: 0, clientTs: 1000 }
    const neutralEvent: RaidCastEvent = { spellId: 'spell-app', x: 0, y: 0, clientTs: 1000 }

    const spellEmpirical = makeSpell({ id: 'spell-emp', type: 'empirical', damage: 25 })
    const spellTheoretical = makeSpell({ id: 'spell-theo', type: 'theoretical', damage: 25 })
    const spellApplied = makeSpell({ id: 'spell-app', type: 'applied', damage: 25 })

    // Test super-effective: empirical attacks theoretical → 2x = 25 * 2 * 1.0 = 50
    let session = makeSession({
      spellsAvailable: [spellEmpirical],
      defenderBase: [makeBuilding({ buildingId: 'bldg-target', currentHealth: 120, maxHealth: 120, type: 'theoretical' })],
    })
    let result = resolveCast(session, superEffEvent, 1.0)
    expect(result[0].currentHealth).toBe(120 - 25 * 2) // 2x super-effective

    // Test resist: theoretical attacks empirical → 0.5x
    // damage = 25 * 1.0 * 0.5 = 12.5
    session = makeSession({
      spellsAvailable: [spellTheoretical],
      defenderBase: [makeBuilding({ buildingId: 'bldg-target', currentHealth: 120, maxHealth: 120, type: 'empirical' })],
    })
    result = resolveCast(session, resistEvent, 1.0)
    expect(result[0].currentHealth).toBe(120 - 12.5) // 0.5x resist

    // Test neutral: applied attacks applied → 1.0
    session = makeSession({
      spellsAvailable: [spellApplied],
      defenderBase: [makeBuilding({ buildingId: 'bldg-target', currentHealth: 120, maxHealth: 120, type: 'applied' })],
    })
    result = resolveCast(session, neutralEvent, 1.0)
    expect(result[0].currentHealth).toBe(120 - 25) // 1.0 neutral
  })

  it('applies spell power multiplier: powerMultiplier=0.5 halves damage, 2.0 doubles', () => {
    const spell = makeSpell({ damage: 25 })
    const building = makeBuilding({
      currentHealth: 200,
      maxHealth: 200,
      position: { x: 0, y: 0 },
      type: 'empirical', // same type = 1x effectiveness = neutral
    })
    const event: RaidCastEvent = { spellId: 'spell-1', x: 0, y: 0, clientTs: 1000 }

    // 0.5x multiplier: damage = 25 * 0.5 * 1.0 = 12.5
    let session = makeSession({ spellsAvailable: [spell], defenderBase: [{ ...building, currentHealth: 200 }] })
    let result = resolveCast(session, event, 0.5)
    expect(result[0].currentHealth).toBe(200 - 12.5)

    // 1.0x multiplier
    session = makeSession({ spellsAvailable: [spell], defenderBase: [{ ...building, currentHealth: 200 }] })
    result = resolveCast(session, event, 1.0)
    expect(result[0].currentHealth).toBe(200 - 25)

    // 1.5x multiplier: damage = 25 * 1.5 * 1.0 = 37.5
    session = makeSession({ spellsAvailable: [spell], defenderBase: [{ ...building, currentHealth: 200 }] })
    result = resolveCast(session, event, 1.5)
    expect(result[0].currentHealth).toBe(200 - 37.5)

    // 2.0x multiplier
    session = makeSession({ spellsAvailable: [spell], defenderBase: [{ ...building, currentHealth: 200 }] })
    result = resolveCast(session, event, 2.0)
    expect(result[0].currentHealth).toBe(200 - 50)
  })

  it('clamps building health to 0 minimum', () => {
    // Building with low health: baseDamage > currentHealth should clamp to 0
    const spell = makeSpell({ damage: 50 })
    const building = makeBuilding({
      currentHealth: 10,
      maxHealth: 120,
      position: { x: 0, y: 0 },
    })
    const session = makeSession({ spellsAvailable: [spell], defenderBase: [building] })
    const event: RaidCastEvent = { spellId: 'spell-1', x: 0, y: 0, clientTs: 1000 }

    const result = resolveCast(session, event, 1.0)
    expect(result[0].currentHealth).toBe(0)
    expect(result[0].currentHealth).not.toBeLessThan(0)
  })

  it('typeEffectiveness self-pair returns 1.0 neutral', () => {
    // Same attack type and defender type returns 1.0
    expect(typeEffectiveness('empirical', 'empirical')).toBe(1.0)
    expect(typeEffectiveness('theoretical', 'theoretical')).toBe(1.0)
    expect(typeEffectiveness('applied', 'applied')).toBe(1.0)
  })
})

// ─── typeEffectiveness ─────────────────────────────────────────────────────

describe('typeEffectiveness', () => {
  it('returns 2.0 for super-effective pairs', () => {
    // Cycle: empirical > theoretical > applied > empirical
    expect(typeEffectiveness('empirical', 'theoretical')).toBe(2.0)
    expect(typeEffectiveness('theoretical', 'applied')).toBe(2.0)
    expect(typeEffectiveness('applied', 'empirical')).toBe(2.0)
  })

  it('returns 0.5 for resisted pairs', () => {
    // Inverse of super-effective
    expect(typeEffectiveness('theoretical', 'empirical')).toBe(0.5)
    expect(typeEffectiveness('applied', 'theoretical')).toBe(0.5)
    expect(typeEffectiveness('empirical', 'applied')).toBe(0.5)
  })

  it('returns 1.0 for neutral pairs (same type)', () => {
    expect(typeEffectiveness('empirical', 'empirical')).toBe(1.0)
    expect(typeEffectiveness('theoretical', 'theoretical')).toBe(1.0)
    expect(typeEffectiveness('applied', 'applied')).toBe(1.0)
  })
})

// ─── calculateTrophyDelta ──────────────────────────────────────────────────

describe('calculateTrophyDelta', () => {
  // Gain branch (>= 30%)
  describe('gain branch (>= TROPHY_GAIN_THRESHOLD)', () => {
    it('returns 0 for exactly threshold-1 (29%) — goes to loss branch', () => {
      // 29% is below threshold so goes to loss branch
      const result = calculateTrophyDelta(29)
      expect(result).toBeLessThanOrEqual(0)
    })

    it('returns positive gain for >= threshold: 30% -> 0, 51% -> 4', () => {
      // 30%: (30-30)/70 * 10 = 0, ceil(0) = 0
      expect(calculateTrophyDelta(30)).toBe(0)
      // 51%: (51-30)/70 * 10 = 3.0, ceil(3.0) = 3
      expect(calculateTrophyDelta(51)).toBe(3)
      // 100%: (100-30)/70 * 10 = 10.0, ceil(10.0) = 10
      expect(calculateTrophyDelta(100)).toBe(10)
    })

    it('caps at MAX_TROPHY_GAIN=10 for 100%', () => {
      expect(calculateTrophyDelta(100)).toBe(MAX_TROPHY_GAIN)
      expect(calculateTrophyDelta(100)).toBe(10)
    })
  })

  // Loss branch (< 30%, behind TROPHY_LOSS_TODO)
  describe('loss branch (< TROPHY_LOSS_THRESHOLD)', () => {
    it('TROPHY_LOSS_TODO is true so loss formula is active', () => {
      expect(TROPHY_LOSS_TODO).toBe(true)
    })

    it('returns -MAX_TROPHY_LOSS for 0% destruction (worst loss)', () => {
      const result = calculateTrophyDelta(0)
      expect(result).toBe(-MAX_TROPHY_LOSS)
      expect(result).toBe(-10)
    })

    it('returns -1 for 29% destruction (just below threshold)', () => {
      const result = calculateTrophyDelta(29)
      expect(result).toBe(-1)
    })

    it('returns 0 for exactly threshold (30%, boundary — goes to gain branch)', () => {
      const result = calculateTrophyDelta(30)
      expect(result).toBe(0)
    })

    it('loss formula produces steppy integer losses between 0% and 29%', () => {
      // 1% → -9
      expect(calculateTrophyDelta(1)).toBe(-9)
      // 15% → -5
      expect(calculateTrophyDelta(15)).toBe(-5)
    })
  })
})

// ─── Constants verification ────────────────────────────────────────────────

describe('trophy constants are exported', () => {
  it('TROPHY_LOSS_THRESHOLD is exported and equals 30', () => {
    expect(TROPHY_LOSS_THRESHOLD).toBe(30)
  })

  it('MAX_TROPHY_LOSS is exported and equals 10', () => {
    expect(MAX_TROPHY_LOSS).toBe(10)
  })
})
// ─── Catalog-driven spell stats ────────────────────────────────────────────
// buildSpell used to ignore the catalog row entirely and hand every spell the
// same constants, which left baseDamage/radius/cooldownMs dead columns.

describe('buildSpell', () => {
  const catalog = { baseDamage: 65, radius: 1, cooldownMs: 3000 }

  it('takes damage, radius and cooldown from the catalog row', () => {
    const s = buildSpell('s1', 'Drill Strike', 'b1', 1, 'volt_lab', 'applied', catalog)
    expect(s.damage).toBe(65)
    expect(s.aoeRadius).toBe(1)
    expect(s.castDelay).toBe(3000)
    expect(s.name).toBe('Drill Strike')
  })

  it('falls back to the module constants when no catalog row is given', () => {
    const s = buildSpell('s1', 'Legacy', 'b1', 1, 'volt_lab', 'applied')
    expect(s.damage).toBe(SPELL_BASE_DAMAGE)
    expect(s.aoeRadius).toBe(SPELL_AOE_RADIUS)
  })

  it('scales damage with building level and never below the level-1 value', () => {
    const l1 = buildSpell('s', 'x', 'b', 1, 'volt_lab', 'applied', catalog).damage
    const l15 = buildSpell('s', 'x', 'b', 15, 'volt_lab', 'applied', catalog).damage
    expect(l1).toBe(65)
    expect(l15).toBeGreaterThan(l1)
    // Flatter than the building-health curve (120 -> 400 HP, 3.33x) on purpose.
    expect(l15 / l1).toBeLessThan(400 / 120)
  })
})

describe('scaleDamage', () => {
  it('is identity at level 1', () => {
    expect(scaleDamage(30, 1)).toBe(30)
  })

  it('adds SPELL_DAMAGE_PER_LEVEL of base per level above 1', () => {
    expect(scaleDamage(100, 15)).toBeCloseTo(100 * (1 + SPELL_DAMAGE_PER_LEVEL * 14), 6)
  })

  it('never goes below base for out-of-range levels', () => {
    expect(scaleDamage(30, 0)).toBe(30)
  })
})
