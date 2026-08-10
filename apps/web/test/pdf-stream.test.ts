import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const getObjectStream = vi.fn()
vi.mock('@/lib/storage', () => ({ getObjectStream: (k: string) => getObjectStream(k) }))

const { streamStoredPdf } = await import('@/lib/papers/pdf')

/**
 * A row whose `pdfKey` points at an object that is not there is PERMANENT: no
 * retry will produce the file, and the student has to re-upload it. R2 being
 * unreachable is transient and a retry is right. Both used to answer 502, so the
 * viewer could not tell them apart and rendered a blank frame for each.
 */
const paper = { pdfKey: 'papers/t/x.pdf', pdfData: null, title: 'X' }

describe('streamStoredPdf', () => {
  // The mock is module-scoped, so call counts carry between tests without this.
  beforeEach(() => getObjectStream.mockClear())

  it('answers 404 pdf_missing when the object does not exist', async () => {
    getObjectStream.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'NoSuchKey' }))
    const res = await streamStoredPdf(paper)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('pdf_missing')
  })

  it('also treats a bare 404 from the gateway as missing', async () => {
    getObjectStream.mockRejectedValueOnce(Object.assign(new Error('x'), { $metadata: { httpStatusCode: 404 } }))
    expect((await streamStoredPdf(paper)).status).toBe(404)
  })

  it('answers 502 pdf_unavailable when storage itself fails', async () => {
    getObjectStream.mockRejectedValueOnce(Object.assign(new Error('down'), { name: 'TimeoutError' }))
    const res = await streamStoredPdf(paper)
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('pdf_unavailable')
  })

  it('never reaches storage when a legacy in-DB blob exists', async () => {
    // The 24 pre-migration sources take this path — which is exactly why only
    // the one R2-backed paper broke.
    const res = await streamStoredPdf({ pdfKey: null, pdfData: Buffer.from('%PDF-1.4'), title: 'Y' })
    expect(res.status).toBe(200)
    expect(getObjectStream).not.toHaveBeenCalled()
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('answers 404 pdf_missing when there is neither a key nor a blob', async () => {
    const res = await streamStoredPdf({ pdfKey: null, pdfData: null, title: 'Z' })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('pdf_missing')
  })
})
