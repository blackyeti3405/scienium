import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `PUT /api/showcase` write policy — the wiring behind three findings that the
 * pure-function tests cannot see:
 *
 *   P0-R2  `school_only` is refused on write, not merely hidden in the picker.
 *   P0-R3  every write re-derives the revision digest and records a moderation
 *          event when the team submits or unpublishes.
 *   P1-R7  a share token is minted on create, back-filled for a legacy row, and
 *          rotated on request; `shareUrl` — not the slug — is what the team is
 *          handed for a `link_only` showcase.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  eventCreate: vi.fn(() => Promise.resolve({})),
  syncShowcaseRevision: vi.fn(() => Promise.resolve({ digest: 'd'.repeat(64), invalidated: false })),
  logActivity: vi.fn(() => Promise.resolve()),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/showcase-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/showcase-server')>()),
  syncShowcaseRevision: mocks.syncShowcaseRevision,
}))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.findUnique, update: mocks.update, create: mocks.create },
    showcaseModerationEvent: { create: mocks.eventCreate },
    team: { findUnique: vi.fn() },
  },
}))

import { PUT } from '@/app/api/showcase/route'

const READY_ASSETS = [{ assetType: 'board' }, { assetType: 'video' }, { assetType: 'quad_chart' }]

function putReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/showcase', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function existing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sc_1',
    slug: 'mould-growth-ab12cd',
    shortTitle: 'Mould',
    title: 'Mould growth on bread',
    abstract: 'We grew mould.',
    privacyLevel: 'private',
    publishedAt: null,
    moderationStatus: 'draft',
    moderationNote: null,
    shareToken: 'existing-token-aaaaaa',
    assets: READY_ASSETS,
    // The route re-reads with `includeFull` after syncing, so every fixture the
    // mocked `findUnique` can return must carry that shape too.
    team: { name: 'Lab', labType: 'volt_lab' },
    _count: { views: 0 },
    ...overrides,
  }
}

/** What `update`/`create` echo back — the route re-reads before responding. */
function saved(overrides: Record<string, unknown> = {}) {
  return { ...existing(overrides), assets: [] }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.syncShowcaseRevision.mockResolvedValue({ digest: 'd'.repeat(64), invalidated: false })
  mocks.eventCreate.mockResolvedValue({})
  mocks.update.mockImplementation(async () => saved())
  mocks.create.mockImplementation(async () => saved())
})

