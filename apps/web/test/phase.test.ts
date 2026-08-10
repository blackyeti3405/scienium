import { describe, it, expect } from 'vitest'
import {
  PHASE_ORDER,
  phaseIndex,
  isPhaseAtLeast,
  getUnlockedFeatures,
  isFeatureUnlocked,
  assertFeatureUnlocked,
  FEATURE_MIN_PHASE,
  PhaseGateError,
  getLabSize,
  type Phase,
} from '@/lib/phase'

describe('phase ordering', () => {
  it('is cumulative — later phases inherit earlier unlocks', () => {
    expect(isPhaseAtLeast('project_development', 'discovery')).toBe(true)
    expect(isPhaseAtLeast('discovery', 'project_development')).toBe(false)
    expect(isPhaseAtLeast('plan_refinement', 'literature_review')).toBe(true)
    expect(isPhaseAtLeast('plan_refinement', 'project_development')).toBe(false)
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

  it('locking a topic (→ literature_review) opens the review and the arena', () => {
    expect(isFeatureUnlocked('literature_review', 'literature')).toBe(true)
    expect(isFeatureUnlocked('literature_review', 'pvp')).toBe(true)
    // Still earned: the Codex and Proof of Expertise mint KP and raise clearance.
    expect(isFeatureUnlocked('literature_review', 'daily')).toBe(false)
    expect(isFeatureUnlocked('literature_review', 'research_plan')).toBe(false)
    expect(isFeatureUnlocked('literature_review', 'showcase')).toBe(false)
  })

  it('the logs are open on day one — recording a failure is not a reward', () => {
    for (const p of PHASE_ORDER) expect(isFeatureUnlocked(p, 'logs')).toBe(true)
    expect(isFeatureUnlocked('discovery', 'daily')).toBe(false)
  })

  it('the research idea (→ plan_refinement) opens the Research Plan and nothing later', () => {
    expect(isFeatureUnlocked('plan_refinement', 'research_plan')).toBe(true)
    // The rest of the Operations Hub and the Showcase are still earned, at 20
    // fully-proficient sources.
    expect(isFeatureUnlocked('plan_refinement', 'daily')).toBe(false)
    expect(isFeatureUnlocked('plan_refinement', 'data_terminal')).toBe(false)
    expect(isFeatureUnlocked('plan_refinement', 'showcase')).toBe(false)
  })

  it('project_development (20 sources) unlocks everything', () => {
    const f = getUnlockedFeatures('project_development')
    for (const feature of ['discovery', 'fair_hub', 'literature', 'research_plan', 'logs', 'daily', 'buildings', 'pvp', 'data_terminal', 'showcase'] as const) {
      expect(f.has(feature)).toBe(true)
    }
  })

  it('the last phase unlocks every feature there is', () => {
    // Guards the gap that adding a phase creates: a new Feature added to the
    // union but to no PHASE_UNLOCKS entry would be unreachable forever.
    const last = PHASE_ORDER[PHASE_ORDER.length - 1] as Phase
    const unlocked = getUnlockedFeatures(last)
    for (const feature of Object.keys(FEATURE_MIN_PHASE) as (keyof typeof FEATURE_MIN_PHASE)[]) {
      expect(unlocked.has(feature)).toBe(true)
    }
  })

  it('FEATURE_MIN_PHASE agrees with PHASE_UNLOCKS for every feature', () => {
    // Two tables describe the same fact; drift between them is how a feature
    // ends up "locked" in the UI while the server happily serves it.
    for (const [feature, min] of Object.entries(FEATURE_MIN_PHASE)) {
      const f = feature as keyof typeof FEATURE_MIN_PHASE
      expect(isFeatureUnlocked(min as Phase, f)).toBe(true)
      const idx = PHASE_ORDER.indexOf(min as Phase)
      if (idx > 0) {
        expect(isFeatureUnlocked(PHASE_ORDER[idx - 1] as Phase, f)).toBe(false)
      }
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
    expect(() => assertFeatureUnlocked('plan_refinement', 'pvp')).not.toThrow()
  })
})

describe('getLabSize', () => {
  it('is small only before the lab takes on a type', () => {
    expect(getLabSize('discovery')).toBe('small')
    expect(getLabSize('literature_review')).toBe('grown')
    expect(getLabSize('plan_refinement')).toBe('grown')
    expect(getLabSize('project_development')).toBe('grown')
  })
})
