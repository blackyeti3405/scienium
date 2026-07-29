import { describe, expect, it } from 'vitest'
import {
  evaluateFormula,
  recomputeFormulaColumns,
  FormulaError,
  type FormulaContext,
} from './formula'
import type { ColumnSpec } from './dataset'

const columns: ColumnSpec[] = [
  { id: 'c1', name: 'Mass', type: 'number', role: 'y' },
  { id: 'c2', name: 'Volume', type: 'number', role: 'y' },
  { id: 'c3', name: 'Density', type: 'number', role: 'y' },
]

const ctx = (rows: (number | null)[][], targetId?: string): FormulaContext => ({
  columns,
  rows,
  targetId,
})

const base = ctx([
  [10, 2, null],
  [20, 5, null],
  [30, 4, null],
])

describe('evaluateFormula', () => {
  it('divides one column by another', () => {
    expect(evaluateFormula('=col(Mass) / col(Volume)', base)).toEqual([5, 4, 7.5])
  })

  it('accepts a formula with or without the leading =', () => {
    expect(evaluateFormula('col(Mass) * 2', base)).toEqual([20, 40, 60])
  })

  it('matches column names case-insensitively and ignores padding', () => {
    expect(evaluateFormula('=col(  mass ) + 1', base)).toEqual([11, 21, 31])
  })

  it('honours operator precedence', () => {
    expect(evaluateFormula('=col(Volume) + 2 * 3', base)).toEqual([8, 11, 10])
  })

  it('treats ^ as right-associative', () => {
    // 2^(3^2) = 512, not (2^3)^2 = 64
    expect(evaluateFormula('=2 ^ 3 ^ 2', ctx([[0]]))).toEqual([512])
  })

  it('applies unary minus and signed exponents', () => {
    expect(evaluateFormula('=-col(Volume)', base)).toEqual([-2, -5, -4])
    expect(evaluateFormula('=2 ^ -1', ctx([[0]]))).toEqual([0.5])
  })

  it('reads scientific notation', () => {
    expect(evaluateFormula('=1e-3 * col(Mass)', base)).toEqual([0.01, 0.02, 0.03])
  })

  it('broadcasts an aggregate across every row', () => {
    // Normalising to a column mean is the single most common real use.
    expect(evaluateFormula('=col(Volume) / mean(col(Volume))', ctx([[0, 2], [0, 4]]))).toEqual([
      0.6666666666666666, 1.3333333333333333,
    ])
  })

  it('fills every row when the formula references no column', () => {
    expect(evaluateFormula('=2 * 3', base)).toEqual([6, 6, 6])
  })

  it('propagates a missing value instead of treating it as zero', () => {
    const withGap = ctx([
      [10, 2],
      [null, 5],
    ])
    expect(evaluateFormula('=col(Mass) + col(Volume)', withGap)).toEqual([12, null])
  })

  it('returns missing for a division by zero rather than Infinity', () => {
    // An Infinity here would poison every mean downstream and flatten a chart axis.
    expect(evaluateFormula('=col(Mass) / col(Volume)', ctx([[10, 0], [10, 2]]))).toEqual([null, 5])
  })

  it('returns missing where a function has no real answer', () => {
    expect(evaluateFormula('=log10(col(Mass))', ctx([[0], [100]]))).toEqual([null, 2])
    expect(evaluateFormula('=sqrt(col(Mass))', ctx([[-4], [9]]))).toEqual([null, 3])
  })

  it('skips missing values when aggregating', () => {
    const rows = [[10], [null], [20]]
    expect(evaluateFormula('=mean(col(Mass))', ctx(rows))).toEqual([15, 15, 15])
    expect(evaluateFormula('=n(col(Mass))', ctx(rows))).toEqual([2, 2, 2])
  })

  it('computes the sample standard deviation, not the population one', () => {
    // n-1 denominator: values 2,4,4,4,5,5,7,9 give 2.138…, not the population 2.
    const rows = [[2], [4], [4], [4], [5], [5], [7], [9]]
    expect(evaluateFormula('=sd(col(Mass))', ctx(rows))[0]).toBeCloseTo(2.13809, 4)
  })

  it('refuses a formula that reads its own column', () => {
    // Otherwise the result depends on how many times the button was pressed.
    expect(() => evaluateFormula('=col(Mass) * 2', ctx([[1, 2, 3]], 'c1'))).toThrow(FormulaError)
  })

  it('names an unknown column in the error', () => {
    expect(() => evaluateFormula('=col(Weight)', base)).toThrow(/no column called "Weight"/)
  })

  it('names an unknown function in the error', () => {
    expect(() => evaluateFormula('=wobble(col(Mass))', base)).toThrow(/no function called "wobble"/)
  })

  it('explains a comma rather than dumping a parser error', () => {
    expect(() => evaluateFormula('=min(col(Mass), col(Volume))', base)).toThrow(/single value/)
  })

  it('reports an unclosed bracket', () => {
    expect(() => evaluateFormula('=(col(Mass) * 2', base)).toThrow(FormulaError)
    expect(() => evaluateFormula('=col(Mass', base)).toThrow(/closing bracket/)
  })

  it('rejects an empty formula', () => {
    expect(() => evaluateFormula('=', base)).toThrow(FormulaError)
    expect(() => evaluateFormula('   ', base)).toThrow(FormulaError)
  })

  it('rejects trailing junk', () => {
    expect(() => evaluateFormula('=col(Mass) 5', base)).toThrow(FormulaError)
  })

  it('never evaluates arbitrary JavaScript', () => {
    // The parser only ever produces numbers — a saved formula runs in a
    // teammate's browser, so this must not be an execution vector.
    expect(() => evaluateFormula('=globalThis', base)).toThrow(FormulaError)
    expect(() => evaluateFormula('=constructor', base)).toThrow(FormulaError)
    expect(() => evaluateFormula('=[1].map(alert)', base)).toThrow(FormulaError)
  })
})

