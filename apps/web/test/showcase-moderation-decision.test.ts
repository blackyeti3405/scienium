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
  findMany: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
  updateMany: vi.fn(),
  eventCreate: vi.fn(() => Promise.resolve({ id: 'evt_1' })),
  notificationCreate: vi.fn((_a: Record<string, unknown>) => Promise.resolve({})),
  reportGroupBy: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
  showcaseUpdate: vi.fn((_a: { data: Record<string, unknown> }) => Promise.resolve({})),
  reportUpdateMany: vi.fn(() => Promise.resolve({ count: 0 })),
}))

const tx = {
  // REFACTOR2 P1-5 — the ledger row written in the same transaction.
  securityEvent: { create: vi.fn(async ({ data }: any) => ({ id: 'sec_1', ...data })) },
  showcase: { updateMany: mocks.updateMany, update: mocks.showcaseUpdate },
  showcaseModerationEvent: { create: mocks.eventCreate },
  showcaseReport: { updateMany: mocks.reportUpdateMany },
  notification: { create: mocks.notificationCreate },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/teacher/auth', () => ({
  requireTeacher: mocks.requireTeacher,
  teacherOwnsTeam: mocks.teacherOwnsTeam,
}))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.findUnique, findMany: mocks.findMany },
    showcaseReport: { groupBy: mocks.reportGroupBy },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import { GET, PATCH, POST } from '@/app/api/teacher/showcase-moderation/route'

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
  mocks.findMany.mockResolvedValue([])
  mocks.reportGroupBy.mockResolvedValue([])
  mocks.showcaseUpdate.mockResolvedValue({})
  mocks.reportUpdateMany.mockResolvedValue({ count: 0 })
})

// P0-R3: the queue used to select only text/team summary fields, so a reviewer
// could be asked to approve a submission whose required board, quad chart, and
// video they had no way to open.
describe('moderation queue GET gives the reviewer the whole submission', () => {
  function queueReq(): NextRequest {
    return new NextRequest('http://app.example.com/api/teacher/showcase-moderation')
  }

  const PENDING = {
    id: 'sc_1',
    slug: 'mould-ab12cd',
    shortTitle: 'Mould',
    title: 'Mould growth',
    abstract: 'We grew mould.',
    lastEditedAt: new Date('2026-07-20'),
    contentDigest: REVIEWED,
    assets: [
      { id: 'a_board', assetType: 'board', fileUrl: 'showcase/t1/board.pdf', metadataJson: null },
      { id: 'a_quad', assetType: 'quad_chart', fileUrl: 'showcase/t1/quad.png', metadataJson: null },
      { id: 'a_video', assetType: 'video', fileUrl: null, metadataJson: { url: 'https://youtu.be/x' } },
    ],
    team: { name: 'Lab', labType: 'volt_lab' },
  }

  it('returns the reviewed digest so the decision can compare-and-set on it', async () => {
    mocks.findMany.mockResolvedValue([PENDING])

    const { showcases } = await (await GET(queueReq())).json()

    expect(showcases[0].contentDigest).toBe(REVIEWED)
  })

  it('returns every asset with an openable link', async () => {
    mocks.findMany.mockResolvedValue([PENDING])

    const { showcases } = await (await GET(queueReq())).json()
    const byType = Object.fromEntries(
      showcases[0].assets.map((a: { assetType: string; url: string | null; metadata: unknown }) => [a.assetType, a]),
    )

    expect(byType.board.url).toBe('/api/showcase/public/asset?id=a_board')
    expect(byType.board.kind).toBe('pdf')
    expect(byType.quad_chart.kind).toBe('image')
    // A link asset has no bytes — the reviewer follows its stored URL instead.
    expect(byType.video.url).toBeNull()
    expect(byType.video.metadata).toEqual({ url: 'https://youtu.be/x' })
  })

  it('points the preview at the slug page, which now admits this teacher', async () => {
    mocks.findMany.mockResolvedValue([PENDING])

    const { showcases } = await (await GET(queueReq())).json()

    expect(showcases[0].previewUrl).toBe('/showcase/mould-ab12cd')
  })

  it('is class-scoped and returns nothing for a teacher with no classes', async () => {
    mocks.requireTeacher.mockResolvedValue({
      ctx: { userId: 'clerk_t', dbUserId: 'db_t', classIds: [] },
      error: null,
    })

    const { showcases } = await (await GET(queueReq())).json()

    expect(showcases).toEqual([])
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('queries only pending submissions inside the caller’s classes', async () => {
    mocks.findMany.mockResolvedValue([])

    await GET(queueReq())

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          moderationStatus: 'pending_review',
          team: { members: { some: { user: { classId: { in: ['class_1'] } } } } },
        }),
      }),
    )
  })
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
      select: { id: true },
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
      select: { id: true },
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

