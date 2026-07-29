import { describe, expect, it } from 'vitest'
import {
  coerceCell,
  numericCell,
  numericColumn,
  validateDataset,
  datasetByteSize,
  newColumnId,
  formatCell,
  formatNumber,
  type ColumnSpec,
  type DatasetShape,
} from './dataset'

const col = (over: Partial<ColumnSpec> & Pick<ColumnSpec, 'id' | 'name'>): ColumnSpec => ({
  type: 'number',
  role: 'y',
  ...over,
})

const shape = (columns: ColumnSpec[], rows: DatasetShape['rows'] = []): DatasetShape => ({
  columns,
  rows,
})

describe('validateDataset', () => {
  it('accepts a plain XY table', () => {
    const s = shape(
      [col({ id: 'c1', name: 'Time', role: 'x' }), col({ id: 'c2', name: 'Mass' })],
      [
        [1, 10],
        [2, 20],
      ],
    )
    expect(validateDataset(s, 'xy')).toEqual([])
  })

  it('rejects two columns with the same name, ignoring case', () => {
    const s = shape([col({ id: 'c1', name: 'Mass', role: 'x' }), col({ id: 'c2', name: 'mass' })])
    const issues = validateDataset(s, 'xy')
    expect(issues.some((i) => i.message.includes('both called'))).toBe(true)
  })

  it('rejects a role the table type does not have', () => {
    // A Column table has no x axis — its columns ARE the groups.
    const s = shape([col({ id: 'c1', name: 'Time', role: 'x' })])
    const issues = validateDataset(s, 'column')
    expect(issues.some((i) => i.message.includes('no "x" columns'))).toBe(true)
  })

  it('rejects a second X column on an XY table', () => {
    const s = shape([
      col({ id: 'c1', name: 'Time', role: 'x' }),
      col({ id: 'c2', name: 'Dose', role: 'x' }),
    ])
    const issues = validateDataset(s, 'xy')
    expect(issues.some((i) => i.message.includes('exactly one X column'))).toBe(true)
  })

  it('rejects replicates nested more than one deep', () => {
    const s = shape([
      col({ id: 'c1', name: 'Time', role: 'x' }),
      col({ id: 'c2', name: 'Mass' }),
      col({ id: 'c3', name: 'Mass 2', subcolumnOf: 'c2' }),
      col({ id: 'c4', name: 'Mass 3', subcolumnOf: 'c3' }),
    ])
    const issues = validateDataset(s, 'xy')
    expect(issues.some((i) => i.column === 'c4')).toBe(true)
  })

  it('rejects replicates on a table type that has none', () => {
    const s = shape([col({ id: 'c1', name: 'A' }), col({ id: 'c2', name: 'B', subcolumnOf: 'c1' })])
    const issues = validateDataset(s, 'column')
    expect(issues.some((i) => i.message.includes('does not use replicate subcolumns'))).toBe(true)
  })

  it('requires an error column to name its partner', () => {
    const s = shape([
      col({ id: 'c1', name: 'Time', role: 'x' }),
      col({ id: 'c2', name: 'Mass' }),
      col({ id: 'c3', name: 'SD', role: 'yErr' }),
    ])
    const issues = validateDataset(s, 'xy')
    expect(issues.some((i) => i.column === 'c3')).toBe(true)

    const paired = shape([
      col({ id: 'c1', name: 'Time', role: 'x' }),
      col({ id: 'c2', name: 'Mass' }),
      col({ id: 'c3', name: 'SD', role: 'yErr', pairedWith: 'c2' }),
    ])
    expect(validateDataset(paired, 'xy')).toEqual([])
  })

  it('reports a ragged row with its 1-based position', () => {
    const s = shape([col({ id: 'c1', name: 'A', role: 'x' }), col({ id: 'c2', name: 'B' })], [
      [1, 2],
      [3],
    ])
    const issues = validateDataset(s, 'xy')
    expect(issues.some((i) => i.message.startsWith('Row 2'))).toBe(true)
  })
})

describe('numericCell', () => {
  it('reads a blank cell as missing, never as zero', () => {
    // The difference between "did not grow" and "nobody measured" is the whole
    // of a missing-data policy; collapsing them drags every mean toward zero.
    expect(numericCell('')).toBeNull()
    expect(numericCell('   ')).toBeNull()
    expect(numericCell(null)).toBeNull()
    expect(numericCell(0)).toBe(0)
  })

  it('rejects non-finite values', () => {
    expect(numericCell(Number.POSITIVE_INFINITY)).toBeNull()
    expect(numericCell(Number.NaN)).toBeNull()
    expect(numericCell('banana')).toBeNull()
  })

  it('reads numeric strings, including scientific notation', () => {
    expect(numericCell(' 2.5 ')).toBe(2.5)
    expect(numericCell('1e-3')).toBe(0.001)
    expect(numericCell('-4')).toBe(-4)
  })
})

describe('numericColumn', () => {
  it('drops missing cells rather than substituting', () => {
    const s = shape([col({ id: 'c1', name: 'A', role: 'x' }), col({ id: 'c2', name: 'B' })], [
      [1, 10],
      [2, null],
      [3, 30],
    ])
    expect(numericColumn(s, 'c2')).toEqual([10, 30])
  })

  it('returns nothing for a column that does not exist', () => {
    expect(numericColumn(shape([]), 'nope')).toEqual([])
  })
})

describe('coerceCell', () => {
  it('turns an unparseable number into missing instead of throwing', () => {
    expect(coerceCell('banana', 'number')).toBeNull()
    expect(coerceCell('12', 'number')).toBe(12)
  })

  it('clamps long text rather than rejecting the row', () => {
    const long = 'x'.repeat(500)
    expect(String(coerceCell(long, 'text'))).toHaveLength(200)
  })
})

describe('newColumnId', () => {
  it('never reuses an id already in the table', () => {
    const existing = [col({ id: 'c1', name: 'A' }), col({ id: 'c2', name: 'B' })]
    expect(existing.map((c) => c.id)).not.toContain(newColumnId(existing))
  })
})

describe('datasetByteSize', () => {
  it('measures what is actually stored', () => {
    const s = shape([col({ id: 'c1', name: 'A', role: 'x' })], [[1], [2]])
    expect(datasetByteSize(s)).toBe(
      new TextEncoder().encode(JSON.stringify({ columns: s.columns, rows: s.rows })).byteLength,
    )
  })
})

describe('formatNumber', () => {
  it('collapses binary floating-point noise', () => {
    // 4.2/3 is 1.4000000000000001; a computed column rendered that verbatim,
    // overflowed its cell, and made the table unreadable.
    expect(formatNumber(4.2 / 3)).toBe('1.4')
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('keeps integers exact', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(-42)).toBe('-42')
    expect(formatNumber(1234567)).toBe('1234567')
  })

  it('falls back to 6 significant figures when a value is too long to read', () => {
    expect(formatNumber(9.1 / 6)).toBe('1.51667')
  })

  it('uses scientific notation outside the readable decimal range', () => {
    expect(formatNumber(1.23e12)).toBe('1.2300e+12')
    expect(formatNumber(0.000012345)).toBe('1.2345e-5')
  })

  it('does not round away a value a student actually typed', () => {
    expect(formatNumber(1.51)).toBe('1.51')
    expect(formatNumber(123456.789)).toBe('123456.789')
  })

  it('renders a missing cell as empty, and text unchanged', () => {
    expect(formatCell(null)).toBe('')
    expect(formatCell('healthy')).toBe('healthy')
  })
})
