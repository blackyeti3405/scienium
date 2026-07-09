import { describe, it, expect } from 'vitest'
import { pickActiveTeam } from '@/lib/team/active-team'

/**
 * The Phase 1 ownership invariant: a stored activeTeamId is honored only when a
 * TeamMember row backs it. A forged/stale activeTeamId must never surface a team
 * the user does not belong to — the resolver only ever returns one of the user's
 * own memberships.
 */
describe('pickActiveTeam', () => {
  const a = { teamId: 't-a', team: { id: 't-a' } }
  const b = { teamId: 't-b', team: { id: 't-b' } }
  // Ordered joinedAt desc, so [0] is the most recently joined.
  const memberships = [b, a]

  it('returns the active team when a membership backs the activeTeamId', () => {
    expect(pickActiveTeam('t-a', memberships)?.id).toBe('t-a')
  })

  it('ignores a forged activeTeamId with no backing membership and falls back to the newest team', () => {
    // 't-x' is a team the user is NOT a member of — must not be returned.
    expect(pickActiveTeam('t-x', memberships)?.id).toBe('t-b')
  })

  it('falls back to the most recently joined team when activeTeamId is unset', () => {
    expect(pickActiveTeam(null, memberships)?.id).toBe('t-b')
    expect(pickActiveTeam(undefined, memberships)?.id).toBe('t-b')
  })

  it('returns null for a user with no memberships regardless of activeTeamId', () => {
    expect(pickActiveTeam('t-a', [])).toBeNull()
    expect(pickActiveTeam(null, [])).toBeNull()
  })
})
