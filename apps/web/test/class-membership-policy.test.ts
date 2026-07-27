import { beforeEach, describe, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Authorization matrix for the three class-membership commands added by
 * REFACTOR2 P1-R8 (class half).
 *
 * These are the commands that END an authorization, so getting their scope
 * wrong is worse than getting a read wrong: a teacher who can un-enrol another
 * teacher's student, or a student who can withdraw a classmate's request, is a
 * cross-tenant write. The harness runs the REAL guards against a real `where`-
 * filtering store, so a missing scope in a query fails here — a guard-mocking
 * test could not catch that.
 */

import { DELETE as leaveClassDELETE } from '@/app/api/class/membership/route'
import { DELETE as withdrawDELETE } from '@/app/api/class/requests/[id]/route'
import { DELETE as removeStudentDELETE } from '@/app/api/teacher/class/students/[id]/route'

let h: RoutePolicyHarness

beforeEach(() => {
  h = routeHarness()
  h.seed('classJoinRequest', {
    id: 'req_a',
    userId: h.ids.studentA,
    classId: h.ids.classA,
    status: 'pending',
  })
  h.seed('classJoinRequest', {
    id: 'req_b',
    userId: h.ids.studentB,
    classId: h.ids.classB,
    status: 'pending',
  })
})

describe('DELETE /api/class/membership (student leaves)', () => {
  it('401s signed out', () => h.anonymous().delete(leaveClassDELETE).expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(leaveClassDELETE).expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().delete(leaveClassDELETE).expect(429))
})

describe('DELETE /api/class/requests/[id] (student withdraws)', () => {
  it("404s ANOTHER student's real request", () =>
    h.asStudentA().delete(withdrawDELETE, 'req_b').expect(404))
  it('401s signed out', () => h.anonymous().delete(withdrawDELETE, 'req_a').expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().delete(withdrawDELETE, 'req_a').expect(403))
})

describe('DELETE /api/teacher/class/students/[id] (teacher un-enrols)', () => {
  it("404s a student in ANOTHER teacher's class", () =>
    h.asTeacherA().delete(removeStudentDELETE, h.ids.studentB).expect(404))
  it('401s signed out', () => h.anonymous().delete(removeStudentDELETE, h.ids.studentA).expect(401))
  it('403s a STUDENT calling the teacher route', () =>
    h.asStudentA().delete(removeStudentDELETE, h.ids.studentA).expect(403))
  it('403s cross-origin', () =>
    h.asTeacherA().crossOrigin().delete(removeStudentDELETE, h.ids.studentA).expect(403))
})
