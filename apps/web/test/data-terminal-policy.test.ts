import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — data-terminal family (/api/data-terminal/[id]/**).
 * See test/harness/route-policy.ts. Both routes gate on feature
 * `data_terminal`, so this family also carries the phase-gate 403 case.
 */

import {
  GET as measurementsGET,
  POST as measurementsPOST,
  DELETE as measurementsDELETE,
} from '@/app/api/data-terminal/[id]/measurements/route'
import { PATCH as experimentPATCH, DELETE as experimentDELETE } from '@/app/api/data-terminal/[id]/route'

let h: RoutePolicyHarness

const EXP_A = 'exp_of_team_a'
const EXP_B = 'exp_of_team_b'

function seedExperiments(harness: RoutePolicyHarness) {
  const exp = (id: string, teamId: string) => ({
    id,
    teamId,
    title: 'Trial 1',
    description: null,
    xLabel: 'x',
    yLabel: 'y',
    createdAt: new Date(0),
  })
  harness.seed('experiment', exp(EXP_A, harness.ids.teamA))
  harness.seed('experiment', exp(EXP_B, harness.ids.teamB))
}

beforeEach(() => {
  h = routeHarness()
  seedExperiments(h)
})

const POINTS = { body: { points: [{ x: 0, y: 0 }] } }

describe('GET /api/data-terminal/[id]/measurements', () => {
  it('returns measurements for its own experiment', () =>
    h.asStudentA().get(measurementsGET, EXP_A).expect(200))
  it("404s ANOTHER team's real experiment", () =>
    h.asStudentA().get(measurementsGET, EXP_B).expect(404))
  it('401s signed out', () => h.anonymous().get(measurementsGET, EXP_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(measurementsGET, EXP_A).expect(429))
  it('403s when the phase has not unlocked data_terminal', async () => {
    const early = routeHarness({ phase: 'discovery' })
    seedExperiments(early)
    await early.asStudentA().get(measurementsGET, EXP_A).expect(403)
  })
})

describe('POST /api/data-terminal/[id]/measurements', () => {
  it('adds points to its own experiment', () =>
    h.asStudentA().post(measurementsPOST, EXP_A, POINTS).expect(200))
  it("404s ANOTHER team's real experiment and writes nothing", async () => {
    await h.asStudentA().post(measurementsPOST, EXP_B, POINTS).expect(404)
    expect(h.rows('measurement')).toHaveLength(0)
  })
  it('401s signed out', () => h.anonymous().post(measurementsPOST, EXP_A, POINTS).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(measurementsPOST, EXP_A, POINTS).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(measurementsPOST, EXP_A, POINTS).expect(429))
})

describe('DELETE /api/data-terminal/[id]/measurements', () => {
  it("scopes the delete to the experiment — ANOTHER team's experiment 404s first", async () => {
    h.seed('measurement', { id: 'm_b', experimentId: EXP_B, x: 1, y: 1 })
    await h
      .asStudentA()
      .delete(measurementsDELETE, EXP_B, { query: { measurementId: 'm_b' } })
      .expect(404)
    expect(h.rows('measurement')).toHaveLength(1)
  })
  it('deletes its own measurement', async () => {
    h.seed('measurement', { id: 'm_a', experimentId: EXP_A, x: 1, y: 1 })
    await h
      .asStudentA()
      .delete(measurementsDELETE, EXP_A, { query: { measurementId: 'm_a' } })
      .expect(200)
    expect(h.rows('measurement')).toHaveLength(0)
  })
  it('401s signed out', () =>
    h.anonymous().delete(measurementsDELETE, EXP_A, { query: { measurementId: 'm' } }).expect(401))
})

describe('PATCH /api/data-terminal/[id]', () => {
  const RENAME = { body: { title: 'Renamed' } }
  it('updates its own experiment', () =>
    h.asStudentA().patch(experimentPATCH, EXP_A, RENAME).expect(200))
  it("404s ANOTHER team's real experiment unchanged", async () => {
    await h.asStudentA().patch(experimentPATCH, EXP_B, RENAME).expect(404)
    expect(h.rows('experiment').find((e) => e.id === EXP_B)?.title).toBe('Trial 1')
  })
  it('401s signed out', () => h.anonymous().patch(experimentPATCH, EXP_A, RENAME).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(experimentPATCH, EXP_A, RENAME).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().patch(experimentPATCH, EXP_A, RENAME).expect(429))
})

describe('DELETE /api/data-terminal/[id]', () => {
  it('deletes its own experiment and its measurements', async () => {
    h.seed('measurement', { id: 'm_a', experimentId: EXP_A, x: 1, y: 1 })
    await h.asStudentA().delete(experimentDELETE, EXP_A).expect(200)
    expect(h.rows('experiment').map((e) => e.id)).toEqual([EXP_B])
    expect(h.rows('measurement')).toHaveLength(0)
  })
  it("404s ANOTHER team's real experiment and deletes nothing", async () => {
    await h.asStudentA().delete(experimentDELETE, EXP_B).expect(404)
    expect(h.rows('experiment')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(experimentDELETE, EXP_A).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().delete(experimentDELETE, EXP_A).expect(403))
})
