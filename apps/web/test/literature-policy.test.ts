import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — literature family (/api/literature/**).
 * See test/harness/route-policy.ts. `synthesis/[id]` runs through
 * `withTeamRoute`, so this file also exercises the wrapper's guard plumbing.
 * The AI check POST asserts its failure half only.
 */

import {
  GET as synthGET,
  PATCH as synthPATCH,
  DELETE as synthDELETE,
} from '@/app/api/literature/synthesis/[id]/route'
import { POST as checkPOST } from '@/app/api/literature/synthesis/[id]/check/route'
import { DELETE as cardDELETE } from '@/app/api/literature/vocab/cards/[id]/route'

let h: RoutePolicyHarness

const M_A = 'matrix_team_a'
const M_B = 'matrix_team_b'

beforeEach(() => {
  h = routeHarness()
  const matrix = (id: string, teamId: string) => ({
    id,
    teamId,
    title: 'Synthesis',
    columnsJson: [{ id: 'col_1', label: 'Findings' }],
    paperIds: [],
    createdByUserId: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  })
  h.seed('synthesisMatrix', matrix(M_A, h.ids.teamA))
  h.seed('synthesisMatrix', matrix(M_B, h.ids.teamB))
})

describe('GET /api/literature/synthesis/[id] (withTeamRoute)', () => {
  it('returns its own matrix', () => h.asStudentA().get(synthGET, M_A).expect(200))
  it("404s ANOTHER team's real matrix", () => h.asStudentA().get(synthGET, M_B).expect(404))
  it('401s signed out', () => h.anonymous().get(synthGET, M_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(synthGET, M_A).expect(429))
  it('403s when the phase has not unlocked literature', async () => {
    const early = routeHarness({ phase: 'discovery' })
    early.seed('synthesisMatrix', { id: M_A, teamId: early.ids.teamA, columnsJson: [], paperIds: [] })
    await early.asStudentA().get(synthGET, M_A).expect(403)
  })
})

describe('PATCH /api/literature/synthesis/[id] (withTeamRoute)', () => {
  const RENAME = { body: { title: 'Renamed' } }
  it('edits its own matrix', () => h.asStudentA().patch(synthPATCH, M_A, RENAME).expect(200))
  it("404s ANOTHER team's real matrix unchanged", async () => {
    await h.asStudentA().patch(synthPATCH, M_B, RENAME).expect(404)
    expect(h.rows('synthesisMatrix').find((m) => m.id === M_B)?.title).toBe('Synthesis')
  })
  it("400s paperIds pointing at ANOTHER team's real papers", async () => {
    h.seed('paper', { id: 'p_b1', teamId: h.ids.teamB, status: 'ready' })
    h.seed('paper', { id: 'p_b2', teamId: h.ids.teamB, status: 'ready' })
    await h
      .asStudentA()
      .patch(synthPATCH, M_A, { body: { paperIds: ['p_b1', 'p_b2'] } })
      .expect(400)
  })
  it('401s signed out', () => h.anonymous().patch(synthPATCH, M_A, RENAME).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().patch(synthPATCH, M_A, RENAME).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().patch(synthPATCH, M_A, RENAME).expect(429))
})

describe('DELETE /api/literature/synthesis/[id] (withTeamRoute)', () => {
  it('deletes its own matrix', async () => {
    await h.asStudentA().delete(synthDELETE, M_A).expect(200)
    expect(h.rows('synthesisMatrix').map((m) => m.id)).toEqual([M_B])
  })
  it("404s ANOTHER team's real matrix and deletes nothing", async () => {
    await h.asStudentA().delete(synthDELETE, M_B).expect(404)
    expect(h.rows('synthesisMatrix')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(synthDELETE, M_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(synthDELETE, M_A).expect(403))
})

describe('POST /api/literature/synthesis/[id]/check (AI)', () => {
  it("404s ANOTHER team's real matrix before any model call", () =>
    h.asStudentA().post(checkPOST, M_B).expect(404))
  it('401s signed out', () => h.anonymous().post(checkPOST, M_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().post(checkPOST, M_A).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(checkPOST, M_A).expect(429))
})

describe('DELETE /api/literature/vocab/cards/[id] (per-student scope)', () => {
  beforeEach(() => {
    h.seed('vocabCard', { id: 'card_a', userId: h.ids.studentA, teamId: h.ids.teamA, term: 'ion' })
    h.seed('vocabCard', { id: 'card_b', userId: h.ids.studentB, teamId: h.ids.teamB, term: 'ohm' })
  })
  it('deletes its own card', async () => {
    await h.asStudentA().delete(cardDELETE, 'card_a').expect(200)
    expect(h.rows('vocabCard').map((c) => c.id)).toEqual(['card_b'])
  })
  it("404s ANOTHER student's real card and deletes nothing", async () => {
    await h.asStudentA().delete(cardDELETE, 'card_b').expect(404)
    expect(h.rows('vocabCard')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(cardDELETE, 'card_a').expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(cardDELETE, 'card_a').expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().delete(cardDELETE, 'card_a').expect(429))
})
