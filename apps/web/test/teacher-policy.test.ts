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

import { GET as rosterGET } from '@/app/api/teacher/roster/route'
import { POST as codePOST } from '@/app/api/teacher/class/[id]/code/route'
import { POST as requestPOST } from '@/app/api/teacher/class/requests/[id]/route'
import { GET as studentGET } from '@/app/api/teacher/student/[id]/route'
import { GET as overviewGET } from '@/app/api/teacher/student/[id]/overview/route'
import { POST as leadPOST } from '@/app/api/teacher/student/[id]/lead/route'
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

describe('GET /api/teacher/roster (ADR-004: per-student class membership)', () => {
  /** A class-B student whose lab is Team A — a CROSS-CLASS team. ADR-004 says
   *  the team is visible to any teacher of any member; `Team.classId` is
   *  vestigial and must never be read to filter it out. */
  const CROSS = 'student_cross_class'
  beforeEach(() => {
    h.seed('user', {
      id: CROSS,
      clerkUserId: 'clerk_cross',
      name: 'Cross-Class Student',
      email: 'cross@example.test',
      role: 'student',
      classId: h.ids.classB,
      // Denormalized to-one relation for the route's `activeTeam` select. The
      // team deliberately has NO classId — like every post-ADR-004 team.
      activeTeam: { id: h.ids.teamA, name: 'Team A', phase: 'working', labType: 'volt_lab' },
      teamMemberships: [],
    })
  })

  it("shows teacher B their student's cross-class team (not teamless)", async () => {
    const body = await h.asTeacherB().get(rosterGET).expect(200)
    const row = body.students.find((s: { studentId: string }) => s.studentId === CROSS)
    expect(row).toBeTruthy()
    expect(row.teamId).toBe(h.ids.teamA)
    expect(row.teamName).toBe('Team A')
  })
  it("shows teacher A their own student's null-class team", async () => {
    h.seed('user', {
      id: 'student_nullclass',
      clerkUserId: 'clerk_nullclass',
      name: 'Null-Class Team Student',
      email: 'nullclass@example.test',
      role: 'student',
      classId: h.ids.classA,
      activeTeam: { id: 'team_new', name: 'New Lab', phase: 'literature_review', labType: null },
      teamMemberships: [],
    })
    const body = await h.asTeacherA().get(rosterGET).expect(200)
    const row = body.students.find(
      (s: { studentId: string }) => s.studentId === 'student_nullclass',
    )
    expect(row.teamId).toBe('team_new')
  })
  it("never includes ANOTHER teacher's students", async () => {
    const body = await h.asTeacherA().get(rosterGET).expect(200)
    const ids = body.students.map((s: { studentId: string }) => s.studentId)
    expect(ids).not.toContain(CROSS)
    expect(ids).not.toContain(h.ids.studentB)
  })
  it('403s a signed-in student', () => h.asStudentA().get(rosterGET).expect(403))
  it('401s signed out', () => h.anonymous().get(rosterGET).expect(401))
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

/**
 * REFACTOR2 P1-R8 — teacher-initiated lead reassignment.
 *
 * This route's whole reason to exist is that it authorizes on OWNERSHIP where
 * `POST /api/team/lead` authorizes on being the lead. The matrix is what stops
 * either from standing in for the other, so the cross-teacher case asserts the
 * team is UNCHANGED, not merely that a 404 came back.
 */
describe('POST /api/teacher/student/[id]/lead', () => {
  it('promotes an own-class student in a team this teacher owns', async () => {
    const body = await h.asTeacherA().post(leadPOST, h.ids.studentA).expect(200)
    expect(body.teamLeadId).toBe(h.ids.studentA)
    expect(h.rows('team').find((t) => t.id === h.ids.teamA)?.teamLeadId).toBe(h.ids.studentA)
  })
  it("404s ANOTHER teacher's real student, team unchanged", async () => {
    const before = h.rows('team').find((t) => t.id === h.ids.teamA)?.teamLeadId
    await h.asTeacherB().post(leadPOST, h.ids.studentA).expect(404)
    expect(h.rows('team').find((t) => t.id === h.ids.teamA)?.teamLeadId).toBe(before)
  })
  it('404s a student with no lab', () => h.asTeacherA().post(leadPOST, LONER).expect(404))
  it('403s a signed-in student — being ON the team is not authority to reassign it', () =>
    h.asStudentA().post(leadPOST, h.ids.studentA).expect(403))
  it('401s signed out', () => h.anonymous().post(leadPOST, h.ids.studentA).expect(401))
  it('403s cross-origin', () =>
    h.asTeacherA().crossOrigin().post(leadPOST, h.ids.studentA).expect(403))
  it('429s over the tier', () =>
    h.asTeacherA().overLimit().post(leadPOST, h.ids.studentA).expect(429))
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
