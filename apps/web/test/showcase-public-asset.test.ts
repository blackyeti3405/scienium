import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Public showcase asset privacy (PILOT-3 matrix). The asset stream route is on
 * the public middleware allowlist, so ITS check is the only thing between an
 * anonymous visitor and a team's uploaded board: a showcase the privacy rules
 * deny must 404 WITHOUT touching storage, and only well-formed `showcase/`
 * object keys may ever be streamed. Uses the real `canViewShowcase` matrix
 * (unit-tested exhaustively in showcase.test.ts) — these tests pin the route's
 * wiring of it.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enforceRateLimit: vi.fn(() => Promise.resolve(null)),
  getObjectStream: vi.fn(),
  assetFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth, currentUser: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/storage', () => ({ getObjectStream: mocks.getObjectStream }))
vi.mock('@/lib/db', () => ({
  db: {
    showcaseAsset: { findUnique: mocks.assetFindUnique },
    user: { findUnique: mocks.userFindUnique },
  },
}))

import { GET } from '@/app/api/showcase/public/asset/route'

function assetReq(id = 'asset_1'): NextRequest {
  return new NextRequest(`http://app.example.com/api/showcase/public/asset?id=${id}`)
}

function asset(overrides: {
  privacyLevel?: string
  publishedAt?: Date | null
  moderationStatus?: string
  fileUrl?: string
}) {
  return {
    fileUrl: overrides.fileUrl ?? 'showcase/team_1/board.png',
    assetType: 'board',
    showcase: {
      teamId: 'team_1',
      privacyLevel: overrides.privacyLevel ?? 'private',
      publishedAt: 'publishedAt' in overrides ? overrides.publishedAt : new Date('2026-01-01'),
      moderationStatus: overrides.moderationStatus ?? 'approved',
      team: { members: [{ user: { schoolId: 'school_A' } }] },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.enforceRateLimit.mockResolvedValue(null)
  mocks.auth.mockResolvedValue({ userId: null }) // anonymous by default
  mocks.getObjectStream.mockResolvedValue({
    body: 'bytes',
    contentLength: 5,
    contentType: 'image/png',
  })
})

describe('public showcase asset privacy', () => {
  it('a private showcase 404s for anonymous visitors without touching storage', async () => {
    mocks.assetFindUnique.mockResolvedValue(asset({ privacyLevel: 'private' }))

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })

  it('an unpublished showcase 404s even when public', async () => {
    mocks.assetFindUnique.mockResolvedValue(asset({ privacyLevel: 'public', publishedAt: null }))

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })

  it('a published-but-unapproved showcase 404s (moderation gate)', async () => {
    mocks.assetFindUnique.mockResolvedValue(
      asset({ privacyLevel: 'public', moderationStatus: 'pending_review' }),
    )

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })

  it('public + published + approved streams to anonymous visitors', async () => {
    mocks.assetFindUnique.mockResolvedValue(asset({ privacyLevel: 'public' }))

    const res = await GET(assetReq())

    expect(res.status).toBe(200)
    expect(mocks.getObjectStream).toHaveBeenCalledWith('showcase/team_1/board.png')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  // REFACTOR2 P0-R2, the direct attack the audit asked for: `schoolId` is set
  // from a free-text school name the student types, so "same school" is just
  // "typed the same string". A matching viewer must now get 404, not the bytes.
  it('school_only 404s a same-school signed-in viewer — the level is withdrawn', async () => {
    mocks.assetFindUnique.mockResolvedValue(asset({ privacyLevel: 'school_only' }))
    mocks.auth.mockResolvedValue({ userId: 'clerk_viewer' })
    mocks.userFindUnique.mockResolvedValue({ schoolId: 'school_A', teamMemberships: [] })

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })

  it('school_only rejects an other-school viewer', async () => {
    mocks.assetFindUnique.mockResolvedValue(asset({ privacyLevel: 'school_only' }))
    mocks.auth.mockResolvedValue({ userId: 'clerk_viewer' })
    mocks.userFindUnique.mockResolvedValue({ schoolId: 'school_B', teamMemberships: [] })

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })

  it('an object key outside the showcase/ prefix is never streamed', async () => {
    mocks.assetFindUnique.mockResolvedValue(
      asset({ privacyLevel: 'public', fileUrl: 'papers/team_2/secret.pdf' }),
    )

    const res = await GET(assetReq())

    expect(res.status).toBe(404)
    expect(mocks.getObjectStream).not.toHaveBeenCalled()
  })
})
