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

/**
 * REFACTOR2 §0.7 — `lib/teacher/student-overview.ts` used to pick the team with
 * this resolver and the role/join date separately, from `teamMemberships[0]`.
 * With two live memberships those disagree, and a teacher reads one team's role
 * and join date beside a different team's work.
 *
 * That is **not reachable today** — v0.48.0 made membership one-team-at-a-time
 * and `leaveOtherTeams` runs inside the join transaction (verified: no user
 * holds more than one `team_members` row). The overview now passes the whole
 * membership as this resolver's payload so the two cannot come apart at all,
 * and this is what pins that: feed it the disagreeing shape and the role must
 * follow the team.
 */
describe('pickActiveTeam carrying the membership itself', () => {
  type Membership = { teamId: string; role: 'lead' | 'member'; joinedAt: Date }
  const older: { teamId: string; team: Membership } = {
    teamId: 't-old',
    team: { teamId: 't-old', role: 'lead', joinedAt: new Date('2026-05-01') },
  }
  const newer: { teamId: string; team: Membership } = {
    teamId: 't-new',
    team: { teamId: 't-new', role: 'member', joinedAt: new Date('2026-07-20') },
  }
  // joinedAt desc, so [0] is the most recently joined — the row the old code took.
  const memberships = [newer, older]

  it('role and joinedAt come from the SAME row as the selected team', () => {
    const picked = pickActiveTeam('t-old', memberships)
    expect(picked?.teamId).toBe('t-old')
    expect(picked?.role).toBe('lead')
    expect(picked?.joinedAt).toEqual(new Date('2026-05-01'))

    // What the pre-fix pairing produced: the active team is t-old, but the role
    // and join date were read off memberships[0] — a different team entirely.
    expect(memberships[0]!.team.role).toBe('member')
    expect(memberships[0]!.teamId).not.toBe(picked?.teamId)
  })

  it('with a single membership — today’s only reachable state — both agree trivially', () => {
    const only = [older]
    expect(pickActiveTeam('t-old', only)?.role).toBe('lead')
    expect(pickActiveTeam(null, only)?.role).toBe('lead')
  })
})
