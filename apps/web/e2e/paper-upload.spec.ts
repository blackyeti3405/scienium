import { test, expect } from './test'
import { type Browser } from '@playwright/test'
import { api, withSeedPage } from './api'
import { createLab, type OwnedLab } from './lab'
import { e2eDb } from './db'
import { minimalPdfBytes } from './fixtures'

/**
 * Paper upload (`POST /api/papers`) — coverage for the workflow extracted into
 * `lib/papers/service.ts` (REFACTOR2 §3.2 E).
 *
 * This route had NO E2E coverage before, which is why the extraction needed its
 * own: moving validate → fingerprint → parse → relevance-gate → persist → store
 * → ingest out of the route adapter is exactly the kind of change that typechecks
 * cleanly while breaking at runtime.
 *
 * The assertions walk the service's rejection ladder in order, then the success
 * path, so a regression tells you WHICH step broke rather than just "upload failed".
 *
 * CLEANUP GOES THROUGH THE REAL DELETION LIFECYCLE (REFACTOR2 P1-S15). This spec
 * used to tidy up with `e2eDb.paper.deleteMany` — a direct row delete that skips
 * the route entirely, so the `UploadedAsset` row stayed `attached` pointing at a
 * paper that no longer existed and the stored object was left to a later
 * reconcile pass to notice. A test that proves an upload is correctly ledgered
 * and then strands that exact ledger row is not a cleanup, it is a second bug.
 * `DELETE /api/papers/:id` retires the paper and orphans the asset in one
 * transaction, which is also the behaviour worth having under test.
 *
 * It also set `team.topic = null` in `beforeAll` and never put it back, leaking
 * fixture state into every spec that ran afterwards. That whole save/restore
 * dance is gone: this file owns a DISPOSABLE LAB (`createLab`, e2e/lab.ts),
 * which starts with no topic and no papers and is purged in `afterAll`, so
 * there is no shared state left to leak. The route-driven cleanup STAYS —
 * retiring a paper through `DELETE /api/papers/:id` is the behaviour worth
 * having under test, and `dispose()` is the backstop for anything it missed.
 */

const UPLOADED_TITLE_MARKER = 'E2E Fixture Paper: Thermal Tolerance of Reef Symbionts'

/** A PDF with a real, uncompressed text content stream — unpdf can extract from it. */
function pdfWithText(text: string): Buffer {
  const stream = `BT /F1 18 Tf 72 700 Td (${text}) Tj ET`
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ]

  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xrefStart = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  body += `${xref}trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`

  return Buffer.from(body, 'latin1')
}

/** Structurally valid PDF carrying no text stream at all. */
function pdfWithoutText(): Buffer {
  return Buffer.from(minimalPdfBytes())
}

/**
 * Retire every fixture paper through the authenticated route, so the asset
 * ledger is left in the state the app itself would leave it: the row orphaned
 * and queued for the reclaim sweep, not `attached` to a paper that is gone.
 */
let lab: OwnedLab

async function cleanupFixturePapers(browser: Browser) {
  const papers = await e2eDb.paper.findMany({
    where: { teamId: lab.teamId, fullText: { contains: UPLOADED_TITLE_MARKER } },
    select: { id: true },
  })
  if (papers.length === 0) return

  await withSeedPage(browser, 'leader', async (page) => {
    for (const p of papers) {
      const res = await api.delete(page, `/api/papers/${p.id}`)
      // 404 is fine — a previous run may already have retired it.
      expect([200, 204, 404]).toContain(res.status())
    }
  })
}

