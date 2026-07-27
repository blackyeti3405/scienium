import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R8, the class half — ending a class membership.
 *
 * Teacher authorization is DERIVED from `User.classId` (`teacherOwnsTeam` matches
 * teams with a member in a class the teacher owns), so "the membership ended" and
 * "the access ended" have to be the same write. Before this there was no command
 * to end one at all.
 *
 * These tests pin the ATTACK, not the shape: another student's request id, a
 * withdrawal racing a teacher's decision, a student outside the teacher's
 * classes, and a student who moved between the authorization check and the
 * write. Each asserts that NOTHING was written, not merely that an error came
 * back.
 */

interface RequestRow {
  id: string
  classId: string
  userId: string
  status: string
  decidedByUserId: string | null
}

let requests: RequestRow[]
let users: { id: string; classId: string | null }[]
let events: { classId: string; userId: string; event: string; actorUserId: string | null }[]
/** Runs between the advisory lock and the read inside `endEnrolment`. */
let interleave: (() => void) | null

const mocks = vi.hoisted(() => ({ lockAggregate: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))

function matches(r: RequestRow, where: any): boolean {
  if (where.id !== undefined && r.id !== where.id) return false
  if (where.userId !== undefined && r.userId !== where.userId) return false
  if (where.classId !== undefined && r.classId !== where.classId) return false
  if (typeof where.status === 'string' && r.status !== where.status) return false
  if (where.status?.in && !where.status.in.includes(r.status)) return false
  return true
}

const tx = {
  classJoinRequest: {
    findFirst: async ({ where }: any) => requests.find((r) => matches(r, where)) ?? null,
    findUnique: async ({ where }: any) => requests.find((r) => r.id === where.id) ?? null,
    updateMany: async ({ where, data }: any) => {
      const hits = requests.filter((r) => matches(r, where))
      for (const r of hits) Object.assign(r, data)
      return { count: hits.length }
    },
  },
  user: {
    findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
    updateMany: async ({ where, data }: any) => {
      const hits = users.filter(
        (u) => u.id === where.id && (where.classId === undefined || u.classId === where.classId),
      )
      for (const u of hits) Object.assign(u, data)
      return { count: hits.length }
    },
  },
  classMembershipEvent: {
    create: async ({ data }: any) => {
      events.push(data)
      return data
    },
  },
}

vi.mock('@/lib/db', () => ({
  db: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) },
}))

const { leaveClass, removeFromClass, withdrawClassRequest } = await import(
  '@/lib/onboarding/class-membership'
)

const STUDENT = 'student_1'
const OTHER = 'student_2'
const CLASS = 'class_1'
const TEACHER = 'teacher_1'

beforeEach(() => {
  interleave = null
  mocks.lockAggregate.mockReset()
  mocks.lockAggregate.mockImplementation(async () => {
    interleave?.()
  })
  requests = [
    { id: 'req_mine', classId: CLASS, userId: STUDENT, status: 'pending', decidedByUserId: null },
    { id: 'req_theirs', classId: CLASS, userId: OTHER, status: 'pending', decidedByUserId: null },
  ]
  users = [
    { id: STUDENT, classId: null },
    { id: OTHER, classId: null },
  ]
  events = []
})

describe('a student withdrawing their own request', () => {
  it('withdraws it and logs who did it', async () => {
    const out = await withdrawClassRequest('req_mine', STUDENT)

    expect(out).toEqual({ committed: true, classId: CLASS })
    expect(requests.find((r) => r.id === 'req_mine')!.status).toBe('withdrawn')
    expect(events).toEqual([
      expect.objectContaining({ event: 'withdrawn', userId: STUDENT, actorUserId: STUDENT }),
    ])
  })

  it("cannot withdraw ANOTHER student's request, even with the exact id", async () => {
    // THE ATTACK: a guessed or shoulder-surfed request id. Ownership is part of
    // the write predicate, not a pre-read, so it matches nothing.
    const out = await withdrawClassRequest('req_theirs', STUDENT)

    expect(out).toEqual({ committed: false, reason: 'not_found' })
    expect(requests.find((r) => r.id === 'req_theirs')!.status).toBe('pending')
    expect(events).toEqual([])
  })

  it('cannot undo a decision the teacher already made', async () => {
    requests[0]!.status = 'approved'

    const out = await withdrawClassRequest('req_mine', STUDENT)

    expect(out).toEqual({ committed: false, reason: 'not_pending' })
    expect(requests[0]!.status).toBe('approved')
    expect(events).toEqual([])
  })
})

describe('ending an approved enrolment', () => {
  beforeEach(() => {
    requests[0]!.status = 'approved'
    users[0]!.classId = CLASS
  })

  it('clears the derived authorization in the same commit as the status', async () => {
    // `User.classId` is what `teacherOwnsTeam` reads. A revoked request with the
    // class id still set would read as ended and behave as live.
    const out = await removeFromClass(CLASS, STUDENT, TEACHER)

    expect(out).toEqual({ committed: true, classId: CLASS })
    expect(users[0]!.classId).toBeNull()
    expect(requests[0]!.status).toBe('revoked')
    expect(events).toEqual([
      expect.objectContaining({ event: 'revoked', actorUserId: TEACHER, reason: 'removed_by_teacher' }),
    ])
  })

  it('retires a still-pending request too, so a removal cannot be silently undone', async () => {
    requests.push({
      id: 'req_pending_again',
      classId: CLASS,
      userId: STUDENT,
      status: 'pending',
      decidedByUserId: null,
    })

    await removeFromClass(CLASS, STUDENT, TEACHER)

    expect(requests.find((r) => r.id === 'req_pending_again')!.status).toBe('revoked')
  })

  it('refuses when the student moved between the check and the write', async () => {
    // THE INTERLEAVE: the route verified the student was in the teacher's class,
    // then an approval elsewhere landed. Removing on the stale authorization
    // would let a teacher un-enrol a student from a class they do not own.
    interleave = () => {
      users[0]!.classId = 'class_somewhere_else'
    }

    const out = await removeFromClass(CLASS, STUDENT, TEACHER)

    expect(out).toEqual({ committed: false, reason: 'not_enrolled' })
    expect(users[0]!.classId).toBe('class_somewhere_else')
    expect(requests[0]!.status).toBe('approved')
    expect(events).toEqual([])
  })

  it('a student leaving records themselves as the actor', async () => {
    const out = await leaveClass(STUDENT)

    expect(out.committed).toBe(true)
    expect(users[0]!.classId).toBeNull()
    expect(events).toEqual([
      expect.objectContaining({ event: 'revoked', actorUserId: STUDENT, reason: 'left_by_student' }),
    ])
  })

  it('is a no-op for a student who is not enrolled', async () => {
    users[0]!.classId = null

    expect(await leaveClass(STUDENT)).toEqual({ committed: false, reason: 'not_enrolled' })
    expect(events).toEqual([])
  })

  it('serializes against a concurrent decision on the same student', async () => {
    await removeFromClass(CLASS, STUDENT, TEACHER)

    // The same key `decideClassJoin` locks — otherwise an approval and a removal
    // can interleave and disagree about which class the student is in.
    expect(mocks.lockAggregate).toHaveBeenCalledWith(
      expect.anything(),
      `class-membership:${STUDENT}`,
    )
  })
})