describe('P0-R2 — school_only cannot be written', () => {
  it('rejects school_only with 400 and writes nothing', async () => {
    mocks.findUnique.mockResolvedValue(existing())

    const res = await PUT(putReq({ privacyLevel: 'school_only' }))

    expect(res.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('still accepts the three supported levels', async () => {
    mocks.findUnique.mockResolvedValue(existing())

    for (const privacyLevel of ['public', 'link_only', 'private']) {
      mocks.update.mockResolvedValue(saved({ privacyLevel }))
      expect((await PUT(putReq({ privacyLevel }))).status).toBe(200)
    }
  })
})

describe('P1-R7 — share token lifecycle', () => {
  it('mints a token when the showcase is first created', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await PUT(putReq({ shortTitle: 'Mould', title: 'Mould growth on bread' }))

    const token = mocks.create.mock.calls[0][0].data.shareToken
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThanOrEqual(22) // 128 bits of base64url
  })

  it('back-fills a token for a showcase created before P1-R7', async () => {
    mocks.findUnique.mockResolvedValue(existing({ shareToken: null }))

    await PUT(putReq({ abstract: 'edited' }))

    expect(mocks.update.mock.calls[0][0].data.shareToken).toBeTruthy()
  })

  it('leaves an existing token alone on an ordinary save', async () => {
    mocks.findUnique.mockResolvedValue(existing())

    await PUT(putReq({ abstract: 'edited' }))

    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('shareToken')
  })

  // Rotation IS revocation — there is no way to un-share a copied URL.
  it('rotates to a different token on request', async () => {
    mocks.findUnique.mockResolvedValue(existing())

    await PUT(putReq({ rotateShareToken: true }))

    const next = mocks.update.mock.calls[0][0].data.shareToken
    expect(next).toBeTruthy()
    expect(next).not.toBe('existing-token-aaaaaa')
  })

  // The response is built from the POST-sync re-read, so drive that row.
  it('hands out the TOKEN url for link_only', async () => {
    const row = existing({ privacyLevel: 'link_only', shareToken: 'tok_secret' })
    mocks.findUnique.mockResolvedValue(row)
    mocks.update.mockResolvedValue(saved({ privacyLevel: 'link_only', shareToken: 'tok_secret' }))

    const body = await (await PUT(putReq({ privacyLevel: 'link_only' }))).json()

    expect(body.showcase.shareUrl).toBe('/showcase/tok_secret')
    // The slug must never be handed out as the way into an unlisted showcase.
    expect(body.showcase.shareUrl).not.toContain('mould-growth')
  })

  it('hands out the SLUG url for public — it is a listed, reviewed identifier', async () => {
    mocks.findUnique.mockResolvedValue(existing({ privacyLevel: 'public' }))
    mocks.update.mockResolvedValue(saved({ privacyLevel: 'public' }))

    const body = await (await PUT(putReq({ privacyLevel: 'public' }))).json()

    expect(body.showcase.shareUrl).toBe('/showcase/mould-growth-ab12cd')
  })

  it('falls back to the slug if a link_only row somehow has no token', async () => {
    mocks.findUnique.mockResolvedValue(existing({ privacyLevel: 'link_only', shareToken: null }))
    mocks.update.mockResolvedValue(saved({ privacyLevel: 'link_only', shareToken: null }))

    const body = await (await PUT(putReq({ abstract: 'x' }))).json()

    // Not a security hole: `canViewShowcase` still refuses `link_only` via slug,
    // so the worst case is a link that 404s, never one that over-shares.
    expect(body.showcase.shareUrl).toBe('/showcase/mould-growth-ab12cd')
  })
})

describe('P0-R3 — every write re-derives the revision', () => {
  it('syncs the revision after an ordinary edit', async () => {
    mocks.findUnique.mockResolvedValue(existing())

    await PUT(putReq({ abstract: 'rewritten' }))

    expect(mocks.syncShowcaseRevision).toHaveBeenCalledWith(
      expect.anything(),
      'sc_1',
      'user_1',
    )
  })

  it('records a `submitted` event against the digest when publishing public', async () => {
    mocks.findUnique.mockResolvedValue(existing({ assets: READY_ASSETS }))
    mocks.update.mockResolvedValue(saved({ privacyLevel: 'public', moderationStatus: 'pending_review' }))

    await PUT(putReq({ published: true, privacyLevel: 'public' }))

    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        showcaseId: 'sc_1',
        digest: 'd'.repeat(64),
        action: 'submitted',
        actorUserId: 'user_1',
      }),
    })
  })

  it('records an `unpublished` event when the team pulls it down', async () => {
    mocks.findUnique.mockResolvedValue(existing({ publishedAt: new Date(), moderationStatus: 'approved' }))

    await PUT(putReq({ published: false }))

    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'unpublished' }),
    })
  })

  it('records no moderation event for a self-serve link_only publish', async () => {
    mocks.findUnique.mockResolvedValue(existing({ assets: READY_ASSETS }))
    mocks.update.mockResolvedValue(saved({ privacyLevel: 'link_only', moderationStatus: 'approved' }))

    await PUT(putReq({ published: true, privacyLevel: 'link_only' }))

    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  // The response must reflect the POST-sync state: a client shown "approved"
  // after an edit that reset the showcase to review would be told a lie.
  it('responds from a re-read, not the pre-sync row', async () => {
    mocks.findUnique
      .mockResolvedValueOnce(existing({ moderationStatus: 'approved', privacyLevel: 'public' }))
      .mockResolvedValueOnce(saved({ moderationStatus: 'pending_review', privacyLevel: 'public' }))
    mocks.update.mockResolvedValue(saved({ moderationStatus: 'approved', privacyLevel: 'public' }))
    mocks.syncShowcaseRevision.mockResolvedValue({ digest: 'e'.repeat(64), invalidated: true })

    const body = await (await PUT(putReq({ abstract: 'changed after approval' }))).json()

    expect(body.showcase.moderationStatus).toBe('pending_review')
  })
})

describe('publish preconditions still hold', () => {
  it('refuses to publish without the required assets', async () => {
    mocks.findUnique.mockResolvedValue(existing({ assets: [{ assetType: 'board' }] }))

    const res = await PUT(putReq({ published: true, privacyLevel: 'public' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: expect.stringContaining('before publishing') })
    expect(mocks.syncShowcaseRevision).not.toHaveBeenCalled()
  })
})
