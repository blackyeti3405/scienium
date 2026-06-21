import { describe, it, expect } from 'vitest'
import { parsePastedPoints, toCsv } from '@/lib/data-terminal/csv'
import type { MeasurementRow } from '@/lib/data-terminal/csv'

// ---------------------------------------------------------------------------
// parsePastedPoints
// ---------------------------------------------------------------------------

describe('parsePastedPoints', () => {
  it('returns empty points for empty input', () => {
    const result = parsePastedPoints('')
    expect(result.points).toHaveLength(0)
    expect(result.skipped).toBe(0)
  })

  it('parses tab-separated rows', () => {
    const { points, skipped } = parsePastedPoints('1\t2\n3\t4')
    expect(skipped).toBe(0)
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ x: 1, y: 2 })
    expect(points[1]).toEqual({ x: 3, y: 4 })
  })

  it('parses comma-separated rows', () => {
    const { points, skipped } = parsePastedPoints('5,10\n15,20')
    expect(skipped).toBe(0)
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ x: 5, y: 10 })
    expect(points[1]).toEqual({ x: 15, y: 20 })
  })

  it('parses optional series and note columns', () => {
    const { points } = parsePastedPoints('1\t2\tA\tmy note')
    expect(points[0]).toEqual({ x: 1, y: 2, series: 'A', note: 'my note' })
  })

  it('omits series and note when empty', () => {
    const { points } = parsePastedPoints('1\t2\t\t')
    expect(points[0]).not.toHaveProperty('series')
    expect(points[0]).not.toHaveProperty('note')
  })

  it('detects and skips a header row when first two cells are non-numeric', () => {
    const text = 'time\ttemp\tseries\tnote\n1\t2\n3\t4'
    const { points, skipped } = parsePastedPoints(text)
    // header skipped silently (not counted in skipped)
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ x: 1, y: 2 })
    expect(skipped).toBe(0)
  })

  it('drops rows where x is non-numeric and counts them in skipped', () => {
    const { points, skipped } = parsePastedPoints('abc\t2\n1\t2')
    expect(points).toHaveLength(1)
    expect(points[0]).toEqual({ x: 1, y: 2 })
    expect(skipped).toBe(1)
  })

  it('drops rows where y is non-numeric and counts them in skipped', () => {
    const { points, skipped } = parsePastedPoints('1\tbad\n2\t4')
    expect(points).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('drops rows with a blank x or y cell instead of reading them as 0', () => {
    const { points, skipped } = parsePastedPoints('1,2\n,3\n4,')
    expect(points).toHaveLength(1)
    expect(points[0]).toEqual({ x: 1, y: 2 })
    expect(skipped).toBe(2)
  })

  it('truncates series to 40 chars', () => {
    const longSeries = 'A'.repeat(50)
    const { points } = parsePastedPoints(`1\t2\t${longSeries}`)
    expect(points[0].series).toHaveLength(40)
  })

  it('truncates note to 200 chars', () => {
    const longNote = 'B'.repeat(250)
    const { points } = parsePastedPoints(`1\t2\tseries\t${longNote}`)
    expect(points[0].note).toHaveLength(200)
  })

  it('caps returned points at 500 and counts overflow in skipped', () => {
    const lines = Array.from({ length: 550 }, (_, i) => `${i}\t${i}`).join('\n')
    const { points, skipped } = parsePastedPoints(lines)
    expect(points).toHaveLength(500)
    expect(skipped).toBe(50)
  })

  it('never returns a point with non-finite x or y', () => {
    const text = 'Infinity\t1\n1\tNaN\n2\t3'
    const { points } = parsePastedPoints(text)
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('skips blank lines without counting them', () => {
    const { points, skipped } = parsePastedPoints('1\t2\n\n3\t4\n')
    expect(points).toHaveLength(2)
    expect(skipped).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// toCsv
// ---------------------------------------------------------------------------

const makeMeasurement = (
  id: string,
  x: number,
  y: number,
  series = '',
  note: string | null = null,
): MeasurementRow => ({ id, x, y, series, note })

describe('toCsv', () => {
  it('produces a header row using xLabel and yLabel', () => {
    const csv = toCsv({ xLabel: 'time', yLabel: 'temp', measurements: [] })
    const firstLine = csv.split('\r\n')[0]
    expect(firstLine).toBe('time,temp,series,note')
  })

  it('serializes measurements correctly', () => {
    const csv = toCsv({
      xLabel: 'x',
      yLabel: 'y',
      measurements: [makeMeasurement('1', 1, 2, 'A', 'first point')],
    })
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines[1]).toBe('1,2,A,first point')
  })

  it('serializes null note as empty field', () => {
    const csv = toCsv({
      xLabel: 'x',
      yLabel: 'y',
      measurements: [makeMeasurement('1', 3, 4, '', null)],
    })
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines[1]).toBe('3,4,,')
  })

  it('wraps a field containing a comma in double quotes', () => {
    const csv = toCsv({
      xLabel: 'x',
      yLabel: 'y',
      measurements: [makeMeasurement('1', 1, 2, 'A,B', null)],
    })
    expect(csv).toContain('"A,B"')
  })

  it('escapes double quotes inside a field as ""', () => {
    const csv = toCsv({
      xLabel: 'x',
      yLabel: 'y',
      measurements: [makeMeasurement('1', 1, 2, '', 'say "hello"')],
    })
    expect(csv).toContain('"say ""hello"""')
  })

  it('uses CRLF line endings', () => {
    const csv = toCsv({
      xLabel: 'x',
      yLabel: 'y',
      measurements: [makeMeasurement('1', 1, 2)],
    })
    expect(csv).toMatch(/\r\n/)
    // Every line ending should be CRLF — no lone LF
    const parts = csv.split('\r\n')
    // Last element after trailing CRLF is empty string
    expect(parts[parts.length - 1]).toBe('')
  })

  it('handles an xLabel containing a comma', () => {
    const csv = toCsv({ xLabel: 'time,s', yLabel: 'temp', measurements: [] })
    expect(csv.startsWith('"time,s"')).toBe(true)
  })
})
