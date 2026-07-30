import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — PvP family (/api/pvp/**). See test/harness/route-policy.ts.
 * The scope rule under test: raids may only target a DIFFERENT team in the
 * attacker's OWN class (matchmaking only offers those, but start_raid takes the
 * opponent ID from the request body), and a raid may only be acted on by its
 * attacker. Leaderboard reads are class-scoped.
 */

import { POST as pvpPOST } from '@/app/api/pvp/route'
import { POST as actionPOST } from '@/app/api/pvp/[battleId]/action/route'
import { GET as leaderboardGET } from '@/app/api/pvp/leaderboard/route'

let h: RoutePolicyHarness

const RAID_A = 'raid_team_a'
const RAID_B = 'raid_team_b'
const CLASSMATE = 'teamA2'

beforeEach(() => {
  h = routeHarness()
  // The routes read Team.classId as a scalar; the fixture teams only carry
  // class membership on their members — decorate the scalar in place.
  for (const t of h.rows('team')) {
    t.classId = t.id === h.ids.teamA ? h.ids.classA : h.ids.classB
  }
  // A classmate of Team A — the only legitimate raid target.
  h.seed('team', {
    id: CLASSMATE,
    name: 'Team A2',
    phase: 'showcase',
    labType: 'volt_lab',
    classId: h.ids.classA,
    members: [],
  })
  const raid = (id: string, attackerTeamId: string) => ({
    id,
    attackerTeamId,
    defenderTeamId: CLASSMATE,
    startedAt: new Date(),
    endedAt: null,
    raidLogJson: { spellsAvailable: [], defenderBase: [], castEvents: [], lastCastTs: 0 },
  })
  h.seed('pvpRaid', raid(RAID_A, h.ids.teamA))
  h.seed('pvpRaid', raid(RAID_B, h.ids.teamB))
  h.seed('pvpTrophies', {
    teamId: h.ids.teamA,
    currentTrophies: 12,
    team: { classId: h.ids.classA, name: 'Team A', labType: 'volt_lab' },
  })
  h.seed('pvpTrophies', {
    teamId: h.ids.teamB,
    currentTrophies: 99,
    team: { classId: h.ids.classB, name: 'Team B', labType: 'volt_lab' },
  })
})

const start = (opponentTeamId: string) => ({ body: { action: 'start_raid', opponentTeamId } })

describe('POST /api/pvp (start_raid)', () => {
  it('raids a classmate team', async () => {
    await h.asStudentA().post(pvpPOST, undefined, start(CLASSMATE)).expect(200)
    const created = h.rows('pvpRaid').filter((r) => r.attackerTeamId === h.ids.teamA)
    expect(created).toHaveLength(2) // fixture raid + the new one
  })
  it("403s a team in ANOTHER class and creates no raid", async () => {
    await h.asStudentA().post(pvpPOST, undefined, start(h.ids.teamB)).expect(403)
    expect(h.rows('pvpRaid')).toHaveLength(2)
  })
  it('403s raiding itself', () =>
    h.asStudentA().post(pvpPOST, undefined, start(h.ids.teamA)).expect(403))
  it('401s signed out', () => h.anonymous().post(pvpPOST, undefined, start(CLASSMATE)).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(pvpPOST, undefined, start(CLASSMATE)).expect(403))
})

const CAST = { body: { action: 'cast_spell', spellId: 's1', x: 0, y: 0, clientTs: 1 } }

describe('POST /api/pvp/[battleId]/action', () => {
  it("403s ANOTHER team's raid unchanged", async () => {
    await h.asStudentA().post(actionPOST, { battleId: RAID_B }, CAST).expect(403)
    expect(h.rows('pvpRaid').find((r) => r.id === RAID_B)?.endedAt).toBeNull()
  })
  it('404s a raid that does not exist', () =>
    h.asStudentA().post(actionPOST, { battleId: 'nope' }, CAST).expect(404))
  it('401s signed out', () =>
    h.anonymous().post(actionPOST, { battleId: RAID_A }, CAST).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(actionPOST, { battleId: RAID_A }, CAST).expect(403))
})

describe('GET /api/pvp/leaderboard', () => {
  it("returns ONLY the caller's class rankings", async () => {
    const res = await h.asStudentA().get(leaderboardGET).expect(200)
    expect(res.rankings.map((r: { teamId: string }) => r.teamId)).toEqual([h.ids.teamA])
  })
  it('401s signed out', () => h.anonymous().get(leaderboardGET).expect(401))
})
