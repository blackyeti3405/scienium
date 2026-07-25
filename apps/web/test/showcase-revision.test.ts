import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Showcase approval is bound to a REVISION, not to the showcase (P0-R3).
 *
 * `moderationStatus = 'approved'` used to be a mutable flag: an approved public
 * showcase could change its title/abstract or replace its board, quad chart, and
 * video and stay approved. These pin the two halves of the fix — the digest
 * covers everything a reviewer sees, and any covered change atomically returns
 * the showcase to review with an append-only event recording why.
 */

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(() => Promise.resolve({})),
  eventCreate: vi.fn(() => Promise.resolve({})),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/env', () => ({ viewFingerprintSalt: () => 'x'.repeat(16) }))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.findUnique, update: mocks.update },
    showcaseModerationEvent: { create: mocks.eventCreate },
  },
}))

import { db } from '@/lib/db'
import {
  requiresReview,
  showcaseContentDigest,
  syncShowcaseRevision,
} from '@/lib/showcase-server'

const BOARD = { assetType: 'board', fileUrl: 'showcase/t1/board.pdf', metadataJson: null }
const QUAD = { assetType: 'quad_chart', fileUrl: 'showcase/t1/quad.png', metadataJson: null }
const VIDEO = { assetType: 'video', fileUrl: null, metadataJson: { url: 'https://youtu.be/aaa' } }

const approved = {
  shortTitle: 'Mould',
  title: 'Mould growth on bread',
  abstract: 'We grew mould.',
  privacyLevel: 'public',
  moderationStatus: 'approved',
  assets: [BOARD, QUAD, VIDEO],
}

/** The digest a teacher approved, for a showcase in its reviewed state. */
const APPROVED_DIGEST = showcaseContentDigest(approved)

function stored(overrides: Record<string, unknown> = {}) {
  return {
    ...approved,
    approvedDigest: APPROVED_DIGEST,
    contentDigest: APPROVED_DIGEST,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({})
  mocks.eventCreate.mockResolvedValue({})
})

describe('showcaseContentDigest', () => {
  it('is stable for identical content', () => {
    expect(showcaseContentDigest(approved)).toBe(showcaseContentDigest({ ...approved }))
  })

  it('does not depend on asset order', () => {
    expect(showcaseContentDigest({ ...approved, assets: [VIDEO, BOARD, QUAD] })).toBe(
      APPROVED_DIGEST,
    )
  })

  it('changes when any covered field changes', () => {
    for (const edit of [
      { shortTitle: 'Something else' },
      { title: 'A different project' },
      { abstract: 'Rewritten after approval.' },
      { privacyLevel: 'link_only' },
    ]) {
      expect(showcaseContentDigest({ ...approved, ...edit })).not.toBe(APPROVED_DIGEST)
    }
  })

  it('changes when a required asset is replaced or removed', () => {
    const swappedBoard = { ...BOARD, fileUrl: 'showcase/t1/board-v2.pdf' }
    expect(showcaseContentDigest({ ...approved, assets: [swappedBoard, QUAD, VIDEO] })).not.toBe(
      APPROVED_DIGEST,
    )
    const swappedVideo = { ...VIDEO, metadataJson: { url: 'https://youtu.be/zzz' } }
    expect(showcaseContentDigest({ ...approved, assets: [BOARD, QUAD, swappedVideo] })).not.toBe(
      APPROVED_DIGEST,
    )
    expect(showcaseContentDigest({ ...approved, assets: [BOARD, QUAD] })).not.toBe(APPROVED_DIGEST)
  })
})

describe('requiresReview', () => {
  it('gates public and explicitly accepts the narrower modes', () => {
    expect(requiresReview('public')).toBe(true)
    expect(requiresReview('link_only')).toBe(false)
    expect(requiresReview('private')).toBe(false)
  })
})

describe('syncShowcaseRevision', () => {
  it('is a no-op when nothing covered changed', async () => {
    mocks.findUnique.mockResolvedValue(stored())

    const out = await syncShowcaseRevision(db, 'sc_1')

    expect(out.invalidated).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  it('edit-after-approval returns the showcase to review and clears the approval', async () => {
    mocks.findUnique.mockResolvedValue(stored({ abstract: 'Rewritten after approval.' }))

    const out = await syncShowcaseRevision(db, 'sc_1', 'user_1')

    expect(out.invalidated).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: 'pending_review',
          approvedDigest: null,
          contentDigest: out.digest,
        }),
      }),
    )
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'revision_invalidated', actorUserId: 'user_1' }),
    })
  })

  it('replace-after-approval (a new board PDF) also returns it to review', async () => {
    mocks.findUnique.mockResolvedValue(
      stored({ assets: [{ ...BOARD, fileUrl: 'showcase/t1/board-v2.pdf' }, QUAD, VIDEO] }),
    )

    expect((await syncShowcaseRevision(db, 'sc_1')).invalidated).toBe(true)
  })

  it('records the new digest without a reset for an unreviewed mode', async () => {
    mocks.findUnique.mockResolvedValue(
      stored({ privacyLevel: 'link_only', abstract: 'edited' }),
    )

    const out = await syncShowcaseRevision(db, 'sc_1')

    expect(out.invalidated).toBe(false)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { contentDigest: out.digest } }),
    )
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  it('does not resurrect a rejected showcase into review', async () => {
    mocks.findUnique.mockResolvedValue(
      stored({ moderationStatus: 'rejected', approvedDigest: null, abstract: 'resubmitting' }),
    )

    const out = await syncShowcaseRevision(db, 'sc_1')

    expect(out.invalidated).toBe(false)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { contentDigest: out.digest } }),
    )
  })
})
