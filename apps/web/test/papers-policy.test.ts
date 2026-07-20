import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — papers family (/api/papers/[id]/**).
 *
 * Access rules only, via the shared harness (test/harness/route-policy.ts):
 * REAL guards + rate limiter run against a mocked Clerk `auth()` and an
 * in-memory db whose queries genuinely filter by where-clause. The load-bearing
 * case in each block is the SECOND one — another team's row that truly exists,
 * the only input that tells a scoped `findFirst({ id, teamId })` apart from an
 * unscoped `findUnique({ id })`.
 *
 * AI-backed POSTs assert the failure half of the matrix only (401/403/404/429
 * are all decided before the model call); their happy paths are covered by the
 * feature tests and E2E.
 */

import { GET as paperGET, DELETE as paperDELETE } from '@/app/api/papers/[id]/route'
import { GET as fileGET } from '@/app/api/papers/[id]/file/route'
import { GET as chatGET, POST as chatPOST } from '@/app/api/papers/[id]/chat/route'
import { GET as explainGET, POST as explainPOST } from '@/app/api/papers/[id]/explain/route'
import { GET as quizGET, POST as quizPOST } from '@/app/api/papers/[id]/quiz/route'
import { POST as gradePOST } from '@/app/api/papers/[id]/quiz/grade/route'
import { GET as retryGET, POST as retryPOST } from '@/app/api/papers/[id]/quiz/retry/route'

let h: RoutePolicyHarness

const P_A = 'paper_of_team_a'
const P_B = 'paper_of_team_b'

beforeEach(() => {
  h = routeHarness()
  const paper = (id: string, teamId: string) => ({
    id,
    teamId,
    title: 'A paper',
    authors: 'Someone',
    abstract: 'Abstract',
    status: 'ready',
    fileUrl: null,
    pdfKey: null,
    pdfData: Buffer.from('%PDF-fake'),
    fullText: 'body text',
    createdAt: new Date(0),
  })
  h.seed('paper', paper(P_A, h.ids.teamA))
  h.seed('paper', paper(P_B, h.ids.teamB))
})

describe('GET /api/papers/[id]', () => {
  it('returns the paper to its own team', () => h.asStudentA().get(paperGET, P_A).expect(200))
  it("404s ANOTHER team's real paper", () => h.asStudentA().get(paperGET, P_B).expect(404))
  it('404s a nonexistent id', () =>
    h.asStudentA().get(paperGET, 'clxxxxxxxxxxxxxxxxxxxxxxx').expect(404))
  it('401s signed out', () => h.anonymous().get(paperGET, P_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(paperGET, P_A).expect(429))
})

describe('DELETE /api/papers/[id]', () => {
  it('deletes its own paper', async () => {
    await h.asStudentA().delete(paperDELETE, P_A).expect(200)
    expect(h.rows('paper').map((p) => p.id)).toEqual([P_B])
  })
  it("404s ANOTHER team's real paper and deletes nothing", async () => {
    await h.asStudentA().delete(paperDELETE, P_B).expect(404)
    expect(h.rows('paper')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(paperDELETE, P_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(paperDELETE, P_A).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().delete(paperDELETE, P_A).expect(429))
})

describe('GET /api/papers/[id]/file', () => {
  it('streams its own PDF (legacy in-DB bytes)', async () => {
    const res = await h.asStudentA().get(fileGET, P_A).response()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })
  it("404s ANOTHER team's real paper", () => h.asStudentA().get(fileGET, P_B).expect(404))
  it('401s signed out', () => h.anonymous().get(fileGET, P_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(fileGET, P_A).expect(429))
})

describe('GET /api/papers/[id]/chat', () => {
  it('returns chat history for its own paper', () => h.asStudentA().get(chatGET, P_A).expect(200))
  it("404s ANOTHER team's real paper", () => h.asStudentA().get(chatGET, P_B).expect(404))
  it('401s signed out', () => h.anonymous().get(chatGET, P_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(chatGET, P_A).expect(429))
})

describe('POST /api/papers/[id]/chat (AI)', () => {
  const body = { body: { message: 'What is this paper about?' } }
  it("404s ANOTHER team's real paper before any model call", () =>
    h.asStudentA().post(chatPOST, P_B, body).expect(404))
  it('401s signed out', () => h.anonymous().post(chatPOST, P_A, body).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().post(chatPOST, P_A, body).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(chatPOST, P_A, body).expect(429))
})

describe('GET /api/papers/[id]/explain', () => {
  it('returns explanation state for its own paper', async () => {
    const bodyA = await h.asStudentA().get(explainGET, P_A).expect(200)
    expect(bodyA).toEqual({ explanation: null })
  })
  it("does NOT serve another student's explanation as its own", async () => {
    h.seed('paperExplanation', {
      paperId: P_A,
      userId: h.ids.studentB,
      attemptCount: 1,
      bestScore: 90,
      passed: true,
      latestText: 'secret',
      latestVerdictJson: null,
    })
    const body = await h.asStudentA().get(explainGET, P_A).expect(200)
    expect(body).toEqual({ explanation: null })
  })
  it("404s ANOTHER team's real paper", () => h.asStudentA().get(explainGET, P_B).expect(404))
  it('401s signed out', () => h.anonymous().get(explainGET, P_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(explainGET, P_A).expect(429))
})

describe('POST /api/papers/[id]/explain (AI)', () => {
  const body = { body: { text: 'This paper shows that magnets attract iron because of fields.' } }
  it("404s ANOTHER team's real paper before any model call", () =>
    h.asStudentA().post(explainPOST, P_B, body).expect(404))
  it('401s signed out', () => h.anonymous().post(explainPOST, P_A, body).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(explainPOST, P_A, body).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(explainPOST, P_A, body).expect(429))
})

describe('GET /api/papers/[id]/quiz (graded-session read)', () => {
  it('returns { session: null } for its own paper with no graded session', async () => {
    const body = await h.asStudentA().get(quizGET, P_A).expect(200)
    expect(body.session).toBeNull()
  })
  it("404s ANOTHER team's real paper even when the caller owns a session on it (A2)", async () => {
    // Student A kept a graded session on team B's paper (e.g. from a former
    // active team). The active-team boundary must hide the paper entirely —
    // not return the session, and not leak its existence via a 200/null.
    h.seed('paperQuizSession', {
      id: 'sess_cross',
      paperId: P_B,
      userId: h.ids.studentA,
      gradedAt: new Date(0),
      questionsJson: [],
      answersJson: [],
    })
    await h.asStudentA().get(quizGET, P_B).expect(404)
  })
  it("404s ANOTHER student's session on another team's paper", async () => {
    h.seed('paperQuizSession', {
      id: 'sess_b',
      paperId: P_B,
      userId: h.ids.studentB,
      gradedAt: new Date(0),
      questionsJson: [],
      answersJson: [],
    })
    await h.asStudentA().get(quizGET, P_B).expect(404)
  })
  it('401s signed out', () => h.anonymous().get(quizGET, P_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(quizGET, P_A).expect(429))
})

describe('POST /api/papers/[id]/quiz (AI)', () => {
  it("404s ANOTHER team's real paper before any model call", () =>
    h.asStudentA().post(quizPOST, P_B).expect(404))
  it('401s signed out', () => h.anonymous().post(quizPOST, P_A).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().post(quizPOST, P_A).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(quizPOST, P_A).expect(429))
})

describe('POST /api/papers/[id]/quiz/grade (AI)', () => {
  const body = (sessionId: string) => ({
    body: { sessionId, answers: [{ questionId: 'q1', response: 'because' }] },
  })

  it("404s a session on ANOTHER team's paper (the post-fetch teamId check)", async () => {
    // The session's OWN keys match the caller (id + userId + paperId), so only
    // the `session.paper.teamId !== ctx.teamId` check stands between student A
    // and grading against team B's paper.
    h.seed('paperQuizSession', {
      id: 'sess_cross',
      paperId: P_B,
      userId: h.ids.studentA,
      gradedAt: null,
      questionsJson: [],
      paper: { id: P_B, teamId: h.ids.teamB, title: 'A paper', fullText: 'x', abstract: 'x' },
    })
    await h.asStudentA().post(gradePOST, P_B, body('sess_cross')).expect(404)
  })
  it("404s ANOTHER student's session", async () => {
    h.seed('paperQuizSession', {
      id: 'sess_b',
      paperId: P_B,
      userId: h.ids.studentB,
      gradedAt: null,
      questionsJson: [],
      paper: { id: P_B, teamId: h.ids.teamB, title: 'A paper', fullText: 'x', abstract: 'x' },
    })
    await h.asStudentA().post(gradePOST, P_B, body('sess_b')).expect(404)
  })
  it('401s signed out', () => h.anonymous().post(gradePOST, P_A, body('s')).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(gradePOST, P_A, body('s')).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(gradePOST, P_A, body('s')).expect(429))
})

describe('/api/papers/[id]/quiz/retry (AI, scoping delegated to quiz-retry service)', () => {
  it("GET 404s a session on ANOTHER team's paper", async () => {
    h.seed('paperQuizSession', {
      id: 'sess_b',
      paperId: P_B,
      userId: h.ids.studentB,
      gradedAt: new Date(0),
      questionsJson: [],
      paper: { id: P_B, teamId: h.ids.teamB },
    })
    await h.asStudentA().get(retryGET, P_B, { query: { sessionId: 'sess_b' } }).expect(404)
  })
  it('GET 401s signed out', () =>
    h.anonymous().get(retryGET, P_A, { query: { sessionId: 's' } }).expect(401))
  it('GET 429s over the tier', () =>
    h.asStudentA().overLimit().get(retryGET, P_A, { query: { sessionId: 's' } }).expect(429))
  it('POST 401s signed out', () =>
    h
      .anonymous()
      .post(retryPOST, P_A, { body: { sessionId: 's', answers: [{ questionId: 'q1' }] } })
      .expect(401))
  it('POST 403s cross-origin', () =>
    h
      .asStudentA()
      .crossOrigin()
      .post(retryPOST, P_A, { body: { sessionId: 's', answers: [{ questionId: 'q1' }] } })
      .expect(403))
})
