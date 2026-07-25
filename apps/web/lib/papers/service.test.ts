import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Paper-upload application service (extracted v0.28.1 "so the workflow stays
 * testable without a request" — this file is that promise kept).
 *
 * The docstring guarantees a CHEAP-REJECTION ORDER: MIME → size → quota →
 * magic bytes → duplicate fingerprint → parse/inspect → paid relevance call.
 * Each rejection case asserts the LATER collaborators were never invoked —
 * that ordering is a cost guarantee (a duplicate must never bill a relevance
 * call) as much as a correctness one.
 */

const mocks = vi.hoisted(() => ({
  paperFindFirst: vi.fn(),
  paperFindUnique: vi.fn(),
  paperCreate: vi.fn(),
  paperDelete: vi.fn(),
  paperUpdate: vi.fn(),
  jobCreate: vi.fn(),
  teamFindUnique: vi.fn(),
  transaction: vi.fn<(arg: unknown) => Promise<unknown>>(),
  putObject: vi.fn(),
  inspectPdf: vi.fn(),
  sanitizePdfText: vi.fn((t: string) => t),
  checkPaperRelevance: vi.fn(),
  extractDoi: vi.fn(() => null),
  checkTeamStorageQuota: vi.fn(),
  reserveUploadAsset: vi.fn(),
  markAssetsOrphanedByKey: vi.fn(() => Promise.resolve()),
  attachAssetsByKey: vi.fn(() => Promise.resolve(1)),
  uploadedAssetUpdateMany: vi.fn(() => Promise.resolve({ count: 1 })),
  processPaperJob: vi.fn(() => Promise.resolve()),
  logActivity: vi.fn(() => Promise.resolve()),
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => {
  const models = {
    paper: {
      findFirst: mocks.paperFindFirst,
      findUnique: mocks.paperFindUnique,
      create: mocks.paperCreate,
      delete: mocks.paperDelete,
      update: mocks.paperUpdate,
    },
    paperProcessingJob: { create: mocks.jobCreate },
    uploadedAsset: { updateMany: mocks.uploadedAssetUpdateMany },
    team: { findUnique: mocks.teamFindUnique },
  }
  return {
    db: {
      ...models,
      // Interactive transactions hand the callback a tx client with the same
      // model mocks, so the commit's inner calls stay observable.
      $transaction: mocks.transaction.mockImplementation(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => Promise<unknown>)(models),
      ),
    },
  }
})
vi.mock('@/lib/storage', () => ({
  putObject: mocks.putObject,
  paperPdfKey: (teamId: string, paperId: string) => `papers/${teamId}/${paperId}.pdf`,
}))
vi.mock('@/lib/pdf/sanitize', () => ({
  inspectPdf: mocks.inspectPdf,
  sanitizePdfText: mocks.sanitizePdfText,
  isPdfMagic: (buf: Buffer) => buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-',
}))
vi.mock('@/lib/literature/relevance', () => ({ checkPaperRelevance: mocks.checkPaperRelevance }))
vi.mock('@/lib/discovery/credibility', () => ({
  extractDoi: mocks.extractDoi,
}))
vi.mock('@/lib/uploads/assets', () => ({
  checkTeamStorageQuota: mocks.checkTeamStorageQuota,
  reserveUploadAsset: mocks.reserveUploadAsset,
  markAssetsOrphanedByKey: mocks.markAssetsOrphanedByKey,
  attachAssetsByKey: mocks.attachAssetsByKey,
}))
vi.mock('@/lib/literature/process-paper', () => ({ processPaperJob: mocks.processPaperJob }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('unpdf', () => ({
  getDocumentProxy: mocks.getDocumentProxy,
  extractText: mocks.extractText,
}))

import { MAX_PDF_BYTES, uploadPaper } from './service'

const INPUT = { teamId: 'team_1', dbUserId: 'u1' }

function pdfFile(bytes: string | Buffer, opts?: { name?: string; type?: string }): File {
  const buf = typeof bytes === 'string' ? Buffer.from(bytes) : bytes
  return new File([new Uint8Array(buf)], opts?.name ?? 'paper.pdf', {
    type: opts?.type ?? 'application/pdf',
  })
}

const VALID_PDF = pdfFile('%PDF-1.4 body')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.checkTeamStorageQuota.mockResolvedValue(null)
  mocks.reserveUploadAsset.mockResolvedValue({ ok: true, id: 'asset1' })
  mocks.attachAssetsByKey.mockResolvedValue(1)
  mocks.markAssetsOrphanedByKey.mockResolvedValue(undefined)
  mocks.uploadedAssetUpdateMany.mockResolvedValue({ count: 1 })
  mocks.jobCreate.mockResolvedValue({ id: 'job_1' })
  mocks.paperFindFirst.mockResolvedValue(null) // no duplicate
  mocks.teamFindUnique.mockResolvedValue({ topic: null }) // no relevance gate
  mocks.getDocumentProxy.mockResolvedValue({ numPages: 3 })
  mocks.inspectPdf.mockReturnValue({ ok: true })
  mocks.extractText.mockResolvedValue({ text: 'Extracted Title\nBody text' })
  mocks.paperCreate.mockResolvedValue({
    id: 'paper_1', title: 'Extracted Title', authors: [], status: 'processing',
    createdAt: new Date('2026-07-19'),
  })
  mocks.putObject.mockResolvedValue(undefined)
  mocks.paperFindUnique.mockResolvedValue({ title: 'Final Title', authors: ['A'], status: 'ready' })
})

describe('cheap-rejection ladder (each step stops the workflow cold)', () => {
  it('wrong MIME → 400, nothing else runs', async () => {
    const res = await uploadPaper({ ...INPUT, file: pdfFile('x', { type: 'text/plain' }) })
    expect(res).toMatchObject({ ok: false, status: 400 })
    expect(mocks.checkTeamStorageQuota).not.toHaveBeenCalled()
  })

  it('oversized file → 413 before the quota read', async () => {
    const big = pdfFile(Buffer.alloc(MAX_PDF_BYTES + 1, 37))
    const res = await uploadPaper({ ...INPUT, file: big })
    expect(res).toMatchObject({ ok: false, status: 413 })
    expect(mocks.checkTeamStorageQuota).not.toHaveBeenCalled()
  })

  it('full team storage → 413 before any parsing', async () => {
    mocks.checkTeamStorageQuota.mockResolvedValue({ used: 1, quota: 2 })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 413 })
    expect(mocks.getDocumentProxy).not.toHaveBeenCalled()
  })

  it('MIME-lying non-PDF → 400 on magic bytes, no duplicate check', async () => {
    const res = await uploadPaper({ ...INPUT, file: pdfFile('not a pdf at all') })
    expect(res).toMatchObject({ ok: false, status: 400 })
    expect(mocks.paperFindFirst).not.toHaveBeenCalled()
  })

  it('duplicate contentHash → 409 with the existing title, no parse, no relevance bill', async () => {
    mocks.paperFindFirst.mockResolvedValue({ id: 'p0', title: 'Already Here' })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 409 })
    if (!res.ok) expect(res.error).toContain('Already Here')
    expect(mocks.getDocumentProxy).not.toHaveBeenCalled()
    expect(mocks.checkPaperRelevance).not.toHaveBeenCalled()
  })

  it('active-content inspection failure → 422, nothing stored', async () => {
    mocks.inspectPdf.mockReturnValue({ ok: false, reason: 'contains JavaScript' })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 422, error: 'contains JavaScript' })
    expect(mocks.paperCreate).not.toHaveBeenCalled()
    expect(mocks.putObject).not.toHaveBeenCalled()
  })

  it('no extractable text → 422 "scanned image"', async () => {
    mocks.extractText.mockResolvedValue({ text: '' })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 422 })
    if (!res.ok) expect(res.error).toMatch(/scanned image/)
  })
})

