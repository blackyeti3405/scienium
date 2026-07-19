import { test, expect } from '@playwright/test'
import { api, withSeedPage } from './api'
import { e2eDb, e2eTeamId } from './db'

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
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n' +
      '0000000058 00000 n \n0000000115 00000 n \n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF',
    'latin1',
  )
}

async function cleanupFixturePapers() {
  await e2eDb.paper.deleteMany({
    where: { teamId: await e2eTeamId(), fullText: { contains: UPLOADED_TITLE_MARKER } },
  })
}

test.describe('paper upload — extracted service workflow', () => {
  test.beforeAll(async () => {
    // The relevance gate only runs when a topic is committed; keep it out of the
    // way so these assertions isolate the upload workflow itself.
    await e2eDb.team.update({ where: { id: await e2eTeamId() }, data: { topic: null } })
    await cleanupFixturePapers()
  })

  test.afterAll(async () => {
    await cleanupFixturePapers()
    await e2eDb.$disconnect()
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
    })
  })
})
