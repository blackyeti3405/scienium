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
/** The student's ONE live team membership (`TeamMember.userId` is `@@unique`). */
let memberships: { userId: string; teamId: string }[]
let notifications: Record<string, unknown>[]
let eventSeq: number
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
  // REFACTOR2 P1-5 — the ledger row written in the same transaction.
  securityEvent: { create: vi.fn(async ({ data }: any) => ({ id: 'sec_1', ...data })) },
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
      const row = { id: `evt_${++eventSeq}`, ...data }
      events.push(row)
      return row
    },
  },
  teamMember: {
    findUnique: async ({ where }: any) =>
      memberships.find((m) => m.userId === where.userId) ?? null,
  },
  class: {
    findUnique: async ({ where }: any) =>
      where.id === CLASS ? { name: 'Period 3 Biology' } : null,
  },
  notification: {
    create: async ({ data }: any) => {
      if (notifications.some((n) => n.dedupeKey === data.dedupeKey)) {
        // `dedupeKey` is `@unique`. The write is inside the removal's
        // transaction, so a collision does not merely lose a notification — it
        // rolls the removal back.
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
      }
      notifications.push(data)
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
  memberships = [{ userId: STUDENT, teamId: 'team_1' }]
  notifications = []
  eventSeq = 0
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

  it('tells the student they were removed, addressed to them alone', async () => {
    // The gap P1-R8 left open: the removal was logged for the teacher and the
    // student found out by noticing their teacher could no longer see them.
    await removeFromClass(CLASS, STUDENT, TEACHER)

    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      teamId: 'team_1',
      userId: STUDENT,
      kind: 'membership_changed',
      title: 'You were removed from Period 3 Biology',
    })
  })

  it('keys the notification to the EVENT, so a second removal is not a constraint failure', async () => {
    // A key of (student, class) would collide on the second removal — and
    // because the write is inside the removal's own transaction, that collision
    // would abort the removal itself.
    await removeFromClass(CLASS, STUDENT, TEACHER)
    users[0]!.classId = CLASS
    requests[0]!.status = 'approved'

    await expect(removeFromClass(CLASS, STUDENT, TEACHER)).resolves.toMatchObject({
      committed: true,
    })
    expect(notifications).toHaveLength(2)
    expect(notifications[0]!.dedupeKey).not.toBe(notifications[1]!.dedupeKey)
  })

  it('a student who left is not notified — they know', async () => {
    await leaveClass(STUDENT)
    expect(notifications).toEqual([])
  })

  // Cut: 'a refused removal writes no notification either'. `endEnrolment`
  // returns at class-membership.ts:198-201 long before `notifyRemoved` is
  // reachable — there is no suppression branch whose removal could flip it,
  // and the refusal itself is already pinned by the interleave test above.

  it('a student with no live team is told too — the notice carries no team', async () => {
    // This inverts the gap this file used to DOCUMENT (HANDOFF #4). The notice
    // was skipped entirely when the student held no `TeamMember` row, because
    // `Notification.teamId` was required and the bell filtered on it. Both are
    // fixed: the row is written with a null team, and the bell reaches anything
    // addressed to the reader.
    //
    // What must stay true either way, and is why the removal is asserted here:
    // it COMMITS. It must never fail because the notice has nowhere to go.
    memberships = []

    await expect(removeFromClass(CLASS, STUDENT, TEACHER)).resolves.toMatchObject({
      committed: true,
    })
    expect(users[0]!.classId).toBeNull()
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      teamId: null,
      userId: STUDENT,
      kind: 'membership_changed',
    })
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