describe('relevance gate', () => {
  it('skipped entirely when the team has no topic', async () => {
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res.ok).toBe(true)
    expect(mocks.checkPaperRelevance).not.toHaveBeenCalled()
  })

  it('irrelevant paper → 422 with code IRRELEVANT and no DB row', async () => {
    mocks.teamFindUnique.mockResolvedValue({ topic: 'Magnets' })
    mocks.checkPaperRelevance.mockResolvedValue({ relevant: false, reason: 'Off-topic.' })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 422, code: 'IRRELEVANT' })
    expect(mocks.paperCreate).not.toHaveBeenCalled()
  })
})

describe('persistence outcomes (A5 recoverable state machine)', () => {
  it('a concurrent-duplicate P2002 on create → 409 and the reservation is orphaned', async () => {
    const { Prisma } = await import('@prisma/client')
    mocks.paperCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 409 })
    // The stored object must go back to the sweep, never leak untracked.
    expect(mocks.markAssetsOrphanedByKey).toHaveBeenCalled()
  })

  it('atomic quota reservation full → 413 before any byte reaches R2', async () => {
    mocks.reserveUploadAsset.mockResolvedValue({ ok: false, used: 5, quota: 5 })
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 413 })
    expect(mocks.putObject).not.toHaveBeenCalled()
    expect(mocks.paperCreate).not.toHaveBeenCalled()
  })

  it('R2 store failure → 502, reservation orphaned, no paper row ever created', async () => {
    mocks.putObject.mockRejectedValue(new Error('r2 down'))
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 502 })
    expect(mocks.markAssetsOrphanedByKey).toHaveBeenCalled()
    expect(mocks.paperCreate).not.toHaveBeenCalled()
  })

  it('commit failure after the R2 put → 502 and the object is handed to the sweep', async () => {
    mocks.jobCreate.mockRejectedValue(new Error('db gone'))
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 502 })
    expect(mocks.markAssetsOrphanedByKey).toHaveBeenCalled()
  })

  it('an expired (swept) reservation rolls the whole commit back → 502', async () => {
    mocks.attachAssetsByKey.mockResolvedValue(0)
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res).toMatchObject({ ok: false, status: 502 })
  })

  it('success: reservation attaches to the paper in the commit, ingestion awaited, fresh fields returned', async () => {
    const res = await uploadPaper({ ...INPUT, file: VALID_PDF })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.paper.fileUrl).toBe('/api/papers/paper_1/file')
      expect(res.paper.title).toBe('Final Title') // re-read AFTER ingestion
      expect(res.paper.status).toBe('ready')
    }
    expect(mocks.reserveUploadAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'paper_pdf',
        objectKey: expect.stringMatching(/^papers\/team_1\/.+\.pdf$/),
        sizeBytes: expect.any(Number),
      }),
    )
    expect(mocks.attachAssetsByKey).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attachedToType: 'paper', attachedToId: 'paper_1' }),
    )
    // Reservation precedes the put; the put precedes the commit.
    const reserveOrder = mocks.reserveUploadAsset.mock.invocationCallOrder[0]!
    const putOrder = mocks.putObject.mock.invocationCallOrder[0]!
    const createOrder = mocks.paperCreate.mock.invocationCallOrder[0]!
    expect(reserveOrder).toBeLessThan(putOrder)
    expect(putOrder).toBeLessThan(createOrder)
    expect(mocks.processPaperJob).toHaveBeenCalledWith('paper_1')
  })

  it('title falls back to the filename when the first line is >= 200 chars', async () => {
    mocks.extractText.mockResolvedValue({ text: 'x'.repeat(250) + '\nrest' })
    await uploadPaper({ ...INPUT, file: pdfFile('%PDF-1.4 body', { name: 'my study.pdf' }) })
    expect(mocks.paperCreate.mock.calls[0][0].data.title).toBe('my study')
  })
})