describe('regressions found in review', () => {
  it('does not resolve functions through Object.prototype', () => {
    // `UNARY_FUNCTIONS[name]` on a plain object literal walked the prototype
    // chain, and `constructor` is already lowercase — so `=constructor(5)`
    // reached the global `Object`, was invoked, and silently blanked the whole
    // column while the panel reported success.
    for (const name of [
      'constructor',
      '__proto__',
      '__definegetter__',
      '__lookupgetter__',
      'hasownproperty',
      'tostring',
      'valueof',
    ]) {
      expect(() => evaluateFormula(`=${name}(5)`, base)).toThrow(FormulaError)
    }
  })

  it('references a column whose name contains brackets', () => {
    // `toDatasetCsv` writes "Mass (g)" itself when a unit is set, so scanning to
    // the FIRST ')' made this app's own export unreferenceable, permanently.
    const ctxWithUnits: FormulaContext = {
      columns: [{ id: 'c1', name: 'Mass (g)', type: 'number', role: 'y' }],
      rows: [[10], [20]],
    }
    expect(evaluateFormula('=col(Mass (g)) * 2', ctxWithUnits)).toEqual([20, 40])
  })

  it('still reports an unclosed col( bracket', () => {
    expect(() => evaluateFormula('=col(Mass (g)', base)).toThrow(/closing bracket/)
  })
})

describe('recomputeFormulaColumns', () => {
  it('refreshes a computed column when its inputs change', () => {
    // The recalculation chain: without it, editing Mass left Density showing
    // the value it had when Apply was pressed — and autosaved that stale number.
    const columns: ColumnSpec[] = [
      { id: 'c1', name: 'Mass', type: 'number', role: 'y' },
      { id: 'c2', name: 'Volume', type: 'number', role: 'y' },
      { id: 'c3', name: 'Density', type: 'number', role: 'y', formula: '=col(Mass) / col(Volume)' },
    ]
    const { rows, failed } = recomputeFormulaColumns(columns, [
      [10, 2, 999],
      [20, 5, 999],
    ])
    expect(failed).toEqual([])
    expect(rows.map((r) => r[2])).toEqual([5, 4])
  })

  it('leaves a column alone and reports when its formula no longer works', () => {
    // The last good numbers are the student's result; blanking them because a
    // referenced column was renamed would destroy data to report an error.
    const columns: ColumnSpec[] = [
      { id: 'c1', name: 'Mass', type: 'number', role: 'y' },
      { id: 'c2', name: 'Density', type: 'number', role: 'y', formula: '=col(Gone) * 2' },
    ]
    const { rows, failed } = recomputeFormulaColumns(columns, [[10, 42]])
    expect(rows[0]![1]).toBe(42)
    expect(failed).toHaveLength(1)
    expect(failed[0]!.columnId).toBe('c2')
  })

  it('does nothing when no column carries a formula', () => {
    const columns: ColumnSpec[] = [{ id: 'c1', name: 'Mass', type: 'number', role: 'y' }]
    const input = [[1], [2]]
    expect(recomputeFormulaColumns(columns, input).rows).toBe(input)
  })
})
