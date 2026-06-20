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
  it('discovery unlocks discovery + fair_hub only', () => {
    const f = getUnlockedFeatures('discovery')
    expect(f.has('discovery')).toBe(true)
    expect(f.has('fair_hub')).toBe(true)
    expect(f.has('buildings')).toBe(false)
    expect(f.has('showcase')).toBe(false)
  })

  it('working unlocks buildings/minigames/pvp and everything earlier', () => {
    expect(isFeatureUnlocked('working', 'buildings')).toBe(true)
    expect(isFeatureUnlocked('working', 'literature')).toBe(true)
    expect(isFeatureUnlocked('working', 'showcase')).toBe(false)
  })

  it('showcase phase unlocks everything', () => {
    const f = getUnlockedFeatures('showcase')
    for (const feature of ['discovery', 'fair_hub', 'lab_selection', 'literature', 'research_plan', 'daily', 'buildings', 'minigames', 'pvp', 'showcase'] as const) {
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
      assertFeatureUnlocked('discovery', 'buildings')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PhaseGateError)
      expect((err as PhaseGateError).statusCode).toBe(403)
    }
  })
  it('does not throw when unlocked', () => {
    expect(() => assertFeatureUnlocked('working', 'buildings')).not.toThrow()
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
