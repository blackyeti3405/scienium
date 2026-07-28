import { describe, it, expect } from 'vitest'
import { parsePastedPoints, toCsv } from '@/lib/data-terminal/csv'
import type { MeasurementRow } from '@/lib/data-terminal/csv'

/**
 * P2-S13 — the exporter quotes commas, quotes and newlines (RFC-4180); the
 * importer used `line.split(',')`, so the app could not read back its own valid
 * export. These tests feed the EXPORTER'S OWN OUTPUT to the importer, which is
 * the attack: a student downloads their measurements, a teacher re-uploads them,
 * and a note containing a comma silently becomes two cells — shifting the note
 * into the series column, or (with an embedded newline) inventing a junk row and
 * dropping a real one.
 *
 * Two documented asymmetries the round trip is NOT expected to undo, because
 * both are deliberate and load-bearing:
 *   - formula neutralization (v0.29.3) prefixes `= + - @ \t \r`-leading text
 *     with `'`, so those values come back quoted-as-text on purpose;
 *   - `series`/`note` are trimmed and truncated (40 / 200) on import.
 * The corpus below stays clear of both so identity is the honest expectation,
 * and the neutralized case is pinned separately.
 */

const m = (
  id: string,
  x: number,
  y: number,
  series: string,
  note: string | null,
): MeasurementRow => ({ id, x, y, series, note })

/** Every field that broke `split(',')`, plus the ones that must keep working. */
const HOSTILE: MeasurementRow[] = [
  m('1', 1, 2, 'trial A', 'plain note'),
  m('2', 3, 4, 'A,B', 'comma, in, note'),
  m('3', 5, 6, 'say "hi"', 'she said "stop", loudly'),
  m('4', 7, 8, 'multi\nline', 'first line\nsecond line'),
  m('5', 9, 10, 'crlf\r\nseries', 'note\r\nwith crlf'),
  m('6', -1.5, 2.5e3, '', null), // empty series + null note
  m('7', 11, 12, 'Ünïcodé — ✓', 'μ = 3.4 ± 0.2 °C, 温度'),
  m('8', 13, 14, 'tab\there', 'tab\tin note'),
  m('9', 0, 0, '""', '"'), // a field that is nothing but quotes
]

function roundTrip(measurements: MeasurementRow[], xLabel = 'time', yLabel = 'temp') {
  const csv = toCsv({ xLabel, yLabel, measurements })
  return parsePastedPoints(csv)
}

describe('CSV round trip — exporter output must survive the importer', () => {
  it('recovers every row, with no skips and no invented rows', () => {
    const { points, skipped } = roundTrip(HOSTILE)
    expect(skipped).toBe(0)
    expect(points).toHaveLength(HOSTILE.length)
  })

  it('recovers x and y exactly for every row', () => {
    const { points } = roundTrip(HOSTILE)
    expect(points.map((p) => [p.x, p.y])).toEqual(HOSTILE.map((r) => [r.x, r.y]))
  })

  it.each(HOSTILE.map((r, i) => [i, r] as const))(
    'row %i round-trips its series and note verbatim',
    (i, row) => {
      const { points } = roundTrip(HOSTILE)
      const got = points[i]
      expect(got).toBeDefined()
      expect(got.series).toBe(row.series === '' ? undefined : row.series)
      expect(got.note).toBe(row.note === null || row.note === '' ? undefined : row.note)
    },
  )

  it('a lone trailing newline does not produce a phantom row', () => {
    const csv = toCsv({ xLabel: 'time', yLabel: 'temp', measurements: [m('1', 1, 2, '', null)] })
    expect(csv.endsWith('\r\n')).toBe(true)
    const { points, skipped } = parsePastedPoints(csv)
    expect(points).toHaveLength(1)
    expect(skipped).toBe(0)
  })

  it('a quoted comma-bearing header is consumed as a header, not as data', () => {
    const { points, skipped } = roundTrip([m('1', 1, 2, '', null)], 'time, s', 'temp, °C')
    expect(points).toHaveLength(1)
    expect(skipped).toBe(0)
  })

  it('an embedded newline stays INSIDE its field instead of splitting the row', () => {
    // The sharpest form: without a quote-aware reader the second physical line
    // ("second line") parses as a row whose x is non-numeric — a skip — and the
    // note is truncated at the break.
    const { points, skipped } = roundTrip([m('1', 1, 2, 'S', 'line one\nline two')])
    expect(skipped).toBe(0)
    expect(points).toEqual([{ x: 1, y: 2, series: 'S', note: 'line one\nline two' }])
  })

  it('a TAB inside an axis label cannot re-delimit the whole export', () => {
    // The sharpest tab case, and the reason the exporter quotes tabs: the
    // delimiter is decided from the FIRST record, so a raw tab in the header
    // (an axis label the student typed) would put the entire file into
    // tab-separated mode and shred every data row. A tab in a later field is
    // already harmless once the header has picked comma.
    const { points, skipped } = roundTrip([m('1', 1, 2, 'S', 'n')], 'time\tsince start', 'temp')
    expect(skipped).toBe(0)
    expect(points).toEqual([{ x: 1, y: 2, series: 'S', note: 'n' }])
  })

  it('a comma in a note cannot shift data into the wrong column', () => {
    const { points } = roundTrip([m('1', 1, 2, 'series', 'a,b,c')])
    expect(points[0].series).toBe('series')
    expect(points[0].note).toBe('a,b,c')
  })

  it('the 500-point cap still holds on exported CSV', () => {
    const many = Array.from({ length: 550 }, (_, i) => m(String(i), i, i, 'S', 'n,ote'))
    const { points, skipped } = roundTrip(many)
    expect(points).toHaveLength(500)
    expect(skipped).toBe(50)
  })

  it('series and note caps still apply to exported CSV', () => {
    const { points } = roundTrip([m('1', 1, 2, 'A'.repeat(50), 'B'.repeat(250))])
    expect(points[0].series).toHaveLength(40)
    expect(points[0].note).toHaveLength(200)
  })

  it('formula-neutralized text round-trips as neutralized text, not as a formula', () => {
    // Deliberate asymmetry: the leading quote is the defence and must survive.
    const { points } = roundTrip([m('1', 1, 2, '', '=cmd|\'/c calc\'!A1')])
    expect(points[0].note).toBe("'=cmd|'/c calc'!A1")
  })
})

describe('parsePastedPoints — RFC-4180 reader', () => {
  it('reads a doubled quote as one literal quote', () => {
    const { points } = parsePastedPoints('x,y,series,note\r\n1,2,"a""b",n\r\n')
    expect(points[0].series).toBe('a"b')
  })

  it('keeps tab-separated spreadsheet paste working (the common case)', () => {
    const { points, skipped } = parsePastedPoints('time\ttemp\n1\t2\n3\t4')
    expect(skipped).toBe(0)
    expect(points).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }])
  })

  it('a quoted tab does not flip a comma file into tab mode', () => {
    const { points } = parsePastedPoints('x,y,series,note\r\n1,2,"a\tb",c\r\n')
    expect(points).toEqual([{ x: 1, y: 2, series: 'a\tb', note: 'c' }])
  })
})
