import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — discovery family (/api/discovery/**).
 * See test/harness/route-policy.ts.
 *
 * Happy paths that would leave the process (promote → advisory lock + possible
 * Anthropic; citations → OpenAlex/PubMed/arXiv/S2) are left to the feature
 * tests and E2E; every access decision below is made BEFORE those calls.
 */

import { POST as promotePOST } from '@/app/api/discovery/source/[id]/promote/route'
import { GET as citationsGET } from '@/app/api/discovery/sources/[id]/citations/route'
import { PATCH as reflectionPATCH } from '@/app/api/discovery/sources/[id]/reflection/route'
import { PATCH as treePATCH, DELETE as treeDELETE } from '@/app/api/discovery/tree/[id]/route'

let h: RoutePolicyHarness

const SRC_A = 'node_source_team_a'
const SRC_B = 'node_source_team_b'

beforeEach(() => {
  h = routeHarness()
  const source = (id: string, teamId: string, esId: string) => ({
    id,
    teamId,
    sourceType: 'source',
    parentId: null,
    paperId: null,
    starred: false,
    interestLevel: null,
    title: 'A source',
    externalSource: {
      id: esId,
      title: 'A source',
      authors: 'Someone',
      year: 2020,
      abstract: 'Abstract',
      url: 'https://example.test/x',
      reflection: null,
      credibilityTier: null,
    },
  })
  h.seed('discoveryNode', source(SRC_A, h.ids.teamA, 'es_a'))
  h.seed('discoveryNode', source(SRC_B, h.ids.teamB, 'es_b'))
  h.seed('externalSource', { id: 'es_a', reflection: null, credibilityTier: null })
  h.seed('externalSource', { id: 'es_b', reflection: null, credibilityTier: null })
})

describe('POST /api/discovery/source/[id]/promote', () => {
  const BODY = { body: {} }
  it("404s ANOTHER team's real source node", () =>
    h.asStudentA().post(promotePOST, SRC_B, BODY).expect(404))
  it('401s signed out', () => h.anonymous().post(promotePOST, SRC_A, BODY).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(promotePOST, SRC_A, BODY).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(promotePOST, SRC_A, BODY).expect(429))
})

describe('GET /api/discovery/sources/[id]/citations', () => {
  it("404s ANOTHER team's real source node before any external fetch", () =>
    h.asStudentA().get(citationsGET, SRC_B).expect(404))
  it('401s signed out', () => h.anonymous().get(citationsGET, SRC_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(citationsGET, SRC_A).expect(429))
})

describe('PATCH /api/discovery/sources/[id]/reflection', () => {
  const BODY = { body: { reflection: 'ok' } }
  it('saves a reflection on its own source', () =>
    h.asStudentA().patch(reflectionPATCH, SRC_A, BODY).expect(200))
  it("404s ANOTHER team's real source unchanged", async () => {
    await h.asStudentA().patch(reflectionPATCH, SRC_B, BODY).expect(404)
    expect(h.rows('externalSource').find((s) => s.id === 'es_b')?.reflection).toBeNull()
  })
  it('401s signed out', () => h.anonymous().patch(reflectionPATCH, SRC_A, BODY).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(reflectionPATCH, SRC_A, BODY).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().patch(reflectionPATCH, SRC_A, BODY).expect(429))
})

describe('PATCH /api/discovery/tree/[id]', () => {
  const STAR = { body: { starred: true } }
  it('stars its own node', () => h.asStudentA().patch(treePATCH, SRC_A, STAR).expect(200))
  it("404s ANOTHER team's real node unchanged", async () => {
    await h.asStudentA().patch(treePATCH, SRC_B, STAR).expect(404)
    expect(h.rows('discoveryNode').find((n) => n.id === SRC_B)?.starred).toBe(false)
  })
  it('401s signed out', () => h.anonymous().patch(treePATCH, SRC_A, STAR).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(treePATCH, SRC_A, STAR).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().patch(treePATCH, SRC_A, STAR).expect(429))
})

describe('DELETE /api/discovery/tree/[id]', () => {
  it('deletes its own subtree', async () => {
    h.seed('discoveryNode', { id: 'child_a', teamId: h.ids.teamA, parentId: SRC_A, sourceType: 'topic' })
    await h.asStudentA().delete(treeDELETE, SRC_A).expect(200)
    const remaining = h.rows('discoveryNode').map((n) => n.id)
    expect(remaining).not.toContain(SRC_A)
    expect(remaining).not.toContain('child_a')
    expect(remaining).toContain(SRC_B)
  })
  it("404s ANOTHER team's real node and deletes nothing", async () => {
    await h.asStudentA().delete(treeDELETE, SRC_B).expect(404)
    expect(h.rows('discoveryNode')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(treeDELETE, SRC_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(treeDELETE, SRC_A).expect(403))
})
