import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Class-join decisions have ONE terminal state (REFACTOR2 P1-S2).
 *
 * The old split let the route act on its own `status: 'pending'` pre-read:
 * approval re-read inside its transaction and returned silently when the row had
 * moved on — while the route still answered `{ ok: true }` — and denial wrote
 * with no status predicate at all. Approve-then-deny therefore left a student
 * enrolled (`User.classId` set) against a request marked `denied`, and competing
 * approvals were last-writer-wins on that single `classId`.
 *
 * These pin the compare-and-set, the per-student lock, and the supersede rule.
 */

const mocks = vi.hoisted(() => ({
  requireTeacher: vi.fn(),
  requestFindFirst: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpdateMany: vi.fn(),
  classFindUniqueOrThrow: vi.fn(),
  userUpdate: vi.fn(() => Promise.resolve({})),
  lockAggregate: vi.fn(() => Promise.resolve()),
}))

const tx = {
  classJoinRequest: {
    findUnique: mocks.requestFindUnique,
    updateMany: mocks.requestUpdateMany,
  },
  class: { findUniqueOrThrow: mocks.classFindUniqueOrThrow },
  user: { update: mocks.userUpdate },
}

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn(), currentUser: vi.fn() }))
vi.mock('@/lib/teacher/auth', () => ({ requireTeacher: mocks.requireTeacher }))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/db', () => ({
  db: {
    classJoinRequest: { findFirst: mocks.requestFindFirst },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import { decideClassJoin } from '@/lib/onboarding/profile'
import { POST } from '@/app/api/teacher/class/requests/[id]/route'

const PENDING = { id: 'req_1', classId: 'class_1', userId: 'student_1', status: 'pending' }

function decideReq(decision: 'approve' | 'deny'): NextRequest {
  return new NextRequest('http://app.example.com/api/teacher/class/requests/req_1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision }),
  })
}

const params = { params: Promise.resolve({ id: 'req_1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeacher.mockResolvedValue({
    ctx: { userId: 'clerk_t', dbUserId: 'teacher_1', classIds: ['class_1'] },
    error: null,
  })
  mocks.requestFindFirst.mockResolvedValue({ id: 'req_1' })
  mocks.requestFindUnique.mockResolvedValue(PENDING)
  mocks.requestUpdateMany.mockResolvedValue({ count: 1 })
  mocks.classFindUniqueOrThrow.mockResolvedValue({ id: 'class_1', schoolId: 'school_1' })
  mocks.userUpdate.mockResolvedValue({})
})

describe('decideClassJoin — one compare-and-set owns the transition', () => {
  it('approving enrols the student and commits the decision', async () => {
    const out = await decideClassJoin('req_1', 'teacher_1', 'approve')

    expect(out).toEqual({ committed: true, decision: 'approve' })
    expect(mocks.requestUpdateMany).toHaveBeenCalledWith({
      where: { id: 'req_1', status: 'pending' },
      data: expect.objectContaining({ status: 'approved', decidedByUserId: 'teacher_1' }),
    })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'student_1' },
      data: { classId: 'class_1', schoolId: 'school_1' },
    })
  })

  it('denying commits without enrolling anyone', async () => {
    const out = await decideClassJoin('req_1', 'teacher_1', 'deny')

    expect(out).toEqual({ committed: true, decision: 'deny' })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
    expect(mocks.classFindUniqueOrThrow).not.toHaveBeenCalled()
  })

  // The headline defect: deny used to write unconditionally.
  it('deny-after-approve does NOT commit and leaves the enrolment alone', async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 0 }) // no longer pending
    mocks.requestFindUnique
      .mockResolvedValueOnce(PENDING) // the caller's stale snapshot
      .mockResolvedValueOnce({ status: 'approved' }) // what actually stands

    const out = await decideClassJoin('req_1', 'teacher_1', 'deny')

    expect(out).toEqual({ committed: false, status: 'approved' })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  // The mirror image: approval used to no-op silently while reporting success.
  it('approve-after-deny reports the denial rather than claiming success', async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 0 })
    mocks.requestFindUnique
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValueOnce({ status: 'denied' })

    const out = await decideClassJoin('req_1', 'teacher_1', 'approve')

    expect(out).toEqual({ committed: false, status: 'denied' })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it('serializes on the student before touching their single class slot', async () => {
    await decideClassJoin('req_1', 'teacher_1', 'approve')

    expect(mocks.lockAggregate).toHaveBeenCalledWith(tx, 'class-membership:student_1')
    expect(mocks.lockAggregate.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.requestUpdateMany.mock.invocationCallOrder[0]!,
    )
  })

  // `User.classId` holds ONE class, so two approved rows would contradict it.
  it('supersedes a prior approval into a different class', async () => {
    await decideClassJoin('req_1', 'teacher_1', 'approve')

    expect(mocks.requestUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'student_1', status: 'approved', id: { not: 'req_1' } },
      data: expect.objectContaining({ status: 'superseded' }),
    })
  })

  it('marks the replaced approval superseded, never denied — no teacher refused it', async () => {
    await decideClassJoin('req_1', 'teacher_1', 'approve')

    const supersede = mocks.requestUpdateMany.mock.calls.find(
      (c) => c[0].where.id?.not === 'req_1',
    )
    expect(supersede![0].data.status).toBe('superseded')
  })

  it('does not supersede anything on a denial', async () => {
    await decideClassJoin('req_1', 'teacher_1', 'deny')

    expect(mocks.requestUpdateMany).toHaveBeenCalledTimes(1)
  })

  it('reports no commit for a request that vanished', async () => {
    mocks.requestFindUnique.mockResolvedValue(null)

    expect((await decideClassJoin('gone', 'teacher_1', 'approve')).committed).toBe(false)
    expect(mocks.requestUpdateMany).not.toHaveBeenCalled()
  })
})

describe('POST /api/teacher/class/requests/[id]', () => {
  it('answers 409 with the standing state instead of a false success', async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 0 })
    mocks.requestFindUnique
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValueOnce({ status: 'approved' })

    const res = await POST(decideReq('deny'), params)

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ status: 'approved' })
  })

  it('returns the committed decision on success', async () => {
    const res = await POST(decideReq('approve'), params)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, decision: 'approve' })
  })

  // Ownership is still checked first, and it is scoped — a teacher must never be
  // able to decide another teacher's request.
  it('404s a request outside the teacher’s classes, deciding nothing', async () => {
    mocks.requestFindFirst.mockResolvedValue(null)

    const res = await POST(decideReq('approve'), params)

    expect(res.status).toBe(404)
    expect(mocks.requestUpdateMany).not.toHaveBeenCalled()
  })

  it('scopes the ownership lookup by the caller’s teacher id', async () => {
    await POST(decideReq('approve'), params)

    expect(mocks.requestFindFirst).toHaveBeenCalledWith({
      where: { id: 'req_1', class: { teacherId: 'teacher_1' } },
      select: { id: true },
    })
  })
})