describe('P1-5 — a moderation decision is recorded where a deletion cannot reach it', () => {
  /**
   * `ShowcaseModerationEvent` is `onDelete: Cascade` on the showcase, so
   * deleting a showcase erases the record of who published it and who signed it
   * off — the one thing an operator asked about a public page needs. The ledger
   * row has no foreign key and survives.
   */
  const secCreate = () => tx.securityEvent.create as ReturnType<typeof vi.fn>

  it('an approval is recorded as an OK outcome, with no note carried across', async () => {
    await POST(decideReq({ note: 'Nice work, ask Ms Alvarez about the poster.' }))

    expect(secCreate()).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({
        kind: 'moderation.decision',
        outcome: 'ok',
        actorType: 'teacher',
        actorUserId: 'db_t',
        targetType: 'showcase',
        targetId: 'sc_1',
        reason: 'approved',
      }),
    })
    // The teacher's note is written TO a student ABOUT their work. It belongs in
    // the domain event and the notification, never in a cross-team ledger.
    const written = secCreate().mock.calls[0]![0].data as Record<string, unknown>
    expect(JSON.stringify(written)).not.toContain('Ms Alvarez')
  })

  it('a rejection is recorded as DENIED, which is what the abuse threshold counts', async () => {
    await POST(decideReq({ decision: 'reject' }))

    expect(secCreate()).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({ outcome: 'denied', reason: 'rejected' }),
    })
  })

  it('a stale-revision refusal records nothing — no decision was made', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    expect((await POST(decideReq({}))).status).toBe(409)
    expect(secCreate()).not.toHaveBeenCalled()
  })
})

/**
 * REFACTOR2 P1-6 — takedown and restore.
 *
 * Revision binding covers what goes live. This covers what happens when a live
 * page turns out to be a problem: the served state flips, the evidence stays,
 * and the act is attributable — none of which was possible before without an
 * UPDATE typed into a database console.
 */
describe('showcase takedown and restore', () => {
  const secCreate = () => tx.securityEvent.create as ReturnType<typeof vi.fn>

  function patchReq(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://app.example.com/api/teacher/showcase-moderation', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const LIVE = {
    id: 'sc_1',
    teamId: 'team_1',
    contentDigest: REVIEWED,
    takedownAt: null,
  }

  beforeEach(() => {
    mocks.findUnique.mockResolvedValue(LIVE)
  })

  it('a takedown flips the served state without deleting anything', async () => {
    const res = await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'privacy' }))

    expect(res.status).toBe(200)
    expect(mocks.showcaseUpdate).toHaveBeenCalledWith({
      where: { id: 'sc_1' },
      data: expect.objectContaining({ takedownReason: 'privacy' }),
    })
    const { data } = mocks.showcaseUpdate.mock.calls[0]![0]
    expect(data.takedownAt).toBeInstanceOf(Date)
    // The row, its assets and its history are the evidence — nothing is removed.
    expect(Object.keys(data)).toEqual(['takedownAt', 'takedownReason'])
  })

  it('records actor, reason, revision and outcome in the moderation history', async () => {
    await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'harassment' }))

    expect(mocks.eventCreate).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({
        showcaseId: 'sc_1',
        action: 'taken_down',
        actorUserId: 'db_t',
        // The revision that was live at the moment of the act.
        digest: REVIEWED,
        note: 'harassment',
      }),
    })
  })

  it('records the takedown in the ledger as DENIED, which is what raises the owner', async () => {
    await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'copyright' }))

    expect(secCreate()).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({
        kind: 'moderation.takedown',
        outcome: 'denied',
        actorType: 'teacher',
        actorUserId: 'db_t',
        targetType: 'showcase',
        targetId: 'sc_1',
        scopeId: 'team_1',
        reason: 'copyright',
      }),
    })
  })

  it('resolves the open reports it was acting on', async () => {
    await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'spam' }))

    expect(mocks.reportUpdateMany).toHaveBeenCalledWith({
      where: { showcaseId: 'sc_1', resolvedAt: null },
      data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
    })
  })

  it('a restore clears the takedown and is audited the same way, but silently', async () => {
    mocks.findUnique.mockResolvedValue({ ...LIVE, takedownAt: new Date('2026-07-29') })

    const res = await PATCH(patchReq({ showcaseId: 'sc_1', action: 'restore' }))

    expect(res.status).toBe(200)
    expect(mocks.showcaseUpdate).toHaveBeenCalledWith({
      where: { id: 'sc_1' },
      data: { takedownAt: null, takedownReason: null },
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({ action: 'restored', actorUserId: 'db_t' }),
    })
    // `ok`, so no alert rule counts it — a restore is good news.
    expect(secCreate()).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({ outcome: 'ok', reason: 'restored' }),
    })
  })

  it('refuses a takedown with no reason — the taxonomy is the whole record of why', async () => {
    const res = await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown' }))

    expect(res.status).toBe(400)
    expect(mocks.showcaseUpdate).not.toHaveBeenCalled()
  })

  it('refuses a reason outside the taxonomy', async () => {
    const res = await PATCH(
      patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'i-just-dont-like-it' }),
    )

    expect(res.status).toBe(400)
    expect(mocks.showcaseUpdate).not.toHaveBeenCalled()
  })

  it('a teacher outside the class cannot take down another class’s showcase', async () => {
    mocks.teacherOwnsTeam.mockResolvedValue(false)

    const res = await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'spam' }))

    expect(res.status).toBe(403)
    expect(mocks.showcaseUpdate).not.toHaveBeenCalled()
    expect(secCreate()).not.toHaveBeenCalled()
  })

  it('a second takedown of an already-down showcase writes nothing', async () => {
    mocks.findUnique.mockResolvedValue({ ...LIVE, takedownAt: new Date('2026-07-29') })

    const res = await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'spam' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, alreadyApplied: true })
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  it('the team is told, keyed to the event so a retry cannot tell them twice', async () => {
    await PATCH(patchReq({ showcaseId: 'sc_1', action: 'takedown', reason: 'inappropriate' }))

    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teamId: 'team_1',
        dedupeKey: 'showcase_takedown:evt_1',
      }),
    })
    // The reason a report gave is not repeated to the students it is about.
    const body = JSON.stringify(mocks.notificationCreate.mock.calls[0]![0])
    expect(body).not.toContain('inappropriate')
  })
})

