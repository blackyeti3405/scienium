import { test, expect } from '@playwright/test'
import { STORAGE } from './roles'
import { api, withSeedPage } from './api'

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
 * Seeding strategy (mirrors F4.spec.ts's beforeAll):
 *  0. Probe /api/showcase; if phase-gated, advance working→showcase and have the
 *     teacher approve (same dance as F4.spec.ts). If the team is further back
 *     than 'working', this step cannot self-serve past a teacher/class link that
 *     does not exist in this dev fixture — the test fails loudly with a clear
 *     message rather than silently skipping, so a real gap is visible.
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

// Minimal valid PDF: %PDF- magic bytes plus enough structure for sharp/S3.
function minimalPdfBytes(): Uint8Array {
  const content =
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n' +
    '0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  return new TextEncoder().encode(content)
}

// Minimal valid 1×1 transparent PNG (68-byte standard sequence).
function minimalPngBytes(): Uint8Array {
  const hex =
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000000200012766011e0000000049454e44ae426082'
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Shared across serial tests. */
let showcaseId: string | null = null
let showcaseSlug: string | null = null

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
    await withSeedPage(browser, 'leader', async (page) => {
      // 0. Probe whether the showcase feature is reachable; self-advance the team
      // until it is. Advancement is self-paced now — each POST bumps one phase
      // (research_planning → working → showcase), no teacher approval. A dev
      // fixture may sit a couple of phases back, so loop a few times.
      for (let i = 0; i < 4; i++) {
        const probeRes = await api.get(page, '/api/showcase')
        // ok() = showcase exists; 404 = no showcase yet but the phase is fine.
        if (probeRes.ok() || probeRes.status() === 404) break
        if (probeRes.status() !== 403) {
          throw new Error(`Unexpected showcase probe: ${probeRes.status()} ${await probeRes.text()}`)
        }
        const advanceRes = await api.post(page, '/api/team/advance-phase', { data: {} })
        if (!advanceRes.ok()) {
          throw new Error(`Phase advance failed: ${advanceRes.status()} ${await advanceRes.text()}`)
        }
      }

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
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      const asset = await db.showcaseAsset.create({
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
    } finally {
      await db.$disconnect()
    }
  })

  test.afterAll(async ({ browser }) => {
    // A fresh page + navigate first refreshes the Clerk session before any
    // page.request call (documented convention — see e2e/F4.spec.ts:518 / the
    // batch instructions) — the whole suite above can run long enough for a
    // bare playwrightRequest.newContext's session to go stale, which silently
    // serves an HTML sign-in page with a 200 status instead of throwing, so
    // `.ok()` alone is not a reliable staleness check.
    const context = await browser.newContext({ storageState: STORAGE.leader, baseURL: BASE_URL })
    const page = await context.newPage()
    try {
      await page.goto('/showcase/edit')

      // Best-effort cleanup: unpublish so the seeded showcase doesn't pollute the
      // gallery/queue, then remove every asset this suite created.
      await api.put(page, '/api/showcase', { data: { published: false } }).catch(() => {})

      const getRes = await api.get(page, '/api/showcase').catch(() => null)
      const contentType = getRes?.headers()['content-type'] ?? ''
      if (getRes?.ok() && contentType.includes('application/json')) {
        const { showcase } = await getRes.json()
        for (const asset of (showcase?.assets ?? []) as Array<{ id: string }>) {
          const delRes = await api.delete(page, `/api/showcase/asset/${asset.id}`).catch(() => null)
          if (!delRes?.ok()) {
            console.error(`afterAll cleanup: failed to delete asset ${asset.id}: ${delRes?.status()}`)
          }
        }
      } else {
        console.error(
          `afterAll cleanup: GET /api/showcase did not return JSON after tests (status ${getRes?.status()}, ` +
            `content-type '${contentType}') — asset cleanup skipped; the seeded showcase and its assets ` +
            `remain and must be cleared manually before the next run.`,
        )
      }
    } finally {
      await context.close()
    }

    // The PDF-quad-chart variant (AC7) is created and torn down inside its own
    // test body (it temporarily replaces the PNG quad chart mid-suite), so it is
    // not tracked here — see AC7's test.
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────────
  test('AC1: editor top bar shows "Print one-pager" once a showcase is saved', async ({ page }) => {
    await page.goto('/showcase/edit')

    await expect(page.getByRole('link', { name: /Print one-pager/i })).toBeVisible({ timeout: 8000 })
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────────
  test('AC2: the control is an anchor whose href ends with ?print=1 and targets /showcase/<slug>', async ({
    page,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set — beforeAll failed')
    await page.goto('/showcase/edit')

    const link = page.getByRole('link', { name: /Print one-pager/i })
    await expect(link).toBeVisible({ timeout: 8000 })
    await expect(link).toHaveAttribute('href', `/showcase/${showcaseSlug}?print=1`)
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────────
  test('AC3: owner GET /showcase/<slug>?print=1 returns 200 with data-print-onepager present', async ({
    page,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first (documented convention — see e2e/F4.spec.ts:518 / the batch
    // instructions) so the leader session is fresh before the owner GET below.
    await page.goto('/showcase/edit')
    const res = await api.get(page, `/showcase/${showcaseSlug}?print=1`)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-print-onepager')
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────────
  test('AC4: the short title text renders in the one-pager', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

    await expect(page.locator('[data-print-onepager]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: SHORT_TITLE })).toBeVisible()
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────────
  test('AC5: the saved abstract text renders inline', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

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
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

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

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    try {
      // Remove the PNG quad chart and replace it with a PDF-backed row using the
      // same storage-key convention the real upload route uses
      // (`showcase/<teamId>/<uuid>.pdf`), so `isPdf(fileUrl)` (an endsWith('.pdf')
      // check per the plan) resolves true.
      if (pngQuadAssetId) {
        await db.showcaseAsset.deleteMany({ where: { id: pngQuadAssetId } })
      }
      const teamRow = await db.showcase.findUnique({ where: { id: showcaseId }, select: { teamId: true } })
      const pdfAsset = await db.showcaseAsset.create({
        data: {
          showcaseId,
          assetType: 'quad_chart',
          fileUrl: `showcase/${teamRow!.teamId}/${RUN_ID}-quad.pdf`,
        },
        select: { id: true },
      })
      pdfQuadAssetId = pdfAsset.id

      await page.goto(`/showcase/${showcaseSlug}?print=1`)
      await expect(page.locator('[data-print-onepager]')).toBeVisible()
      await expect(page.locator('[data-onepager-quad="link"]')).toBeVisible()
      await expect(page.locator('[data-onepager-quad="img"]')).toHaveCount(0)
    } finally {
      // Restore: remove the PDF row, recreate the PNG quad chart via the real
      // upload API so subsequent tests (AC9, AC11) see the original fixture.
      if (pdfQuadAssetId) {
        await db.showcaseAsset.deleteMany({ where: { id: pdfQuadAssetId } })
      }
      await db.$disconnect()

      // Navigate (real browser page) before the page.request call — refreshes the
      // leader session rather than relying on a bare playwrightRequest context,
      // which can go stale this deep into a serial suite (documented convention;
      // see e2e/F4.spec.ts:518 / the batch instructions).
      await page.goto('/showcase/edit')
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
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

    await expect(page.getByRole('heading', { name: 'Works Cited' })).toBeVisible()
    // The bibliography text itself — not merely a link to it — must be present.
    await expect(
      page.getByText(`[E2E-F4Print-${RUN_ID}] Ada, A. (2024). Bioluminescent biosensors`),
    ).toBeVisible()
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────────
  test('AC9: a known seeded link URL appears as visible text in the links section', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

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
    browser,
  }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first (documented convention — see e2e/F4.spec.ts:518 / the batch
    // instructions) so the leader session is fresh before the mutate below.
    await page.goto('/showcase/edit')

    // Switch privacy to 'private' — the teacher (not a team member) can never
    // qualify under canViewShowcase for a private showcase, print or not.
    const privRes = await api.put(page, '/api/showcase', { data: { privacyLevel: 'private' } })
    expect(privRes.ok()).toBe(true)
    expect((await privRes.json()).showcase.privacyLevel).toBe('private')

    try {
      // Teacher is a DIFFERENT role than this test's leader page — make the
      // role-gate GETs from a fresh teacher-authed page so its Clerk token can't
      // go stale mid-suite.
      await withSeedPage(browser, 'teacher', async (teacherPage) => {
        // The slug page streams behind its loading.tsx, so Next can flush a
        // 200 shell before notFound() runs — the HTTP status is a render-speed
        // race. Assert the rendered privacy outcome (not-found UI, zero
        // content) instead of the status code.
        await teacherPage.goto(`/showcase/${showcaseSlug}?print=1`)
        await expect(teacherPage.getByText('This page could not be found.')).toBeVisible({
          timeout: 10000,
        })
        await expect(teacherPage.getByText(SHORT_TITLE)).toHaveCount(0)

        // Same viewer, same showcase, no ?print=1 — denied identically (the
        // flag grants no extra access).
        await teacherPage.goto(`/showcase/${showcaseSlug}`)
        await expect(teacherPage.getByText('This page could not be found.')).toBeVisible({
          timeout: 10000,
        })
        await expect(teacherPage.getByText(SHORT_TITLE)).toHaveCount(0)
      })
    } finally {
      // Restore to link_only for the remaining tests (AC11, AC12). Re-navigate
      // first for the same session-freshness reason as above.
      await page.goto('/showcase/edit')
      const restoreRes = await api.put(page, '/api/showcase', { data: { privacyLevel: 'link_only' } })
      expect(restoreRes.ok()).toBe(true)
    }
  })

  // ── AC11 ──────────────────────────────────────────────────────────────────────
  test('AC11: owner visiting ?print=1 does not increment the public view count', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')

    // Navigate first to establish session cookies before any page.request call
    // (documented convention — see e2e/F4.spec.ts:518 / the batch instructions).
    await page.goto('/showcase/edit')

    const beforeRes = await api.get(page, '/api/showcase')
    expect(beforeRes.ok()).toBe(true)
    const beforeViews = (await beforeRes.json()).showcase.views as number

    await page.goto(`/showcase/${showcaseSlug}?print=1`)
    await expect(page.locator('[data-print-onepager]')).toBeVisible()

    const afterRes = await api.get(page, '/api/showcase')
    expect(afterRes.ok()).toBe(true)
    const afterViews = (await afterRes.json()).showcase.views as number

    expect(afterViews).toBe(beforeViews)
  })

  // ── AC12 ──────────────────────────────────────────────────────────────────────
  test('AC12: the print action bar carries data-print-hide (the @media print hook)', async ({ page }) => {
    if (!showcaseSlug) throw new Error('Showcase slug not set')
    await page.goto(`/showcase/${showcaseSlug}?print=1`)

    const actionsBar = page.locator('[data-print-hide]')
    await expect(actionsBar).toHaveCount(1)
    await expect(actionsBar).toBeVisible()
    await expect(actionsBar.getByText('Back to showcase')).toBeVisible()
  })
})
