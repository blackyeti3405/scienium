import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The public showcase page's RENDER boundary (REFACTOR2 P2-3).
 *
 * Every stored URL on this page was validated when it was written — the link
 * route runs `isSafeHttpUrl` on plain links and builds `embedUrl` with
 * `parseVideoUrl`. That check is not what protects a reader: rows written
 * before it existed, or edited straight in the database, still flow into an
 * `<a href>` and an `<iframe src>` on an anonymous, public page.
 *
 * So these tests construct exactly those LEGACY rows — bypassing the write path
 * entirely, as legacy data does — and render the real page component to static
 * markup, asserting the boundary neutralizes them: a non-provider embed frames
 * nothing, a `javascript:`/`data:` link is listed as inert text instead of a
 * link, and the honest row alongside them still renders normally.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  showcaseFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  viewCreate: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth, currentUser: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findFirst: mocks.showcaseFindFirst },
    user: { findUnique: mocks.userFindUnique },
    showcaseView: { create: mocks.viewCreate },
  },
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7', 'user-agent': 'vitest' }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

import PublicShowcasePage from '@/app/(public)/showcase/[slug]/page'
import { VideoPreview } from '@/components/showcase/editor/VideoPreview'
import { showcaseContentDigest } from '@/lib/showcase-server'

const GOOD_EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'

type LegacyAsset = { assetType: string; metadataJson: unknown }

/**
 * An approved, public showcase whose assets are whatever the caller passes —
 * including shapes the write path would reject today. `approvedDigest` is
 * computed from those same rows so the P0-R3 revision check passes and the page
 * actually renders (otherwise it would 404 and prove nothing).
 */
function showcaseWith(assets: LegacyAsset[]) {
  const sc = {
    id: 'sc_1',
    teamId: 'team_1',
    slug: 'mould-growth-abc123',
    shareToken: 'Zm9vYmFyYmF6cXV4MTIzNA',
    shortTitle: 'Mould',
    title: 'Mould growth on bread',
    abstract: 'We measured mould growth on bread.',
    privacyLevel: 'public',
    publishedAt: new Date('2026-01-01'),
    moderationStatus: 'approved',
    takedownAt: null,
    assets: assets.map((a, i) => ({ id: `asset_${i}`, fileUrl: null, ...a })),
    team: { name: 'Team Spore', labType: 'bio_lab', members: [{ user: { schoolId: 'school_A' } }] },
    _count: { views: 3 },
  }
  return { ...sc, approvedDigest: showcaseContentDigest(sc) }
}

async function render(assets: LegacyAsset[], print = false): Promise<string> {
  mocks.showcaseFindFirst.mockResolvedValue(showcaseWith(assets))
  const el = await PublicShowcasePage({
    params: Promise.resolve({ slug: 'mould-growth-abc123' }),
    searchParams: Promise.resolve(print ? { print: '1' } : {}),
  })
  return renderToStaticMarkup(el)
}

beforeEach(() => {
  vi.clearAllMocks()
  // Anonymous visitor — the case the whole boundary exists for.
  mocks.auth.mockResolvedValue({ userId: null })
  mocks.viewCreate.mockResolvedValue({})
})

describe('public showcase page — embed render boundary', () => {
  it('renders a canonical provider embed (positive control)', async () => {
    const html = await render([{ assetType: 'video', metadataJson: { embedUrl: GOOD_EMBED } }])
    expect(html).toContain(`src="${GOOD_EMBED}"`)
  })

  it('frames nothing for a legacy embedUrl on a non-provider host', async () => {
    const html = await render([
      { assetType: 'video', metadataJson: { provider: 'youtube', videoId: 'x', embedUrl: 'https://evil.example.com/embed/xyz' } },
    ])
    expect(html).not.toContain('evil.example.com')
    expect(html).not.toContain('<iframe')
  })

  it('frames nothing for a legacy embedUrl with a javascript: scheme', async () => {
    const html = await render([
      { assetType: 'demo_video', metadataJson: { embedUrl: 'javascript:alert(1)' } },
    ])
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<iframe')
  })

  it('re-pins a legacy provider URL that was never canonicalized', async () => {
    // Written before the route normalized to youtube-nocookie: still a named
    // provider host, so it renders — as the canonical embed, not as stored.
    const html = await render([
      { assetType: 'video', metadataJson: { embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' } },
    ])
    expect(html).toContain(`src="${GOOD_EMBED}"`)
  })
})

describe('public showcase page — link render boundary', () => {
  it('renders a safe stored link as a link (positive control)', async () => {
    const html = await render([
      { assetType: 'repo_link', metadataJson: { url: 'https://github.com/team/spore', label: 'Code repo' } },
    ])
    expect(html).toContain('href="https://github.com/team/spore"')
    expect(html).toContain('Code repo')
  })

  it('degrades a legacy javascript: link to inert text, keeping the label', async () => {
    const html = await render([
      { assetType: 'repo_link', metadataJson: { url: 'javascript:alert(1)', label: 'Code repo' } },
    ])
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('href="javascript')
    // The resource is still listed — it just isn't clickable.
    expect(html).toContain('Code repo')
    expect(html).toContain('sc-show__link--inert')
  })

  it('degrades legacy data:/vbscript:/protocol-relative supplement links', async () => {
    const html = await render([
      { assetType: 'supplement', metadataJson: { url: 'data:text/html,<script>alert(1)</script>', label: 'Data blob' } },
      { assetType: 'supplement', metadataJson: { url: 'vbscript:msgbox(1)', label: 'VB blob' } },
      { assetType: 'supplement', metadataJson: { url: '//evil.example.com/x', label: 'Protocol relative' } },
    ])
    expect(html).not.toContain('data:text/html')
    expect(html).not.toContain('vbscript:')
    expect(html).not.toContain('evil.example.com')
    for (const label of ['Data blob', 'VB blob', 'Protocol relative']) expect(html).toContain(label)
  })
})

// The team's own editor renders the SAME stored `embedUrl`, so the gate has to
// hold on both sides of the page — one legacy row, two render points.
describe('editor VideoPreview — embed render boundary', () => {
  const preview = (metadata: Record<string, unknown>) =>
    renderToStaticMarkup(
      createElement(VideoPreview, {
        asset: { id: 'a1', assetType: 'video', url: null, metadata },
        onRemove: () => {},
      }),
    )

  it('frames a canonical provider embed (positive control)', () => {
    expect(preview({ embedUrl: GOOD_EMBED, url: 'https://youtu.be/dQw4w9WgXcQ' })).toContain(`src="${GOOD_EMBED}"`)
  })

  it('frames nothing for a legacy non-provider embedUrl', () => {
    const html = preview({ embedUrl: 'https://evil.example.com/embed/xyz', url: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(html).not.toContain('evil.example.com')
    expect(html).not.toContain('<iframe')
  })
})

describe('print one-pager — link render boundary', () => {
  it('prints safe URLs and omits unsafe legacy ones', async () => {
    const html = await render(
      [
        { assetType: 'repo_link', metadataJson: { url: 'https://github.com/team/spore', label: 'Code repo' } },
        { assetType: 'supplement', metadataJson: { url: 'javascript:alert(1)', label: 'Bad supplement' } },
      ],
      true,
    )
    expect(html).toContain('https://github.com/team/spore')
    expect(html).not.toContain('javascript:')
  })
})