// The queue is where a report becomes actionable — a count nobody sees is not a
// moderation path.
describe('reported showcases surface in the moderation queue', () => {
  function queueReq(): NextRequest {
    return new NextRequest('http://app.example.com/api/teacher/showcase-moderation')
  }

  const FLAGGED = {
    id: 'sc_9',
    slug: 'algae-99',
    shortTitle: 'Algae',
    title: 'Algae growth',
    privacyLevel: 'public',
    publishedAt: new Date('2026-06-01'),
    moderationStatus: 'approved',
    contentDigest: REVIEWED,
    takedownAt: null,
    takedownReason: null,
    team: { name: 'Algae Lab' },
    moderationEvents: [
      { id: 'e1', action: 'approved', note: null, digest: REVIEWED, createdAt: new Date('2026-06-01') },
    ],
  }

  it('counts open reports per reason and flags whether they are about the LIVE revision', async () => {
    mocks.reportGroupBy.mockResolvedValue([
      { showcaseId: 'sc_9', reason: 'inappropriate', digest: REVIEWED, _count: { _all: 2 } },
      { showcaseId: 'sc_9', reason: 'spam', digest: 'b'.repeat(64), _count: { _all: 1 } },
    ])
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([FLAGGED])

    const { flagged } = await (await GET(queueReq())).json()

    expect(flagged[0].reportCount).toBe(3)
    expect(flagged[0].reasons).toEqual([
      { reason: 'inappropriate', count: 2 },
      { reason: 'spam', count: 1 },
    ])
    expect(flagged[0].reportedCurrentRevision).toBe(true)
    expect(flagged[0].events).toHaveLength(1)
  })

  it('says so when the team has edited since every report was filed', async () => {
    mocks.reportGroupBy.mockResolvedValue([
      { showcaseId: 'sc_9', reason: 'spam', digest: 'b'.repeat(64), _count: { _all: 4 } },
    ])
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([FLAGGED])

    const { flagged } = await (await GET(queueReq())).json()

    expect(flagged[0].reportedCurrentRevision).toBe(false)
  })

  it('is class-scoped — a report never pulls another teacher’s showcase into view', async () => {
    mocks.reportGroupBy.mockResolvedValue([
      { showcaseId: 'sc_9', reason: 'spam', digest: REVIEWED, _count: { _all: 1 } },
    ])
    mocks.findMany.mockResolvedValue([])

    await GET(queueReq())

    expect(mocks.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          team: { members: { some: { user: { classId: { in: ['class_1'] } } } } },
        }),
      }),
    )
  })
})
