import { describe, it, expect } from 'vitest'
import {
  LITERATURE_BONUS_KP_PER_MEMBER,
  LITERATURE_TIERS,
  literatureTargetFor,
} from '@/lib/team/advance'
import { PHASE_ORDER, type Phase } from '@/lib/phase'

/**
 * The literature review used to be ONE gate at 25 sources with every member
 * proficient. It is now three milestones, and which one is live depends on the
 * phase the team is sitting in. These pin the mapping so the route, the progress
 * affordance and the server check cannot drift apart — they all read
 * `literatureTargetFor`.
 */

describe('literature tiers', () => {
  it('rises 10 → 20 → 25 and never reorders', () => {
    expect(LITERATURE_TIERS.idea).toBe(10)
    expect(LITERATURE_TIERS.projectDevelopment).toBe(20)
    expect(LITERATURE_TIERS.bonus).toBe(25)
    expect(LITERATURE_TIERS.idea).toBeLessThan(LITERATURE_TIERS.projectDevelopment)
    expect(LITERATURE_TIERS.projectDevelopment).toBeLessThan(LITERATURE_TIERS.bonus)
  })

  it('maps each phase to the tier that gates leaving it', () => {
    expect(literatureTargetFor('literature_review')).toBe(LITERATURE_TIERS.idea)
    expect(literatureTargetFor('plan_refinement')).toBe(LITERATURE_TIERS.projectDevelopment)
  })

  it('has no literature gate on the phases that are not earned by reading', () => {
    // discovery is left by locking a topic; project_development is the last
    // phase. A non-null target on either would put a source count in front of a
    // transition that has nothing to do with sources.
    expect(literatureTargetFor('discovery')).toBeNull()
    expect(literatureTargetFor('project_development')).toBeNull()
  })

  it('defines a target for every phase or explicitly none — no undefined', () => {
    // Guards the gap a new phase would open: an unhandled phase falling through
    // to `undefined` would read as "no gate" by accident rather than by choice.
    for (const p of PHASE_ORDER) {
      const t = literatureTargetFor(p as Phase)
      expect(t === null || typeof t === 'number').toBe(true)
    }
  })

  it('pays the bonus per member, not per team', () => {
    expect(LITERATURE_BONUS_KP_PER_MEMBER).toBe(5000)
    // A 3-student lab does 3x the proficiency work for the same 25 sources, and
    // building costs scale with lab size, so the payout scales too.
    expect(LITERATURE_BONUS_KP_PER_MEMBER * 3).toBe(15000)
  })
})
