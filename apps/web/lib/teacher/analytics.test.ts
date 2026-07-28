import { describe, expect, it } from 'vitest'
import {
  computeKpDistribution,
  computePhaseCounts,
  computePhasePacing,
  computeTeamProficiency,
  dedupeScopedTeams,
  type ScopedTeam,
} from './analytics'

/**
 * The teacher-reports computation seam. The module extracted these as pure
 * functions "so the computations get a test seam" — this file is that seam
 * being used. The headline case is the per-paper rollup in
 * `computeTeamProficiency`: it exists to fix a documented team-size inflation
 * bug, and teacher reports have no error signal — a regression just shows the
 * pilot teacher wrong numbers.
 */

function team(
  id: string,
  phase = 'literature_review',
  createdAt = new Date(),
  phaseEnteredAt: Date | null = null,
): ScopedTeam {
  return { id, name: `Team ${id}`, phase: phase as ScopedTeam['phase'], createdAt, phaseEnteredAt }
}

const T1 = team('t1')

describe('computeTeamProficiency — per-paper rollup (the inflation fix)', () => {
  it('a 3-member team with one mastered paper reports 1 mastered, not 3', () => {
    const rows = ['u1', 'u2', 'u3'].map(() => ({
      paperId: 'paper_A',
      demonstrated: true,
      bestScore: 90,
      paper: { teamId: 't1' },
    }))
    const [out] = computeTeamProficiency([T1], rows)
    expect(out.papersMastered).toBe(1)
    expect(out.papersInProgress).toBe(0)
  })

  it('demonstrated is OR across members', () => {
    const rows = [
      { paperId: 'paper_A', demonstrated: false, bestScore: 40, paper: { teamId: 't1' } },
      { paperId: 'paper_A', demonstrated: true, bestScore: 85, paper: { teamId: 't1' } },
    ]
    const [out] = computeTeamProficiency([T1], rows)
    expect(out.papersMastered).toBe(1) // one member demonstrating is enough
    expect(out.papersInProgress).toBe(0)
  })

  it('the rollup takes the MAX score across members (not min/first)', () => {
    // Neither member demonstrated; one has touched it (40), one has not (0).
    // A max-rollup sees bestScore 40 > 0 → in-progress. A min/first rollup
    // that landed on the 0 row would report the paper as untouched.
    const rows = [
      { paperId: 'paper_A', demonstrated: false, bestScore: 0, paper: { teamId: 't1' } },
      { paperId: 'paper_A', demonstrated: false, bestScore: 40, paper: { teamId: 't1' } },
    ]
    const [out] = computeTeamProficiency([T1], rows)
    expect(out.papersInProgress).toBe(1)
  })

  it('in-progress = touched (score > 0) but not demonstrated by anyone', () => {
    const rows = [
      { paperId: 'paper_A', demonstrated: false, bestScore: 40, paper: { teamId: 't1' } },
      { paperId: 'paper_B', demonstrated: false, bestScore: 0, paper: { teamId: 't1' } },
    ]
    const [out] = computeTeamProficiency([T1], rows)
    expect(out.papersInProgress).toBe(1) // paper_B untouched, doesn't count
  })

  it('avgBestScore excludes zero scores and stays a per-ROW mean', () => {
    const rows = [
      { paperId: 'paper_A', demonstrated: false, bestScore: 80, paper: { teamId: 't1' } },
      { paperId: 'paper_A', demonstrated: false, bestScore: 60, paper: { teamId: 't1' } },
      { paperId: 'paper_B', demonstrated: false, bestScore: 0, paper: { teamId: 't1' } },
    ]
    const [out] = computeTeamProficiency([T1], rows)
    expect(out.avgBestScore).toBe(70) // (80+60)/2 — the 0 row is excluded
  })

  it('a team with no rows reports zeros, not NaN', () => {
    const [out] = computeTeamProficiency([T1], [])
    expect(out).toMatchObject({ papersMastered: 0, papersInProgress: 0, avgBestScore: 0 })
  })

  it("rows never bleed across teams", () => {
    const rows = [
      { paperId: 'paper_A', demonstrated: true, bestScore: 90, paper: { teamId: 't1' } },
      { paperId: 'paper_B', demonstrated: true, bestScore: 90, paper: { teamId: 't2' } },
    ]
    const [t1, t2] = computeTeamProficiency([T1, team('t2')], rows)
    expect(t1.papersMastered).toBe(1)
    expect(t2.papersMastered).toBe(1)
  })
})

