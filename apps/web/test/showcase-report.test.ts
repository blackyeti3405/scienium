import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Anonymous abuse reporting on a published showcase (REFACTOR2 P1-6).
 *
 * The endpoint is on the public middleware allowlist and takes no credential, so
 * everything that stands in for authentication is pinned here: it reports only
 * what the public can already SEE, the taxonomy is closed, a repeat report is a
 * no-op, the per-showcase ceiling holds, and no free text exists anywhere in the
 * request that could reach a moderation screen or the ledger.
 */

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn((..._a: unknown[]) => Promise.resolve<unknown>(null)),
  showcaseFindFirst: vi.fn(),
  reportCreate: vi.fn((_a: { data: Record<string, string> }) => Promise.resolve({ id: 'rep_1' })),
  reportCount: vi.fn(() => Promise.resolve(0)),
  recordSecurityEvent: vi.fn((_a: Record<string, unknown>) => Promise.resolve(true)),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  clientIp: () => '203.0.113.7',
}))
vi.mock('@/lib/observability/security-event', () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findFirst: mocks.showcaseFindFirst },
    showcaseReport: { create: mocks.reportCreate, count: mocks.reportCount },
  },
}))

import { POST } from '@/app/api/showcase/public/report/route'
import { showcaseContentDigest } from '@/lib/showcase-server'

const SHARE_TOKEN = 'Zm9vYmFyYmF6cXV4MTIzNA'

function reportReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/showcase/public/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function showcase(overrides: Record<string, unknown> = {}) {
  const sc = {
    id: 'sc_1',
    teamId: 'team_1',
    slug: 'mould-ab12cd',
    shareToken: SHARE_TOKEN,
    privacyLevel: 'public',
    publishedAt: new Date('2026-01-01'),
    moderationStatus: 'approved',
    takedownAt: null,
    shortTitle: 'Mould',
    title: 'Mould growth on bread',
    abstract: 'We grew mould.',
    assets: [{ assetType: 'board', fileUrl: 'showcase/team_1/board.png', metadataJson: null }],
    team: { members: [{ user: { schoolId: 'school_A' } }] },
    ...overrides,
  }
  const digest = showcaseContentDigest(sc)
  return { ...sc, contentDigest: digest, approvedDigest: digest }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.enforceRateLimit.mockResolvedValue(null)
  mocks.reportCount.mockResolvedValue(0)
  mocks.reportCreate.mockResolvedValue({ id: 'rep_1' })
  mocks.showcaseFindFirst.mockResolvedValue(showcase())
})

describe('POST /api/showcase/public/report', () => {
  it('accepts an ANONYMOUS report on a live public showcase', async () => {
    const res = await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'inappropriate' }))

    expect(res.status).toBe(200)
    expect(mocks.reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ showcaseId: 'sc_1', reason: 'inappropriate' }),
      }),
    )
  })

  it('stores the reporter as a hash, never the address, and the reported revision', async () => {
    await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'privacy' }))

    const data = mocks.reportCreate.mock.calls[0]![0].data
    expect(data.reporterHash).toMatch(/^[0-9a-f]{32}$/)
    expect(JSON.stringify(data)).not.toContain('203.0.113.7')
    // The revision that was live when the report was filed — what tells a
    // reviewer whether they are looking at the thing that was reported.
    expect(data.digest).toBe(showcase().contentDigest)
  })

  it('rate-limits on the reporter’s own identity, not just the classroom IP', async () => {
    await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))

    const [, tier, identity] = mocks.enforceRateLimit.mock.calls[0]!
    expect(tier).toBe('report')
    // Passing the hash as the "user" is what gets the tight per-identity bucket
    // instead of the deliberately loose per-IP backstop (a NAT'd classroom).
    expect(identity).toMatch(/^[0-9a-f]{32}$/)
  })

  it('a limiter refusal short-circuits before any read or write', async () => {
    mocks.enforceRateLimit.mockResolvedValue(
      new Response(null, { status: 429 }) as unknown as null,
    )

    const res = await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))

    expect(res.status).toBe(429)
    expect(mocks.showcaseFindFirst).not.toHaveBeenCalled()
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  it('refuses a reason outside the taxonomy', async () => {
    const res = await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'i-dont-like-them' }))

    expect(res.status).toBe(400)
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  it('refuses a smuggled free-text field outright (the body is strict)', async () => {
    const res = await POST(
      reportReq({ showcase: 'mould-ab12cd', reason: 'other', detail: 'they said X about me' }),
    )

    expect(res.status).toBe(400)
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  it('a repeat report from the same reporter is a no-op, not a second count', async () => {
    mocks.reportCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dupe', { code: 'P2002', clientVersion: 'x' }),
    )

    const res = await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, duplicate: true })
    // Nothing new happened, so nothing new is recorded.
    expect(mocks.recordSecurityEvent).not.toHaveBeenCalled()
  })

  it('drops further reports once one showcase is past its hourly ceiling', async () => {
    mocks.reportCount.mockResolvedValue(100)

    const res = await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))

    // Answered OK either way: whether a report landed is not something a caller
    // gets to probe.
    expect(res.status).toBe(200)
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  it('records a ledger row with the reason and no reporter identity', async () => {
    await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'harassment' }))

    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'moderation.report',
        // Non-`ok` is what makes the threshold rule count it.
        outcome: 'denied',
        actorType: 'anonymous',
        targetType: 'showcase',
        targetId: 'sc_1',
        scopeId: 'team_1',
        reason: 'harassment',
      }),
    )
    const written = JSON.stringify(mocks.recordSecurityEvent.mock.calls[0]![0])
    expect(written).not.toContain('203.0.113.7')
  })

  it('404s an unknown identifier', async () => {
    mocks.showcaseFindFirst.mockResolvedValue(null)

    expect((await POST(reportReq({ showcase: 'nope', reason: 'spam' }))).status).toBe(404)
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  // Reportability is the same gate as visibility, so this is not an oracle for
  // the existence of private drafts.
  it('404s a private draft, a pending submission and an unpublished showcase', async () => {
    for (const overrides of [
      { privacyLevel: 'private' },
      { moderationStatus: 'pending_review' },
      { publishedAt: null },
    ]) {
      mocks.showcaseFindFirst.mockResolvedValue(showcase(overrides))
      expect((await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))).status).toBe(404)
    }
    expect(mocks.reportCreate).not.toHaveBeenCalled()
  })

  it('404s a showcase that is ALREADY taken down — there is nothing left to report', async () => {
    mocks.showcaseFindFirst.mockResolvedValue(showcase({ takedownAt: new Date('2026-07-29') }))

    expect((await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'spam' }))).status).toBe(404)
  })

  it('a link_only showcase is reportable through the share token, not the slug', async () => {
    mocks.showcaseFindFirst.mockResolvedValue(showcase({ privacyLevel: 'link_only' }))

    expect((await POST(reportReq({ showcase: SHARE_TOKEN, reason: 'privacy' }))).status).toBe(200)

    mocks.showcaseFindFirst.mockResolvedValue(showcase({ privacyLevel: 'link_only' }))
    expect((await POST(reportReq({ showcase: 'mould-ab12cd', reason: 'privacy' }))).status).toBe(404)
  })
})
