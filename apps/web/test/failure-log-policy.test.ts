import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — failure-log family (/api/failure-log/[id]/**).
 * See test/harness/route-policy.ts. The followup POST is Anthropic-backed, so
 * only its failure half runs here (all decided before the model call).
 */

import { PATCH as entryPATCH, DELETE as entryDELETE } from '@/app/api/failure-log/[id]/route'
import {
  POST as followupPOST,
  PATCH as followupPATCH,
} from '@/app/api/failure-log/[id]/followup/route'

let h: RoutePolicyHarness

const FL_A = 'failure_team_a'
const FL_B = 'failure_team_b'

beforeEach(() => {
  h = routeHarness()
  const entry = (id: string, teamId: string, authorId: string) => ({
    id,
    teamId,
    entryType: 'failure',
    happened: 'It broke',
    learned: 'Check the wiring',
    createdAt: new Date(0),
    createdById: authorId,
    createdBy: { id: authorId, name: 'Author' },
    followups: [],
  })
  h.seed('projectLog', entry(FL_A, h.ids.teamA, h.ids.studentA))
  h.seed('projectLog', entry(FL_B, h.ids.teamB, h.ids.studentB))
})

const EDIT = { body: { happened: 'Updated happened', learned: 'Updated learned' } }

describe('PATCH /api/failure-log/[id]', () => {
  it('edits its own entry', () => h.asStudentA().patch(entryPATCH, FL_A, EDIT).expect(200))
  it("404s ANOTHER team's real entry unchanged", async () => {
    await h.asStudentA().patch(entryPATCH, FL_B, EDIT).expect(404)
    expect(h.rows('projectLog').find((e) => e.id === FL_B)?.happened).toBe('It broke')
  })
  it('401s signed out', () => h.anonymous().patch(entryPATCH, FL_A, EDIT).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().patch(entryPATCH, FL_A, EDIT).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().patch(entryPATCH, FL_A, EDIT).expect(429))
})

describe('DELETE /api/failure-log/[id]', () => {
  it('deletes its own entry', async () => {
    await h.asStudentA().delete(entryDELETE, FL_A).expect(200)
    expect(h.rows('projectLog').map((e) => e.id)).toEqual([FL_B])
  })
  it("404s ANOTHER team's real entry and deletes nothing", async () => {
    await h.asStudentA().delete(entryDELETE, FL_B).expect(404)
    expect(h.rows('projectLog')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(entryDELETE, FL_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(entryDELETE, FL_A).expect(403))
})

describe('POST /api/failure-log/[id]/followup (AI)', () => {
  it("404s ANOTHER team's real entry before any model call", () =>
    h.asStudentA().post(followupPOST, FL_B).expect(404))
  it('401s signed out', () => h.anonymous().post(followupPOST, FL_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().post(followupPOST, FL_A).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(followupPOST, FL_A).expect(429))
})

describe('PATCH /api/failure-log/[id]/followup', () => {
  const ANSWER = { body: { response: 'Because the sensor drifted.' } }

  beforeEach(() => {
    // Follow-ups resolved through their parent log (relation-scoped where).
    h.seed('projectLogFollowup', {
      id: 'fu_a',
      question: 'Why?',
      response: null,
      log: { id: FL_A, teamId: h.ids.teamA, entryType: 'failure' },
    })
    h.seed('projectLogFollowup', {
      id: 'fu_b',
      question: 'Why?',
      response: null,
      log: { id: FL_B, teamId: h.ids.teamB, entryType: 'failure' },
    })
  })

  it('answers the follow-up on its own entry', () =>
    h.asStudentA().patch(followupPATCH, FL_A, ANSWER).expect(200))
  it("404s the follow-up on ANOTHER team's real entry unchanged", async () => {
    await h.asStudentA().patch(followupPATCH, FL_B, ANSWER).expect(404)
    expect(h.rows('projectLogFollowup').find((f) => f.id === 'fu_b')?.response).toBeNull()
  })
  it('401s signed out', () => h.anonymous().patch(followupPATCH, FL_A, ANSWER).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(followupPATCH, FL_A, ANSWER).expect(403))
})