describe('dedupeScopedTeams — membership-backed selection (P2-S14)', () => {
  const row = (id: string) => ({
    id,
    name: `T${id}`,
    phase: 'discovery',
    createdAt: new Date(),
    phaseEnteredAt: null,
    classId: null,
  })

  it('two students on the same team yield one team', () => {
    const t = row('t1')
    const out = dedupeScopedTeams([
      { activeTeamId: 't1', teamMemberships: [{ teamId: 't1', team: t }] },
      { activeTeamId: 't1', teamMemberships: [{ teamId: 't1', team: t }] },
    ])
    expect(out).toHaveLength(1)
  })

  it('falls back to the newest membership when activeTeamId is null; skips teamless students', () => {
    const out = dedupeScopedTeams([
      { activeTeamId: null, teamMemberships: [{ teamId: 't1', team: row('t1') }] },
      { activeTeamId: null, teamMemberships: [] },
    ])
    expect(out.map((x) => x.id)).toEqual(['t1'])
  })

  /**
   * THE ATTACK. `activeTeamId` survives paths that do not clear it, and the
   * report used to read the `activeTeam` RELATION — the id resolved with no
   * membership check. Every aggregate in the reports route is keyed on the ids
   * this returns, so a stale pointer put another lab's KP and proficiency into
   * a teacher's class report. Only teams the student is really a member of may
   * come back.
   */
  it('a stale activeTeamId with no membership row cannot enter the report', () => {
    const out = dedupeScopedTeams([
      { activeTeamId: 'other-school-team', teamMemberships: [{ teamId: 't1', team: row('t1') }] },
    ])
    expect(out.map((x) => x.id)).toEqual(['t1'])
  })

  it('a student with a stale pointer and NO memberships contributes no team at all', () => {
    const out = dedupeScopedTeams([{ activeTeamId: 'other-school-team', teamMemberships: [] }])
    expect(out).toEqual([])
  })
})

describe('computePhaseCounts / computeKpDistribution / computePhasePacing', () => {
  it('counts teams per phase', () => {
    const out = computePhaseCounts([team('a', 'discovery'), team('b', 'discovery'), team('c', 'working')])
    expect(out).toEqual({ discovery: 2, working: 1 })
  })

  it('KP histogram returns every bucket, zero-filled', () => {
    const out = computeKpDistribution([{ kp: 0 }, { kp: 50 }])
    expect(out.reduce((n, b) => n + b.count, 0)).toBe(2)
    // Every bucket label present even when empty — the chart relies on it.
    expect(out.every((b) => typeof b.label === 'string' && b.count >= 0)).toBe(true)
  })

  it('pacing sorts oldest team first (most days) and floors at 0 for today', () => {
    const old = team('old', 'working', new Date(Date.now() - 10 * 24 * 3600 * 1000))
    const fresh = team('new', 'discovery', new Date())
    const out = computePhasePacing([fresh, old])
    expect(out[0].teamId).toBe('old')
    expect(out[0].daysInPhase).toBeGreaterThanOrEqual(9)
    expect(out[1].daysInPhase).toBe(0)
  })

  /**
   * THE ATTACK (P2-S14): `daysInPhase` was days since the team was CREATED. A
   * month-old lab that advanced this morning was reported as a month behind in
   * its current phase, and the teacher's "who is stuck" ranking is that number.
   */
  it('a month-old team that entered its phase TODAY reports 0 days, not 30', () => {
    const t = team('t', 'working', new Date(Date.now() - 30 * 864e5), new Date())
    expect(computePhasePacing([t])[0].daysInPhase).toBe(0)
  })

  it('a team that has SAT in one phase for a month still reports 30 days', () => {
    const month = new Date(Date.now() - 30 * 864e5)
    const t = team('t', 'working', new Date(Date.now() - 60 * 864e5), month)
    expect(computePhasePacing([t])[0].daysInPhase).toBe(30)
  })

  it('a row predating the column falls back to createdAt (the pre-migration reading)', () => {
    const t = team('t', 'working', new Date(Date.now() - 12 * 864e5), null)
    expect(computePhasePacing([t])[0].daysInPhase).toBe(12)
  })
})
