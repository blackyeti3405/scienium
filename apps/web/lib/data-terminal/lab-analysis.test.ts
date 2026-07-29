import { describe, expect, it } from 'vitest'
import { ANALYSES } from './analyses'
import { analysisSelectionError, datasetSignature, selectableColumns } from './lab-analysis'
import type { ColumnSpec, DataRow } from './dataset'

const cols: ColumnSpec[] = [
  { id: 'c1', name: 'Group A', type: 'number', role: 'y' },
  { id: 'c2', name: 'Group B', type: 'number', role: 'y' },
  { id: 'c3', name: 'Notes', type: 'text', role: 'label' },
]
const rows: DataRow[] = [
  [1, 2, 'a'],
  [3, 4, 'b'],
]

describe('datasetSignature — the recalculation chain (§7 risk 5)', () => {
  it('is stable when nothing changes', () => {
    expect(datasetSignature(cols, rows)).toBe(datasetSignature(cols, rows))
  })

  it('changes when a cell changes', () => {
    const edited: DataRow[] = [
      [1, 2, 'a'],
      [3, 99, 'b'],
    ]
    expect(datasetSignature(cols, edited)).not.toBe(datasetSignature(cols, rows))
  })

  it('changes when a row is added or removed', () => {
    expect(datasetSignature(cols, [...rows, [5, 6, 'c']])).not.toBe(datasetSignature(cols, rows))
    expect(datasetSignature(cols, [rows[0]!])).not.toBe(datasetSignature(cols, rows))
  })

  it('changes when a column role or name changes', () => {
    const reRole = cols.map((c) => (c.id === 'c2' ? { ...c, role: 'ignore' as const } : c))
    expect(datasetSignature(reRole, rows)).not.toBe(datasetSignature(cols, rows))
    const reName = cols.map((c) => (c.id === 'c2' ? { ...c, name: 'Group C' } : c))
    expect(datasetSignature(reName, rows)).not.toBe(datasetSignature(cols, rows))
  })

  it('distinguishes a null cell from an empty-string neighbour boundary', () => {
    const a: DataRow[] = [[1, null]]
    const b: DataRow[] = [[1, 2]]
    expect(datasetSignature(cols.slice(0, 2), a)).not.toBe(datasetSignature(cols.slice(0, 2), b))
  })
})

describe('selectableColumns', () => {
  it('descriptive offers the numeric Y columns, not the label', () => {
    const ids = selectableColumns(cols, ANALYSES['descriptive']).map((c) => c.id)
    expect(ids).toEqual(['c1', 'c2'])
  })
})

describe('analysisSelectionError — the Run gate', () => {
  it('unpaired t-test requires exactly two groups', () => {
    expect(analysisSelectionError(ANALYSES['unpaired-t'], ['c1'])).toMatch(/at least 2|exactly 2|Select/)
    expect(analysisSelectionError(ANALYSES['unpaired-t'], ['c1', 'c2'])).toBeNull()
    expect(analysisSelectionError(ANALYSES['unpaired-t'], ['c1', 'c2', 'c3'])).toMatch(/at most 2/)
  })

  it('one-way ANOVA requires at least three groups', () => {
    expect(analysisSelectionError(ANALYSES['one-way-anova'], ['c1', 'c2'])).toMatch(/at least 3/)
    expect(analysisSelectionError(ANALYSES['one-way-anova'], ['c1', 'c2', 'c3'])).toBeNull()
  })

  it('descriptive needs at least one group', () => {
    expect(analysisSelectionError(ANALYSES['descriptive'], [])).toMatch(/at least 1/)
    expect(analysisSelectionError(ANALYSES['descriptive'], ['c1'])).toBeNull()
  })
})