test.describe('paper upload — extracted service workflow', () => {
  test.beforeAll(async () => {
    // A fresh lab has no topic, so the relevance gate is already out of the way
    // and these assertions isolate the upload workflow itself — no save, no
    // restore, and nothing for a crashed run to leave behind.
    lab = await createLab('paper-upload')
  })

  test.afterAll(async ({ browser }) => {
    // `finally`-shaped: a failed route-driven cleanup must not stop the lab
    // being disposed, which is what guarantees the next run starts clean.
    try {
      await cleanupFixturePapers(browser)
    } finally {
      await lab.dispose()
    }
  })

  test('rejects a non-PDF that lies about its MIME type', async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.post(page, '/api/papers', {
        multipart: {
          file: {
            name: 'not-really.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('this is plainly not a PDF'),
          },
        },
      })
      // Magic-byte check, not the declared MIME, is what decides.
      expect(res.status()).toBe(400)
      expect((await res.json()).error).toMatch(/not a valid PDF/i)
    })
  })

  test('rejects a structurally valid PDF with no extractable text', async ({ browser }) => {
    await withSeedPage(browser, 'leader', async (page) => {
      const res = await api.post(page, '/api/papers', {
        multipart: {
          file: {
            name: 'blank.pdf',
            mimeType: 'application/pdf',
            buffer: pdfWithoutText(),
          },
        },
      })
      expect(res.status()).toBe(422)
      expect((await res.json()).error).toMatch(/no extractable text/i)
    })
  })

  test('accepts a real PDF, ingests it, and rejects the same bytes as a duplicate', async ({
    browser,
  }) => {
    test.setTimeout(120_000) // ingestion includes a paid metadata call

    await withSeedPage(browser, 'leader', async (page) => {
      const pdf = pdfWithText(UPLOADED_TITLE_MARKER)

      const res = await api.post(page, '/api/papers', {
        multipart: {
          file: { name: 'fixture.pdf', mimeType: 'application/pdf', buffer: pdf },
        },
      })
      expect(res.ok()).toBeTruthy()
      const created = await res.json()
      expect(created.id).toBeTruthy()
      expect(created.fileUrl).toBe(`/api/papers/${created.id}/file`)

      // The stored PDF is in the asset ledger, so it counts toward the team quota
      // and the reclaim sweep can never mistake it for an abandoned upload.
      const asset = await e2eDb.uploadedAsset.findFirst({
        where: { attachedToType: 'paper', attachedToId: created.id },
        select: { status: true, sizeBytes: true, purpose: true },
      })
      expect(asset).toBeTruthy()
      expect(asset!.status).toBe('attached')
      expect(asset!.purpose).toBe('paper_pdf')
      expect(asset!.sizeBytes).toBe(pdf.length)

      // Same bytes again → content-hash duplicate, not a second row.
      const dup = await api.post(page, '/api/papers', {
        multipart: {
          file: { name: 'fixture-copy.pdf', mimeType: 'application/pdf', buffer: pdf },
        },
      })
      expect(dup.status()).toBe(409)
      expect((await dup.json()).error).toMatch(/already in your literature review/i)

      // And the paper is really listed for the team.
      const list = await api.get(page, '/api/papers')
      expect(list.ok()).toBeTruthy()
      const ids = (await list.json()).papers.map((p: { id: string }) => p.id)
      expect(ids).toContain(created.id)

      // Deleting through the route retires the asset too (P1-S8/P1-S15): the
      // ledger row must end up ORPHANED — queued for the reclaim sweep — not
      // `attached` to a paper that no longer exists. The old direct-row cleanup
      // left exactly that, which is how a test that proves correct ledgering
      // went on to strand the row it had just verified.
      const del = await api.delete(page, `/api/papers/${created.id}`)
      expect(del.ok()).toBeTruthy()

      const retired = await e2eDb.uploadedAsset.findFirst({
        where: { attachedToType: 'paper', attachedToId: created.id },
        select: { status: true },
      })
      expect(retired, 'the asset ledger row should survive the paper').toBeTruthy()
      expect(retired!.status).toBe('orphaned')

      // The paper itself is gone, so the same bytes upload cleanly again rather
      // than colliding with a tombstone.
      const again = await api.post(page, '/api/papers', {
        multipart: {
          file: { name: 'fixture-again.pdf', mimeType: 'application/pdf', buffer: pdf },
        },
      })
      expect(again.ok()).toBeTruthy()
    })
  })
})
