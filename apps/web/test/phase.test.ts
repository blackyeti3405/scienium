import { describe, it, expect } from 'vitest'
import {
  PHASE_ORDER,
  phaseIndex,
  isPhaseAtLeast,
  getUnlockedFeatures,
  isFeatureUnlocked,
  assertFeatureUnlocked,
  PhaseGateError,
  getLabSize,
  type Phase,
} from '@/lib/phase'

describe('phase ordering', () => {
  it('is cumulative — later phases inherit earlier unlocks', () => {
    expect(isPhaseAtLeast('working', 'discovery')).toBe(true)
    expect(isPhaseAtLeast('discovery', 'working')).toBe(false)
    expect(isPhaseAtLeast('literature_review', 'literature_review')).toBe(true)
  })

  it('phaseIndex matches PHASE_ORDER', () => {
    PHASE_ORDER.forEach((p, i) => expect(phaseIndex(p)).toBe(i))
  })
})

describe('feature gating', () => {
  it('discovery unlocks discovery + fair_hub + buildings only', () => {
    const f = getUnlockedFeatures('discovery')
    expect(f.has('discovery')).toBe(true)
    expect(f.has('fair_hub')).toBe(true)
    expect(f.has('literature')).toBe(false)
    expect(f.has('showcase')).toBe(false)
  })

  it('buildings are never phase-locked — teams arrange the plot from day one', () => {
    for (const p of PHASE_ORDER) expect(isFeatureUnlocked(p, 'buildings')).toBe(true)
  })

  it('working unlocks pvp/data_terminal and everything earlier', () => {
    expect(isFeatureUnlocked('working', 'pvp')).toBe(true)
    expect(isFeatureUnlocked('working', 'data_terminal')).toBe(true)
    expect(isFeatureUnlocked('working', 'literature')).toBe(true)
    expect(isFeatureUnlocked('working', 'showcase')).toBe(false)
  })

  it('showcase phase unlocks everything', () => {
    const f = getUnlockedFeatures('showcase')
    for (const feature of ['discovery', 'fair_hub', 'lab_selection', 'literature', 'research_plan', 'daily', 'buildings', 'pvp', 'showcase'] as const) {
      expect(f.has(feature)).toBe(true)
    }
  })

  it('every phase is a subset of the next', () => {
    for (let i = 1; i < PHASE_ORDER.length; i++) {
      const prev = getUnlockedFeatures(PHASE_ORDER[i - 1] as Phase)
      const cur = getUnlockedFeatures(PHASE_ORDER[i] as Phase)
      for (const f of prev) expect(cur.has(f)).toBe(true)
    }
  })
})

describe('assertFeatureUnlocked', () => {
  it('throws PhaseGateError with a 403 status code when locked', () => {
    try {
      assertFeatureUnlocked('discovery', 'pvp')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PhaseGateError)
      expect((err as PhaseGateError).statusCode).toBe(403)
    }
  })
  it('does not throw when unlocked', () => {
    expect(() => assertFeatureUnlocked('working', 'pvp')).not.toThrow()
  })
})

describe('getLabSize', () => {
  it('is small only during discovery/lab_selection', () => {
    expect(getLabSize('discovery')).toBe('small')
    expect(getLabSize('lab_selection')).toBe('small')
    expect(getLabSize('literature_review')).toBe('grown')
    expect(getLabSize('working')).toBe('grown')
  })
})
