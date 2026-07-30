import { test, expect, request as playwrightRequest } from '@playwright/test'
import { api, gotoFresh, withSeedPage } from './api'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'
import { minimalPdfBytes, minimalPngBytes } from './fixtures'

/**
 * F4 — Showcase one-pager print export (`?print=1` on `/showcase/[slug]`).
 * One test per acceptance criterion (12 criteria total). Plan:
 * `.claude/pipeline/plan-F4.md`; implementation report (DOM contract):
 * `.claude/pipeline/changes-F4-print.md`.
 *
 * NOT the same file as `apps/web/e2e/F4.spec.ts` (the shipped showcase-moderation
 * spec for a different F4 that once lived at this id) — that file is untouched.
 * This spec follows its seeding/cleanup conventions (multipart asset upload,
 * request-context seeding, serial mode, self-cleaning afterAll) but targets the
 * print-view DOM instead of the moderation queue.
 *
 * Criterion → test mapping:
 *  AC1  — Editor top bar shows "Print one-pager" once a showcase is saved
 *  AC2  — That control is an <a> whose href ends with ?print=1 and targets /showcase/<slug>
 *  AC3  — Owner GET /showcase/<slug>?print=1 → 200 with data-print-onepager present
 *  AC4  — Short title text renders in the one-pager
 *  AC5  — Abstract text renders inline in the one-pager
 *  AC6  — PNG quad chart → <img data-onepager-quad="img"> whose src hits the asset-stream route
 *  AC7  — PDF quad chart → data-onepager-quad="link" present, no data-onepager-quad="img"
 *  AC8  — Works-Cited supplement renders inline (heading + bibliography text), not just a link
 *  AC9  — A known seeded link (video/repo URL) appears as visible text in the links section
 *  AC10 — Non-owner viewer, showcase not published+approved → 404 at ?print=1 (same gate as normal page)
 *  AC11 — Owner visiting ?print=1 does not increment the public view count
 *  AC12 — The print action bar carries data-print-hide (the @media print hook)
 *
 * Seeding strategy (rebuilt 2026-07-26):
 *  0. This file owns a DISPOSABLE LAB (`createLab`, e2e/lab.ts). `Showcase.teamId`
 *     is `@unique`, so F4 and F4-print were both driving ONE showcase row on the
 *     shared fixture team and overwriting each other's slug, privacy level and
 *     moderation status — two of this suite's last failures were that contention.
 *     The lab is created at the showcase phase, so the old probe/advance loop is
 *     gone too.
 *  1. PUT /api/showcase (link_only — self-serve/approved, avoids the moderation
 *     queue entirely since none of these ACs exercise moderation).
 *  2. POST /api/showcase/asset — board PDF + quad_chart PNG (required to publish).
 *  3. POST /api/showcase/asset/link — video + repo_link (known URLs for AC9).
 *  4. PUT /api/showcase { published: true } — self-serve approved (link_only).
 *  5. A Works-Cited `supplement` asset (AC8) and a PDF quad-chart variant (AC7)
 *     cannot be produced through any exposed API: `/api/showcase/asset/link`
 *     only ever writes {url, label} metadata (never the {kind: 'works_cited',
 *     text} shape `app/api/citations/export/route.ts` produces from real
 *     Citation rows), and `/api/showcase/asset` rejects a non-PNG quad_chart
 *     upload outright (415 "The quad chart must be a PNG image.") — the plan's
 *     own AC7 footnote anticipates this ("Tester seeds a PDF quad to exercise
 *     this branch"). Both are seeded directly via Prisma against the seeded
 *     E2E leader team's showcase only, and torn down in afterAll alongside the
 *     API-seeded assets.
 *
 * Tests run in serial: several reuse/rebuild the same showcase row and toggle
 * privacyLevel/published, so DB state mutations must not race (same rationale
 * as F4.spec.ts).
 */

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const RUN_ID = Date.now().toString(36)

/** Shared across serial tests. */
let lab: OwnedLab
let showcaseId: string | null = null
let showcaseSlug: string | null = null
/** `/showcase/<slug>` or `/showcase/<shareToken>`, per the privacy level. */
let showcaseShareUrl: string | null = null

