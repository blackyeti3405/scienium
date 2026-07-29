import { describe, expect, it } from 'vitest'
import {
  buildChart,
  blankChart,
  newChartId,
  clampIntInput,
  optionalNumberInput,
  finiteNumberInput,
  type SheetsChartSpec,
} from './sheets-chart'
import type { ColumnSpec, DatasetShape } from './dataset'

const col = (id: string, name: string, role: ColumnSpec['role'], extra: Partial<ColumnSpec> = {}): ColumnSpec => ({
  id,
  name,
  type: 'number',
  role,
  ...extra,
})

const base = (spec: Partial<SheetsChartSpec>): SheetsChartSpec => ({
  id: 'ch1',
  type: 'bar',
  xColumnId: 'c1',
  yColumnIds: ['c2'],
  showLegend: true,
  showGridlines: true,
  ...spec,
})

describe('buildChart — series assembly', () => {
  const shape: DatasetShape = {
    columns: [col('c1', 'Time', 'x'), col('c2', 'Mass', 'y', { unit: 'g' })],
    rows: [
      [1, 10],
      [2, 20],
      [3, 30],
    ],
  }

  it('builds one series over a category axis for a bar chart', () => {
    const built = buildChart(base({}), shape)
    expect(built.ok).toBe(true)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.xIsNumeric).toBe(false)
    expect(built.series).toEqual([{ key: 'c2', name: 'Mass (g)', color: '#F5C518', errorKey: undefined }])
    expect(built.rows).toEqual([
      { x: '1', c2: 10 },
      { x: '2', c2: 20 },
      { x: '3', c2: 30 },
    ])
    expect(built.table.header).toEqual(['Time', 'Mass (g)'])
  })

  it('uses a numeric axis for a scatter chart', () => {
    const built = buildChart(base({ type: 'scatter' }), shape)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.xIsNumeric).toBe(true)
    expect(built.rows[0]).toEqual({ x: 1, c2: 10 })
  })

  it('refuses when no Y column is chosen', () => {
    const built = buildChart(base({ yColumnIds: [] }), shape)
    expect(built.ok).toBe(false)
  })
})

describe('buildChart — trendlines display equation and R²', () => {
  const shape: DatasetShape = {
    columns: [col('c1', 'Time', 'x'), col('c2', 'Mass', 'y')],
    rows: [
      [1, 10],
      [2, 20],
      [3, 30],
    ],
  }

  it('fits a linear trendline over a numeric scatter axis', () => {
    const built = buildChart(
      base({ type: 'scatter', trendlines: [{ yColumnId: 'c2', kind: 'linear' }] }),
      shape,
    )
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.trendlines).toHaveLength(1)
    const t = built.trendlines[0]!
    expect(t.ok).toBe(true)
    expect(t.equation).toBe('y = 10x')
    expect(t.r2).toBeCloseTo(1, 8)
    expect(t.points.length).toBeGreaterThan(1)
    expect(built.summary).toContain('y = 10x')
  })

  it('fits a polynomial trendline over the category index', () => {
    const built = buildChart(
      base({ type: 'bar', trendlines: [{ yColumnId: 'c2', kind: 'polynomial', order: 2 }] }),
      shape,
    )
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    const t = built.trendlines[0]!
    expect(t.ok).toBe(true)
    expect(t.r2).toBeCloseTo(1, 6)
    // One overlay point per category, positioned by category label.
    expect(t.points.map((p) => p.x)).toEqual(['1', '2', '3'])
  })
})

describe('buildChart — trendlines never emit ±Infinity on a category axis', () => {
  const cat: DatasetShape = {
    columns: [col('c1', 'Group', 'x', { type: 'text' }), col('c2', 'Mass', 'y')],
    rows: [
      ['A', 5],
      ['B', 8],
      ['C', 9],
      ['D', 10],
    ],
  }

  it('drops the ln(0) = −Infinity point a logarithmic fit produces at index 0', () => {
    const built = buildChart(base({ type: 'bar', trendlines: [{ yColumnId: 'c2', kind: 'logarithmic' }] }), cat)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    const t = built.trendlines[0]!
    // No non-finite overlay point survives — the old code kept ty:-Infinity at 'A'.
    expect(t.points.every((p) => Number.isFinite(p.ty))).toBe(true)
    expect(t.points.some((p) => p.ty === -Infinity)).toBe(false)
  })

  it('drops the a·0^b = +Infinity point a decreasing power fit produces at index 0', () => {
    const powShape: DatasetShape = {
      ...cat,
      rows: [
        ['A', 10],
        ['B', 5],
        ['C', 3],
        ['D', 2],
      ],
    }
    const built = buildChart(base({ type: 'bar', trendlines: [{ yColumnId: 'c2', kind: 'power' }] }), powShape)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    const t = built.trendlines[0]!
    expect(t.points.every((p) => Number.isFinite(p.ty))).toBe(true)
    expect(t.points.some((p) => p.ty === Infinity)).toBe(false)
  })
})

