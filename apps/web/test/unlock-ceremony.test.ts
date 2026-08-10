import { describe, it, expect } from 'vitest'
import { pendingUnlock, gatewaysUnlockedAt, STARTING_GATEWAYS } from '@/lib/gateways'
import type { Phase } from '@/lib/phase'

/**
 * The ceremony is DERIVED, not queued — which is what makes it survive a reload
 * without any in-flight state. These pin the derivation, including the two ways
 * it must go quiet: the student placed the building, or acknowledged the phase.
 */
const none = new Set<string>()

describe('unlock ceremony', () => {
  it('a brand-new lab is owed nothing — its gateways are already standing', () => {
    const placed = new Set(STARTING_GATEWAYS.map((g) => g.key))
    expect(pendingUnlock('discovery', placed, null)).toBeNull()
  })

  it('announces the gateway a phase unlocks', () => {
    const got = pendingUnlock('literature_review', none, null)
    expect(got?.keys).toContain('literature_review')
    expect(got?.keys).toContain('pvp')
  })

  it('announces every gateway a phase unlocks in ONE ceremony, not one each', () => {
    // literature_review is the multi-building case: the Literature Review AND
    // the Battle Arena arrive together and must be announced once.
    const got = pendingUnlock('literature_review', none, null)
    expect(got?.keys.length).toBe(2)
  })

  it('project_development unlocks the Showcase alone', () => {
    // Moving the Battle Arena forward to literature_review left this phase with
    // one gateway. The rest of what it grants (Field Codex, Proof of Expertise,
    // Data Terminal) are Operations Hub TABS, not buildings, so they are not
    // part of the ceremony.
    const got = pendingUnlock('project_development', none, null)
    expect(got?.keys).toEqual(['showcase'])
  })

  it('goes quiet once the phase is acknowledged', () => {
    expect(pendingUnlock('literature_review', none, 'literature_review')).toBeNull()
  })

  it('an ack for an EARLIER phase does not silence a later unlock', () => {
    // Stamping the phase rather than a boolean is the whole point: a student who
    // dismissed the literature_review ceremony must still get the next one.
    const got = pendingUnlock('project_development', none, 'literature_review' as Phase)
    expect(got).not.toBeNull()
  })

  it('goes quiet once every unlocked gateway is placed, even unacknowledged', () => {
    const placed = new Set(gatewaysUnlockedAt('literature_review').map((g) => g.key))
    expect(pendingUnlock('literature_review', placed, null)).toBeNull()
  })

  it('still announces the rest when only one of two is placed', () => {
    const [first] = gatewaysUnlockedAt('literature_review')
    const got = pendingUnlock('literature_review', new Set([first.key]), null)
    expect(got?.keys.length).toBe(1)
    expect(got?.keys).not.toContain(first.key)
  })
})
