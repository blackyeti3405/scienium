import { describe, it, expect } from 'vitest'
import { inspectPdf, sanitizePdfText, MAX_PDF_PAGES } from '@/lib/pdf/sanitize'

const ch = (code: number) => String.fromCharCode(code)

/**
 * Hand-built minimal PDFs. Real papers are megabytes of compressed streams, so
 * these keep only the structure the inspector actually reads: a header, some
 * object dictionaries, and stream bodies whose bytes we control.
 */
const pdf = (body: string) => Buffer.from(`%PDF-1.7\n${body}\ntrailer\n<</Root 1 0 R>>\n%%EOF\n`, 'latin1')

/** An object with a stream payload — `body` lands between stream/endstream. */
const withStream = (payload: string) =>
  pdf(`1 0 obj\n<</Length ${payload.length}>>\nstream\n${payload}\nendstream\nendobj`)

describe('inspectPdf — active content', () => {
  it('accepts an ordinary paper', () => {
    expect(inspectPdf(pdf('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj'), 12).ok).toBe(true)
  })

  it.each([
    ['/JavaScript', '1 0 obj\n<</S/JavaScript/JS 2 0 R>>\nendobj', 'embedded JavaScript'],
    ['hex-escaped /JavaScript', '1 0 obj\n<</S/J#61vaScript>>\nendobj', 'embedded JavaScript'],
    ['/JS name key', '1 0 obj\n<</JS (app.alert\\(1\\))>>\nendobj', 'embedded JavaScript'],
    ['/OpenAction', '1 0 obj\n<</Type/Catalog/OpenAction 3 0 R>>\nendobj', 'an auto-run open action'],
    ['/Launch', '1 0 obj\n<</S/Launch/F (calc.exe)>>\nendobj', 'a launch action'],
    ['/XFA', '1 0 obj\n<</XFA 4 0 R>>\nendobj', 'XFA form scripting'],
    ['/RichMedia', '1 0 obj\n<</Subtype/RichMedia>>\nendobj', 'embedded rich media'],
  ])('rejects %s', (_label, body, reason) => {
    const result = inspectPdf(pdf(body), 12)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain(reason)
  })

  it('rejects an encrypted PDF', () => {
    const result = inspectPdf(pdf('1 0 obj\n<</Encrypt 9 0 R>>\nendobj'), 12)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('encrypted')
  })
})

describe('inspectPdf — false rejections it must not repeat', () => {
  // Regression: v0.23.4 rejected every paper carrying a Distiller
  // `folder.joboptions` attachment — which is most of what publishers emit.
  it('accepts a paper with an embedded joboptions attachment', () => {
    const result = inspectPdf(
      pdf(
        '130 0 obj\n<</Dests 131 0 R/EmbeddedFiles 124 0 R>>\nendobj\n' +
          '126 0 obj\n<</Type/Filespec/UF (folder.joboptions)>>\nendobj\n' +
          '127 0 obj\n<</Filter/FlateDecode/Length 4460/Type/EmbeddedFile>>\nstream\n\x9c\xed\x5a\nendstream\nendobj',
      ),
      12,
    )
    expect(result.ok).toBe(true)
  })

  // Compressed image/font bytes are effectively random and will eventually
  // spell any short marker. Only dictionaries outside streams are structure.
  it.each(['/JS (', '/JavaScript', '/OpenAction', '/Launch', '/XFA', '/RichMedia', '/Encrypt'])(
    'ignores %s appearing in compressed stream noise',
    (marker) => {
      expect(inspectPdf(withStream(`\x8a\x1f${marker}\x00\xd3 binary junk`), 12).ok).toBe(true)
    },
  )

  it('still catches a marker after a stream body closes', () => {
    const body =
      '1 0 obj\n<</Length 9>>\nstream\n\x8a\x1f/Launch\nendstream\nendobj\n' +
      '2 0 obj\n<</S/Launch/F (calc.exe)>>\nendobj'
    expect(inspectPdf(pdf(body), 12).ok).toBe(false)
  })

  it('scans nothing past an unterminated stream rather than guessing', () => {
    const truncated = Buffer.from('%PDF-1.7\n1 0 obj\n<</Length 99>>\nstream\n\x8a/JavaScript', 'latin1')
    expect(inspectPdf(truncated, 12).ok).toBe(true)
  })

  it('preserves byte offsets when blanking streams', () => {
    const original = withStream('\x8a\x1f/JS (x)\x00\xd3')
    // Same length in, same length scanned — offsets stay meaningful for anyone
    // who later wants to report *where* a marker was found.
    expect(inspectPdf(original, 12).ok).toBe(true)
  })
})

describe('inspectPdf — page bomb', () => {
  it('rejects past the page cap', () => {
    const result = inspectPdf(pdf('1 0 obj\n<</Type/Catalog>>\nendobj'), MAX_PDF_PAGES + 1)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain(`${MAX_PDF_PAGES}`)
  })

  it('accepts at exactly the cap, and when the count is unknown', () => {
    const clean = pdf('1 0 obj\n<</Type/Catalog>>\nendobj')
    expect(inspectPdf(clean, MAX_PDF_PAGES).ok).toBe(true)
    expect(inspectPdf(clean).ok).toBe(true)
  })
})

describe('sanitizePdfText', () => {
  it('strips the NUL byte Postgres rejects', () => {
    const out = sanitizePdfText(`ankle${ch(0)}foot`)
    expect(out).toBe('anklefoot')
    expect(out.includes(ch(0))).toBe(false)
  })

  it('strips other C0 control bytes (BELL, VT, FF, ESC)', () => {
    expect(sanitizePdfText(`a${ch(7)}b${ch(11)}c${ch(12)}d${ch(27)}e`)).toBe('abcde')
  })

  it('preserves tab, newline, and carriage return', () => {
    const out = sanitizePdfText(`line1${ch(9)}col2${ch(10)}line2${ch(13)}`)
    expect(out).toContain(ch(9))
    expect(out).toContain(ch(10))
    expect(out).toBe(`line1${ch(9)}col2${ch(10)}line2`) // trailing CR trimmed
  })

  it('trims surrounding whitespace and handles null/undefined', () => {
    expect(sanitizePdfText('  hi  ')).toBe('hi')
    expect(sanitizePdfText(null)).toBe('')
    expect(sanitizePdfText(undefined)).toBe('')
  })

  it('is idempotent on already-clean text', () => {
    const clean = 'A normal paragraph of extracted text.'
    expect(sanitizePdfText(sanitizePdfText(clean))).toBe(clean)
  })
})
