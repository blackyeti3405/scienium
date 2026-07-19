import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — project-log family (/api/project-log/[id]/**).
 * See test/harness/route-policy.ts. The PATCH happy path resolves attachment
 * keys through the storage ledger, so it stays with the feature tests; every
 * access decision below happens before that.
 */

import { PATCH as entryPATCH, DELETE as entryDELETE } from '@/app/api/project-log/[id]/route'
import {
  POST as referencePOST,
  DELETE as referenceDELETE,
} from '@/app/api/project-log/[id]/references/route'

let h: RoutePolicyHarness

const LOG_A = 'progress_team_a'
const LOG_A2 = 'progress_team_a_2'
const LOG_B = 'progress_team_b'

beforeEach(() => {
  h = routeHarness()
  const entry = (id: string, teamId: string, authorId: string) => ({
    id,
    teamId,
    entryType: 'progress',
    body: 'Did things',
    nextSteps: 'More things',
    stage: 'Experimenting',
    attachmentUrls: [],
    createdAt: new Date(0),
    createdById: authorId,
    createdBy: { id: authorId, name: 'Author' },
  })
  h.seed('projectLog', entry(LOG_A, h.ids.teamA, h.ids.studentA))
  h.seed('projectLog', entry(LOG_A2, h.ids.teamA, h.ids.studentA))
  h.seed('projectLog', entry(LOG_B, h.ids.teamB, h.ids.studentB))
})

const EDIT = {
  body: {
    body: 'Updated',
    nextSteps: 'Next',
    stage: 'Analyzing',
    attachmentUrls: ['/api/project-log/attachment/view/some-key'],
  },
}

describe('PATCH /api/project-log/[id]', () => {
  it("404s ANOTHER team's real entry unchanged", async () => {
    await h.asStudentA().patch(entryPATCH, LOG_B, EDIT).expect(404)
    expect(h.rows('projectLog').find((e) => e.id === LOG_B)?.body).toBe('Did things')
  })
  it('401s signed out', () => h.anonymous().patch(entryPATCH, LOG_A, EDIT).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().patch(entryPATCH, LOG_A, EDIT).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().patch(entryPATCH, LOG_A, EDIT).expect(429))
})

describe('DELETE /api/project-log/[id]', () => {
  it('deletes its own entry', async () => {
    await h.asStudentA().delete(entryDELETE, LOG_A).expect(200)
    expect(h.rows('projectLog').map((e) => e.id)).toEqual([LOG_A2, LOG_B])
  })
  it("404s ANOTHER team's real entry and deletes nothing", async () => {
    await h.asStudentA().delete(entryDELETE, LOG_B).expect(404)
    expect(h.rows('projectLog')).toHaveLength(3)
  })
  it('401s signed out', () => h.anonymous().delete(entryDELETE, LOG_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(entryDELETE, LOG_A).expect(403))
})

describe('POST /api/project-log/[id]/references', () => {
  it('links two of its own entries', async () => {
    await h.asStudentA().post(referencePOST, LOG_A, { body: { targetId: LOG_A2 } }).expect(201)
    expect(h.rows('projectLogReference')).toHaveLength(1)
  })
  it("404s when the SOURCE is ANOTHER team's real entry", async () => {
    await h.asStudentA().post(referencePOST, LOG_B, { body: { targetId: LOG_A } }).expect(404)
    expect(h.rows('projectLogReference')).toHaveLength(0)
  })
  it("404s when the TARGET is ANOTHER team's real entry", async () => {
    await h.asStudentA().post(referencePOST, LOG_A, { body: { targetId: LOG_B } }).expect(404)
    expect(h.rows('projectLogReference')).toHaveLength(0)
  })
  it('401s signed out', () =>
    h.anonymous().post(referencePOST, LOG_A, { body: { targetId: LOG_A2 } }).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(referencePOST, LOG_A, { body: { targetId: LOG_A2 } }).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(referencePOST, LOG_A, { body: { targetId: LOG_A2 } }).expect(429))
})

describe('DELETE /api/project-log/[id]/references', () => {
  it("404s when the source entry is ANOTHER team's", () =>
    h.asStudentA().delete(referenceDELETE, LOG_B, { query: { targetId: LOG_A } }).expect(404))
  it('401s signed out', () =>
    h.anonymous().delete(referenceDELETE, LOG_A, { query: { targetId: LOG_A2 } }).expect(401))
})
