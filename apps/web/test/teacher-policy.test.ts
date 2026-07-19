import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — teacher family (/api/teacher/**), behind
 * `requireTeacher` + class scoping. See test/harness/route-policy.ts.
 *
 * The teacher matrix has an extra axis the student one lacks: a signed-in
 * NON-teacher must 403, and a REAL teacher who owns a different class must
 * 404 on the student/class (never see that it exists). Teacher A owns class A
 * (student A's class); teacher B owns class B.
 */

import { POST as codePOST } from '@/app/api/teacher/class/[id]/code/route'
import { POST as requestPOST } from '@/app/api/teacher/class/requests/[id]/route'
import { GET as studentGET } from '@/app/api/teacher/student/[id]/route'
import { GET as overviewGET } from '@/app/api/teacher/student/[id]/overview/route'
import { GET as litGET } from '@/app/api/teacher/student/[id]/literature/[paperId]/route'
import { GET as litFileGET } from '@/app/api/teacher/student/[id]/literature/[paperId]/file/route'

let h: RoutePolicyHarness
/** A team-less student in class A — exercises the `team: null` 200 branch
 *  without the deep roster aggregation queries. */
const LONER = 'student_no_team'

beforeEach(() => {
  h = routeHarness()
  h.seed('user', {
    id: LONER,
    clerkUserId: 'clerk_loner',
    name: 'Loner',
    email: 'loner@example.test',
    role: 'student',
    classId: h.ids.classA,
    activeTeamId: null,
    teamMemberships: [],
  })
})

describe('POST /api/teacher/class/[id]/code', () => {
  it('regenerates the join code for an OWNED class', async () => {
    const before = h.rows('class').find((c) => c.id === h.ids.classA)?.joinCode
    await h.asTeacherA().post(codePOST, h.ids.classA).expect(200)
    const after = h.rows('class').find((c) => c.id === h.ids.classA)?.joinCode
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })
  it("404s ANOTHER teacher's real class unchanged", async () => {
    await h.asTeacherB().post(codePOST, h.ids.classA).expect(404)
    expect(h.rows('class').find((c) => c.id === h.ids.classA)?.joinCode).toBeUndefined()
  })
  it('403s a signed-in student', () => h.asStudentA().post(codePOST, h.ids.classA).expect(403))
  it('401s signed out', () => h.anonymous().post(codePOST, h.ids.classA).expect(401))
  it('403s cross-origin', () => h.asTeacherA().crossOrigin().post(codePOST, h.ids.classA).expect(403))
  it('429s over the tier', () => h.asTeacherA().overLimit().post(codePOST, h.ids.classA).expect(429))
})

describe('POST /api/teacher/class/requests/[id]', () => {
  const DENY = { body: { decision: 'deny' } }
  beforeEach(() => {
    h.seed('classJoinRequest', {
      id: 'req_a',
      status: 'pending',
      userId: LONER,
      classId: h.ids.classA,
      class: { id: h.ids.classA, teacherId: h.ids.teacherA },
    })
  })
  it('decides a request for an OWNED class', () =>
    h.asTeacherA().post(requestPOST, 'req_a', DENY).expect(200))
  it("404s a request for ANOTHER teacher's real class unchanged", async () => {
    await h.asTeacherB().post(requestPOST, 'req_a', DENY).expect(404)
    expect(h.rows('classJoinRequest')[0]?.status).toBe('pending')
  })
  it('403s a signed-in student', () => h.asStudentA().post(requestPOST, 'req_a', DENY).expect(403))
  it('401s signed out', () => h.anonymous().post(requestPOST, 'req_a', DENY).expect(401))
  it('403s cross-origin', () =>
    h.asTeacherA().crossOrigin().post(requestPOST, 'req_a', DENY).expect(403))
})

describe('GET /api/teacher/student/[id]', () => {
  it('returns an own-class student (team:null branch)', async () => {
    const body = await h.asTeacherA().get(studentGET, LONER).expect(200)
    expect(body.team).toBeNull()
  })
  it("404s ANOTHER teacher's real student", () => h.asTeacherB().get(studentGET, LONER).expect(404))
  it('403s a signed-in student', () => h.asStudentA().get(studentGET, LONER).expect(403))
  it('401s signed out', () => h.anonymous().get(studentGET, LONER).expect(401))
  it('429s over the tier', () => h.asTeacherA().overLimit().get(studentGET, LONER).expect(429))
})

describe('GET /api/teacher/student/[id]/overview', () => {
  it('returns an own-class student (team:null branch)', async () => {
    const body = await h.asTeacherA().get(overviewGET, LONER).expect(200)
    expect(body.team).toBeNull()
  })
  it("404s ANOTHER teacher's real student", () =>
    h.asTeacherB().get(overviewGET, LONER).expect(404))
  it('403s a signed-in student', () => h.asStudentA().get(overviewGET, LONER).expect(403))
  it('401s signed out', () => h.anonymous().get(overviewGET, LONER).expect(401))
})

describe('GET /api/teacher/student/[id]/literature/[paperId] (+ /file)', () => {
  const P_A = 'paper_team_a'
  const P_B = 'paper_team_b'
  beforeEach(() => {
    const paper = (id: string, teamId: string) => ({
      id,
      teamId,
      title: 'A paper',
      authors: 'Someone',
      abstract: 'Abstract',
      status: 'ready',
      fullText: 'text',
      pdfKey: null,
      pdfData: Buffer.from('%PDF-fake'),
      createdAt: new Date(0),
    })
    h.seed('paper', paper(P_A, h.ids.teamA))
    h.seed('paper', paper(P_B, h.ids.teamB))
  })
  const params = (paperId: string) => ({ id: h.ids.studentA, paperId })

  it("returns an own student's paper", () =>
    h.asTeacherA().get(litGET, params(P_A)).expect(200))
  it("404s a paper belonging to ANOTHER team (real row)", () =>
    h.asTeacherA().get(litGET, params(P_B)).expect(404))
  it("404s when the STUDENT is in another teacher's class", () =>
    h.asTeacherB().get(litGET, params(P_A)).expect(404))
  it('403s a signed-in student', () => h.asStudentA().get(litGET, params(P_A)).expect(403))
  it('401s signed out', () => h.anonymous().get(litGET, params(P_A)).expect(401))

  it("file: streams an own student's PDF", async () => {
    const res = await h.asTeacherA().get(litFileGET, params(P_A)).response()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })
  it("file: 404s ANOTHER team's real paper", () =>
    h.asTeacherA().get(litFileGET, params(P_B)).expect(404))
  it("file: 404s when the student is in another teacher's class", () =>
    h.asTeacherB().get(litFileGET, params(P_A)).expect(404))
  it('file: 401s signed out', () => h.anonymous().get(litFileGET, params(P_A)).expect(401))
})