describe('chart input clamps keep specs inside ChartsSchema bounds', () => {
  it('clampIntInput: empty/NaN → lo, out-of-range clamped, floors decimals', () => {
    expect(clampIntInput('', 2, 6)).toBe(2) // cleared polynomial-order field → 0 was the 400 trigger
    expect(clampIntInput('abc', 2, 6)).toBe(2)
    expect(clampIntInput('9', 2, 6)).toBe(6)
    expect(clampIntInput('1', 2, 6)).toBe(2)
    expect(clampIntInput('3.9', 2, 6)).toBe(3)
  })

  it('optionalNumberInput: empty/NaN → undefined, never a stored NaN', () => {
    expect(optionalNumberInput('')).toBeUndefined()
    expect(optionalNumberInput('  ')).toBeUndefined()
    expect(optionalNumberInput('x')).toBeUndefined()
    expect(optionalNumberInput('-4.5')).toBe(-4.5)
  })

  it('finiteNumberInput: non-finite → fallback', () => {
    expect(finiteNumberInput('', 0)).toBe(0)
    expect(finiteNumberInput('7', 0)).toBe(7)
  })
})

describe('buildChart — error bars are derived, never faked', () => {
  const withReplicates: DatasetShape = {
    columns: [col('c1', 'Day', 'x'), col('c2', 'Height', 'y'), col('c3', 'Height', 'y', { subcolumnOf: 'c2' })],
    rows: [
      [1, 10, 12],
      [2, 20, 24],
    ],
  }

  it('plots the mean of a replicate group and derives ±SD from it', () => {
    const built = buildChart(base({ errorBars: { mode: 'sd' } }), withReplicates)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.rows[0]!.c2).toBe(11) // mean(10, 12)
    expect(built.rows[0]!.c2__e).toBeCloseTo(Math.SQRT2, 6) // sample SD of {10,12}
    expect(built.series[0]!.errorKey).toBe('c2__e')
  })

  it('derives ±SEM from replicates', () => {
    const built = buildChart(base({ errorBars: { mode: 'sem' } }), withReplicates)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.rows[0]!.c2__e).toBeCloseTo(1, 6) // SD √2 / √2 = 1
  })

  it('does NOT fake ±SD when the Y has no replicates', () => {
    const noReplicates: DatasetShape = {
      columns: [col('c1', 'Day', 'x'), col('c2', 'Height', 'y')],
      rows: [[1, 10], [2, 20]],
    }
    const built = buildChart(base({ errorBars: { mode: 'sd' } }), noReplicates)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.rows[0]).not.toHaveProperty('c2__e')
  })

  it('reads ±% and fixed error off each point', () => {
    const shape: DatasetShape = { columns: [col('c1', 'Day', 'x'), col('c2', 'H', 'y')], rows: [[1, 10]] }
    const pct = buildChart(base({ errorBars: { mode: 'percent', value: 10 } }), shape)
    if (!pct.ok || pct.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(pct.rows[0]!.c2__e).toBeCloseTo(1, 8) // 10% of 10

    const fixed = buildChart(base({ errorBars: { mode: 'fixed', value: 5 } }), shape)
    if (!fixed.ok || fixed.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(fixed.rows[0]!.c2__e).toBe(5)
  })

  it('reads a paired error column', () => {
    const shape: DatasetShape = {
      columns: [col('c1', 'Day', 'x'), col('c2', 'H', 'y'), col('c3', 'err', 'yErr', { pairedWith: 'c2' })],
      rows: [[1, 10, 2]],
    }
    const built = buildChart(base({ errorBars: { mode: 'column' } }), shape)
    if (!built.ok || built.kind !== 'cartesian') throw new Error('expected cartesian')
    expect(built.rows[0]!.c2__e).toBe(2)
  })
})

describe('buildChart — pie', () => {
  it('splits a positive Y into slices by the X label, dropping non-positive shares', () => {
    const shape: DatasetShape = {
      columns: [col('c1', 'Part', 'label', { type: 'text' }), col('c2', 'Amount', 'y')],
      rows: [
        ['A', 3],
        ['B', 7],
        ['C', 0],
      ],
    }
    const built = buildChart(base({ type: 'pie' }), shape)
    if (!built.ok || built.kind !== 'pie') throw new Error('expected pie')
    expect(built.slices.map((s) => [s.name, s.value])).toEqual([
      ['A', 3],
      ['B', 7],
    ])
  })
})

describe('spec helpers', () => {
  it('generates unique ids and a sensible starting chart', () => {
    const shape: DatasetShape = {
      columns: [col('c1', 'X', 'x'), col('c2', 'Y', 'y')],
      rows: [[1, 2]],
    }
    const first = blankChart(shape, [])
    expect(first).toMatchObject({ id: 'ch1', xColumnId: 'c1', yColumnIds: ['c2'], type: 'bar' })
    expect(newChartId([first])).toBe('ch2')
  })
})