/** Ids of assets seeded directly via Prisma (not through any exposed API) — torn
 * down explicitly in afterAll since the API-only cleanup path (DELETE
 * /api/showcase/asset/:id) still works fine for them, but we track them
 * separately for clarity about which rows bypassed the app's own validation. */
let worksCitedAssetId: string | null = null
let pdfQuadAssetId: string | null = null
let pngQuadAssetId: string | null = null

const SHORT_TITLE = `[E2E-F4Print-${RUN_ID}] Bioluminescent Algae Sensor`
const FULL_TITLE = `[E2E-F4Print-${RUN_ID}] A Bioluminescent Algae Biosensor for Heavy-Metal Water Contamination`
const ABSTRACT =
  `[E2E-F4Print-${RUN_ID}] We engineered a low-cost biosensor using bioluminescent algae to detect heavy-metal ` +
  'contamination in freshwater.\nLight output dropped proportionally with metal concentration across our trials.'
const VIDEO_URL = `https://www.youtube.com/watch?v=e2ef4print${RUN_ID}`
const REPO_URL = `https://github.com/e2e-f4print-${RUN_ID}/biosensor`
const WORKS_CITED_TEXT =
  `Works Cited (APA)\n\n` +
  `[E2E-F4Print-${RUN_ID}] Ada, A. (2024). Bioluminescent biosensors for heavy-metal detection. Journal of Applied Limnology, 12(3), 45-59.`

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('F4-print — Showcase one-pager print export', () => {
  // Several tests reuse/mutate the same showcase row (privacy/published toggles) —
  // serial avoids races, same rationale as e2e/F4.spec.ts.
  test.describe.configure({ mode: 'serial' })

  // ── Seed ─────────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    // Created BEFORE any browser work: it repoints the leader's `activeTeamId`,
    // so every request below lands on this file's own lab.
    lab = await createLab('f4-print')

    await withSeedPage(browser, 'leader', async (page) => {
      // 1. Upsert showcase (link_only — self-serve/approved; none of F4-print's ACs
      // exercise moderation, so there is no reason to route through pending_review).
      const putRes = await api.put(page, '/api/showcase', {
        data: {
          shortTitle: SHORT_TITLE,
          title: FULL_TITLE,
          abstract: ABSTRACT,
          privacyLevel: 'link_only',
        },
      })
      if (!putRes.ok()) {
        throw new Error(`Showcase PUT failed: ${putRes.status()} ${await putRes.text()}`)
      }
      const { showcase } = await putRes.json()
      showcaseId = showcase.id
      showcaseSlug = showcase.slug
      // The URL the app actually hands out. Since P1-R7 (v0.35.1) a `link_only`
      // showcase is reachable ONLY through its 128-bit share token, so the slug
      // is no longer what the print link points at — this spec asserted the slug
      // and had been failing ever since without anyone noticing.
      showcaseShareUrl = showcase.shareUrl

      // 2. Board PDF (required to publish).
      const boardRes = await api.post(page, '/api/showcase/asset', {
        multipart: {
          kind: 'board',
          file: { name: 'board.pdf', mimeType: 'application/pdf', buffer: Buffer.from(minimalPdfBytes()) },
        },
      })
      if (!boardRes.ok()) {
        throw new Error(`Board upload failed: ${boardRes.status()} ${await boardRes.text()}`)
      }

      // 3. Quad chart PNG (required to publish; also the AC6 fixture).
      const quadRes = await api.post(page, '/api/showcase/asset', {
        multipart: {
          kind: 'quad_chart',
          file: { name: 'quad.png', mimeType: 'image/png', buffer: Buffer.from(minimalPngBytes()) },
        },
      })
      if (!quadRes.ok()) {
        throw new Error(`Quad chart (PNG) upload failed: ${quadRes.status()} ${await quadRes.text()}`)
      }
      pngQuadAssetId = (await quadRes.json()).asset.id

      // 4. Video + repo links (required to publish / AC9 fixtures).
      const videoRes = await api.post(page, '/api/showcase/asset/link', {
        data: { assetType: 'video', url: VIDEO_URL },
      })
      if (!videoRes.ok()) {
        throw new Error(`Video link failed: ${videoRes.status()} ${await videoRes.text()}`)
      }

      const repoRes = await api.post(page, '/api/showcase/asset/link', {
        data: { assetType: 'repo_link', url: REPO_URL },
      })
      if (!repoRes.ok()) {
        throw new Error(`Repo link failed: ${repoRes.status()} ${await repoRes.text()}`)
      }

      // 5. Publish (link_only → self-serve approved, no teacher step, no pending_review).
      const publishRes = await api.put(page, '/api/showcase', {
        data: { privacyLevel: 'link_only', published: true },
      })
      if (!publishRes.ok()) {
        throw new Error(`Publish failed: ${publishRes.status()} ${await publishRes.text()}`)
      }
      const { showcase: published } = await publishRes.json()
      if (published.moderationStatus !== 'approved') {
        throw new Error(`Expected approved after link_only publish; got '${published.moderationStatus}'`)
      }
    })

    // 6. Works-Cited supplement (AC8). No exposed API writes the
    // {kind: 'works_cited', text} metadata shape without real Citation rows
    // (see file header) — seed it directly, scoped to this showcase only.
    const asset = await e2eDb.showcaseAsset.create({
      data: {
        showcaseId: showcaseId!,
        assetType: 'supplement',
        metadataJson: {
          kind: 'works_cited',
          style: 'apa',
          label: 'Works Cited',
          generatedAt: new Date().toISOString(),
          text: WORKS_CITED_TEXT,
        },
      },
      select: { id: true },
    })
    worksCitedAssetId = asset.id
  })

  test.afterAll(async () => {
    // No hand-written unpublish/asset sweep: disposal removes the whole lab
    // through the same ordered inventory `reset:e2e` uses. That also covers the
    // Prisma-seeded works-cited and PDF-quad assets, which the old API-only
    // cleanup could only reach while the session held.
    await lab?.dispose()
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────────
  test('AC1: editor top bar shows "Print one-pager" once a showcase is saved', async ({ page }) => {
    await gotoFresh(page, '/showcase/edit')

    await expect(page.getByRole('link', { name: /Print one-pager/i })).toBeVisible({ timeout: 8000 })
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────────
  test('AC2: the control is an anchor whose href ends with ?print=1 and targets the shareable URL', async ({
    page,
  }) => {
    if (!showcaseShareUrl) throw new Error('Showcase share URL not set — beforeAll failed')
    await gotoFresh(page, '/showcase/edit')

    const link = page.getByRole('link', { name: /Print one-pager/i })
    await expect(link).toBeVisible({ timeout: 8000 })
    // Asserted against the server's own `shareUrl`, not a hardcoded slug: this
    // showcase is `link_only`, so that URL carries the 128-bit share token
    // (P1-R7). Following the server's answer keeps the assertion true whichever
    // privacy level the fixture uses.
    await expect(link).toHaveAttribute('href', `${showcaseShareUrl}?print=1`)
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────────
  test('AC3: owner GET /showcase/<slug>?print=1 returns 200 with data-print-onepager present', async ({
    page,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first (documented convention — see e2e/F4.spec.ts:518 / the batch
    // instructions) so the leader session is fresh before the owner GET below.
    await gotoFresh(page, '/showcase/edit')
    const res = await api.get(page, `/showcase/${showcaseSlug}?print=1`)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-print-onepager')
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────────
  test('AC4: the short title text renders in the one-pager', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    await expect(page.locator('[data-print-onepager]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: SHORT_TITLE })).toBeVisible()
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────────
  test('AC5: the saved abstract text renders inline', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    // Abstract has an embedded newline — match on the distinctive first line, which
    // is unique to this run (RUN_ID-tagged) and avoids whitespace-normalization
    // pitfalls from matching the full multi-line string.
    await expect(page.getByText(`[E2E-F4Print-${RUN_ID}] We engineered a low-cost biosensor`)).toBeVisible()
  })

  // ── AC6 ───────────────────────────────────────────────────────────────────────
  test('AC6: PNG quad chart renders as data-onepager-quad="img" via the asset-stream route', async ({
    page,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    const quadImg = page.locator('[data-onepager-quad="img"]')
    await expect(quadImg).toBeVisible()
    const src = await quadImg.getAttribute('src')
    expect(src).toContain('/api/showcase/public/asset?id=')
  })

  // ── AC7 ───────────────────────────────────────────────────────────────────────
  // Swaps the quad chart to a PDF-backed asset for the duration of this test only,
  // then restores the PNG so AC6/AC9/AC11 (which run after it) see the original
  // fixture. No exposed upload API can create this state (POST
  // /api/showcase/asset rejects a non-PNG quad_chart with 415) — seeded directly
  // via Prisma, scoped to this showcase's id only.
  test('AC7: PDF quad chart renders data-onepager-quad="link" and no data-onepager-quad="img"', async ({
    page,
  }) => {
    if (!showcaseSlug || !showcaseId) throw new Error('Showcase slug/id not set')

    try {
      // Remove the PNG quad chart and replace it with a PDF-backed row using the
      // same storage-key convention the real upload route uses
      // (`showcase/<teamId>/<uuid>.pdf`), so `isPdf(fileUrl)` (an endsWith('.pdf')
      // check per the plan) resolves true.
      if (pngQuadAssetId) {
        await e2eDb.showcaseAsset.deleteMany({ where: { id: pngQuadAssetId } })
      }
      const teamRow = await e2eDb.showcase.findUnique({ where: { id: showcaseId }, select: { teamId: true } })
      const pdfAsset = await e2eDb.showcaseAsset.create({
        data: {
          showcaseId,
          assetType: 'quad_chart',
          fileUrl: `showcase/${teamRow!.teamId}/${RUN_ID}-quad.pdf`,
        },
        select: { id: true },
      })
      pdfQuadAssetId = pdfAsset.id

      await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)
      await expect(page.locator('[data-print-onepager]')).toBeVisible()
      await expect(page.locator('[data-onepager-quad="link"]')).toBeVisible()
      await expect(page.locator('[data-onepager-quad="img"]')).toHaveCount(0)
    } finally {
      // Restore: remove the PDF row, recreate the PNG quad chart via the real
      // upload API so subsequent tests (AC9, AC11) see the original fixture.
      if (pdfQuadAssetId) {
        await e2eDb.showcaseAsset.deleteMany({ where: { id: pdfQuadAssetId } })
      }

      // Navigate (real browser page) before the page.request call — refreshes the
      // leader session rather than relying on a bare playwrightRequest context,
      // which can go stale this deep into a serial suite (documented convention;
      // see e2e/F4.spec.ts:518 / the batch instructions).
      await gotoFresh(page, '/showcase/edit')
      const quadRes = await api.post(page, '/api/showcase/asset', {
        multipart: {
          kind: 'quad_chart',
          file: { name: 'quad.png', mimeType: 'image/png', buffer: Buffer.from(minimalPngBytes()) },
        },
      })
      if (!quadRes.ok()) {
        throw new Error(`Restoring PNG quad chart failed: ${quadRes.status()} ${await quadRes.text()}`)
      }
      pngQuadAssetId = (await quadRes.json()).asset.id
    }
  })

  // ── AC8 ───────────────────────────────────────────────────────────────────────
  test('AC8: Works-Cited supplement renders inline (heading + bibliography text)', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    if (!worksCitedAssetId) throw new Error('Works-Cited asset not seeded — beforeAll failed')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    await expect(page.getByRole('heading', { name: 'Works Cited' })).toBeVisible()
    // The bibliography text itself — not merely a link to it — must be present.
    await expect(
      page.getByText(`[E2E-F4Print-${RUN_ID}] Ada, A. (2024). Bioluminescent biosensors`),
    ).toBeVisible()
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────────
  test('AC9: a known seeded link URL appears as visible text in the links section', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    await expect(page.getByText(VIDEO_URL)).toBeVisible()
    await expect(page.getByText(REPO_URL)).toBeVisible()
  })

  // ── AC10 ──────────────────────────────────────────────────────────────────────
  // Uses the `page` fixture (the leader session) for every leader-side mutation
  // instead of a bare playwrightRequest.newContext: this deep into a serial
  // suite a static storageState-loaded context can hold an expired Clerk session
  // whose non-GET requests get redirected to /sign-in (a real, if intermittent,
  // dev-mode failure mode independently confirmed against this fixture — a POST
  // with a stale session redirects to /sign-in, and Next dev's Server Action
  // manifest 500s trying to render that redirect target as a POST). A real
  // browser `page` runs clerk-js on every navigation, which keeps the session
  // alive, exactly like every other page-based test in this file already relies
  // on. A separate teacher-side `withSeedPage` session (a fresh authed page) is
  // used for the actual assertion (GET-only — never observed to fail in that role here).
  test('AC10: a non-owner viewer for whom the showcase is not published+approved gets 404 at ?print=1', async ({
    page,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first (documented convention — see e2e/F4.spec.ts:518 / the batch
    // instructions) so the leader session is fresh before the mutate below.
    await gotoFresh(page, '/showcase/edit')

    // Switch privacy to 'private'. NOTE: the viewer below must be SIGNED OUT,
    // not the seeded teacher. Since P0-R3 (v0.35.0) `canViewShowcase` grants the
    // team's own teacher every revision in every state (`moderatorTeamIds`), and
    // the seed makes that teacher own this leader's class — so asserting 404 for
    // them now pins the very moderator-preview that P0-R3 added. A signed-out
    // visitor is the genuine stranger, the same correction `F4.spec.ts` AC3
    // already carries.
    const privRes = await api.put(page, '/api/showcase', { data: { privacyLevel: 'private' } })
    expect(privRes.ok()).toBe(true)
    expect((await privRes.json()).showcase.privacyLevel).toBe('private')

    // A genuinely unauthenticated client. `browser.newContext()` is NOT signed
    // out against a Clerk development instance (the dev-browser handshake
    // restores the LEADER's session, and this showcase is theirs), and
    // `playwrightRequest.newContext` inherits a storage state unless
    // `storageState: undefined` is passed EXPLICITLY. See e2e/F4.spec.ts AC3.
    const anonRequest = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: undefined,
    })
    try {
      for (const url of [`/showcase/${showcaseSlug}?print=1`, `/showcase/${showcaseSlug}`]) {
        const html = await (await anonRequest.get(url)).text()
        expect(html, `a signed-out visitor was served ${url}`).toContain(
          'This page could not be found.',
        )
        expect(html).not.toContain(ABSTRACT)
      }
    } finally {
      await anonRequest.dispose()
      // Restore to link_only for the remaining tests (AC11, AC12). Re-navigate
      // first for the same session-freshness reason as above.
      await gotoFresh(page, '/showcase/edit')
      const restoreRes = await api.put(page, '/api/showcase', { data: { privacyLevel: 'link_only' } })
      expect(restoreRes.ok()).toBe(true)
    }
  })

  // ── AC11 ──────────────────────────────────────────────────────────────────────
  test('AC11: owner visiting ?print=1 does not increment the public view count', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first to establish session cookies before any page.request call
    // (documented convention — see e2e/F4.spec.ts:518 / the batch instructions).
    await gotoFresh(page, '/showcase/edit')

    const beforeRes = await api.get(page, '/api/showcase')
    expect(beforeRes.ok()).toBe(true)
    const beforeViews = (await beforeRes.json()).showcase.views as number

    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)
    await expect(page.locator('[data-print-onepager]')).toBeVisible()

    const afterRes = await api.get(page, '/api/showcase')
    expect(afterRes.ok()).toBe(true)
    const afterViews = (await afterRes.json()).showcase.views as number

    expect(afterViews).toBe(beforeViews)
  })

  // ── AC12 ──────────────────────────────────────────────────────────────────────
  test('AC12: the print action bar carries data-print-hide (the @media print hook)', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await gotoFresh(page, `/showcase/${showcaseSlug}?print=1`)

    const actionsBar = page.locator('[data-print-hide]')
    await expect(actionsBar).toHaveCount(1)
    await expect(actionsBar).toBeVisible()
    await expect(actionsBar.getByText('Back to showcase')).toBeVisible()
  })
})
