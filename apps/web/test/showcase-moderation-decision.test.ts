import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A moderation decision binds to the revision the teacher actually reviewed
 * (REFACTOR2 P0-R3). The decision is a compare-and-set on `contentDigest`, so a
 * submission edited between the reviewer opening it and clicking Approve simply
 * does not match and the approval is refused — it can never land on content
 * nobody read.
 */

const mocks = vi.hoisted(() => ({
  requireTeacher: vi.fn(),
  teacherOwnsTeam: vi.fn(() => Promise.resolve(true)),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  eventCreate: vi.fn(() => Promise.resolve({})),
  notificationCreate: vi.fn(() => Promise.resolve({})),
}))

const tx = {
  showcase: { updateMany: mocks.updateMany },
  showcaseModerationEvent: { create: mocks.eventCreate },
  notification: { create: mocks.notificationCreate },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/teacher/auth', () => ({
  requireTeacher: mocks.requireTeacher,
  teacherOwnsTeam: mocks.teacherOwnsTeam,
}))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.findUnique, findMany: vi.fn() },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import { POST } from '@/app/api/teacher/showcase-moderation/route'

const REVIEWED = 'a'.repeat(64)

function decideReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/teacher/showcase-moderation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ showcaseId: 'sc_1', decision: 'approve', digest: REVIEWED, ...body }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeacher.mockResolvedValue({
    ctx: { userId: 'clerk_t', dbUserId: 'db_t', classIds: ['class_1'] },
    error: null,
  })
  mocks.teacherOwnsTeam.mockResolvedValue(true)
  mocks.findUnique.mockResolvedValue({
    id: 'sc_1',
    teamId: 'team_1',
    moderationStatus: 'pending_review',
    contentDigest: REVIEWED,
    shortTitle: 'Mould',
    title: 'Mould growth',
  })
  mocks.updateMany.mockResolvedValue({ count: 1 })
})

describe('showcase moderation decision', () => {
  it('approving names the reviewed revision and appends an event', async () => {
    const res = await POST(decideReq({}))

    expect(res.status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'sc_1', moderationStatus: 'pending_review', contentDigest: REVIEWED },
      data: expect.objectContaining({
        moderationStatus: 'approved',
        approvedDigest: REVIEWED,
      }),
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        digest: REVIEWED,
        action: 'approved',
        actorUserId: 'db_t',
      }),
    })
  })

  it('rejecting clears any prior approved revision', async () => {
    await POST(decideReq({ decision: 'reject', note: 'Add your control group.' }))

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ moderationStatus: 'rejected', approvedDigest: null }),
      }),
    )
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'rejected', note: 'Add your control group.' }),
    })
  })

  // The core P0: the team swapped the board while the teacher had the queue open.
  it('409s when the team edited the submission mid-review, writing nothing', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    const res = await POST(decideReq({}))

    expect(res.status).toBe(409)
    expect(mocks.eventCreate).not.toHaveBeenCalled()
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it('a stale digest from an old queue load cannot approve the current revision', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'sc_1',
      teamId: 'team_1',
      moderationStatus: 'pending_review',
      contentDigest: 'b'.repeat(64), // the team has since edited
      shortTitle: 'Mould',
      title: 'Mould growth',
    })
    mocks.updateMany.mockResolvedValue({ count: 0 })

    expect((await POST(decideReq({}))).status).toBe(409)
  })

  it('a teacher outside the class is refused before any write', async () => {
    mocks.teacherOwnsTeam.mockResolvedValue(false)

    const res = await POST(decideReq({}))

    expect(res.status).toBe(403)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a decision that carries no reviewed revision at all', async () => {
    const res = await POST(
      new NextRequest('http://app.example.com/api/teacher/showcase-moderation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ showcaseId: 'sc_1', decision: 'approve' }),
      }),
    )

    expect(res.status).toBe(400)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
})
