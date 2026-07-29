import { describe, expect, it } from 'vitest'
import { AnalysesSchema, ChartsSchema, LayoutsSchema, MAX_LAYOUTS } from './dataset-schema'
import { clampIntInput } from './sheets-chart'
import type { SheetsChartSpec } from './sheets-chart'

/**
 * The save boundary that FIX 3 hardens: a cleared numeric input in the chart
 * builder must NOT reach the server as a spec that `ChartsSchema` rejects — one
 * rejected snapshot pins the save queue and blocks EVERY later dataset save.
 * These tests pin the exact rejection so the client-side guard (and the input
 * clamps that stop the bad value being produced) stay honest.
 */

const chart = (spec: Partial<SheetsChartSpec>): SheetsChartSpec => ({
  id: 'ch1',
  type: 'bar',
  xColumnId: 'c1',
  yColumnIds: ['c2'],
  showLegend: true,
  showGridlines: true,
  ...spec,
})

describe('ChartsSchema — the save boundary an emptied builder field would 400 on', () => {
  it('rejects a polynomial order of 0 (a cleared order field before clamping)', () => {
    const bad = chart({ trendlines: [{ yColumnId: 'c2', kind: 'polynomial', order: 0 }] })
    expect(ChartsSchema.safeParse([bad]).success).toBe(false)
  })

  it('rejects a moving-average window of 0', () => {
    const bad = chart({ trendlines: [{ yColumnId: 'c2', kind: 'movingAverage', window: 0 }] })
    expect(ChartsSchema.safeParse([bad]).success).toBe(false)
  })

  it('rejects a NaN yMin (what an unguarded Number("") of a bad field yields)', () => {
    const bad = chart({ yMin: NaN })
    expect(ChartsSchema.safeParse([bad]).success).toBe(false)
  })

  it('accepts the same spec once the order is clamped back into range', () => {
    const fixed = chart({
      trendlines: [{ yColumnId: 'c2', kind: 'polynomial', order: clampIntInput('', 2, 6) }],
    })
    expect(ChartsSchema.safeParse([fixed]).success).toBe(true)
  })
})

/**
 * SECURITY (D2a): analysis `options` are bounded to ENUMS / NUMBERS / column-ids
 * on purpose — a free-form string could otherwise ride the persisted spec toward
 * a template. These pin that the wire schema refuses anything outside that shape,
 * so the "options cross as data, never as code" contract can't silently rot.
 */
describe('AnalysesSchema — bounded options are the code-injection guard', () => {
  const anova = (options: unknown) => [
    { id: 'a1', analysisId: 'one-way-anova', columnIds: ['c1', 'c2', 'c3'], options },
  ]

  it('accepts the known enum / number / column-id options', () => {
    expect(AnalysesSchema.safeParse(anova({ posthoc: 'tukey', correction: 'fdr_bh' })).success).toBe(true)
    expect(AnalysesSchema.safeParse(anova({ posthoc: 'dunnett', controlColumnId: 'c1' })).success).toBe(true)
    expect(AnalysesSchema.safeParse(anova({ mu0: 3.5, graph: 'box', whiskers: 'p10_90' })).success).toBe(true)
  })

  it('rejects a free-form string value for a bounded enum option', () => {
    expect(AnalysesSchema.safeParse(anova({ posthoc: 'drop table students; --' })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ correction: '__import__("os")' })).success).toBe(false)
  })

  it('rejects an unknown option key (strict — no smuggled attributes)', () => {
    expect(AnalysesSchema.safeParse(anova({ evilCode: 'x = 1' })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ whiskers: 'tukey', extra: 2 })).success).toBe(false)
  })

  it('rejects a non-finite number option', () => {
    expect(AnalysesSchema.safeParse(anova({ mu0: NaN })).success).toBe(false)
  })
})

/**
 * Phase F1 (figure craft): the new Format Graph / Format Axes / significance-
 * bracket options must stay bounded to enums, numbers, and two length-capped
 * title strings — a title is matplotlib TEXT (data), never code, so the only
 * strings allowed are held to the same length cap as a column name.
 */
describe('AnalysesSchema — Phase F1 figure-craft options are bounded', () => {
  const anova = (options: unknown) => [
    { id: 'a1', analysisId: 'one-way-anova', columnIds: ['c1', 'c2', 'c3'], options },
  ]

  it('accepts the bounded format / bracket / axis options', () => {
    expect(
      AnalysesSchema.safeParse(
        anova({ brackets: 'stars', symbol: 'square', symbolSize: 12, symbolFill: 'open', errorBarDir: 'up' }),
      ).success,
    ).toBe(true)
    expect(
      AnalysesSchema.safeParse(
        anova({ yScale: 'log10', xScale: 'ln', yMin: 0, yMax: 100, minorTicks: 'on', yTicks: 6, lineStyle: 'dashed' }),
      ).success,
    ).toBe(true)
    expect(AnalysesSchema.safeParse(anova({ xAxisTitle: 'Dose (mg)', yAxisTitle: 'Response' })).success).toBe(true)
  })

  it('rejects an out-of-enum bracket / symbol / scale value', () => {
    expect(AnalysesSchema.safeParse(anova({ brackets: 'all' })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ symbol: 'pentagon' })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ yScale: 'log5' })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ minorTicks: 'maybe' })).success).toBe(false)
  })

  it('rejects a free-form string smuggled through an axis title (length cap)', () => {
    expect(AnalysesSchema.safeParse(anova({ xAxisTitle: 'x'.repeat(500) })).success).toBe(false)
  })

  it('rejects an out-of-range / non-finite number option', () => {
    expect(AnalysesSchema.safeParse(anova({ symbolSize: 999 })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ yMin: Infinity })).success).toBe(false)
    expect(AnalysesSchema.safeParse(anova({ yTicks: 1 })).success).toBe(false)
  })
})

/**
 * Phase F2 (poster layouts): the layout array is bounded and `.strict()` like
 * every other draft array — rows/cols are small ints (a poster grid, never a
 * render bomb), panels reference an analysis id, and unknown keys are refused.
 */
describe('LayoutsSchema — poster layouts are bounded to a small grid', () => {
  const layout = (spec: Record<string, unknown>) => [
    { id: 'ly1', name: 'Poster', rows: 1, cols: 2, panels: [{ analysisId: 'a1' }, { analysisId: 'a2' }], ...spec },
  ]

  it('accepts a valid 1×2 layout', () => {
    expect(LayoutsSchema.safeParse(layout({})).success).toBe(true)
  })

  it('rejects a grid dimension outside 1–4 (a render bomb)', () => {
    expect(LayoutsSchema.safeParse(layout({ rows: 0 })).success).toBe(false)
    expect(LayoutsSchema.safeParse(layout({ cols: 5 })).success).toBe(false)
    expect(LayoutsSchema.safeParse(layout({ rows: 2.5 })).success).toBe(false)
  })

  it('rejects an empty panel analysisId and an unknown key (strict)', () => {
    expect(LayoutsSchema.safeParse(layout({ panels: [{ analysisId: '' }] })).success).toBe(false)
    expect(LayoutsSchema.safeParse(layout({ panels: [{ analysisId: 'a1', evil: 1 }] })).success).toBe(false)
    expect(LayoutsSchema.safeParse(layout({ evilCode: 'x' })).success).toBe(false)
  })

  it('caps the number of layouts', () => {
    const many = Array.from({ length: MAX_LAYOUTS + 1 }, (_, i) => ({
      id: `ly${i}`, name: 'P', rows: 1, cols: 1, panels: [{ analysisId: 'a1' }],
    }))
    expect(LayoutsSchema.safeParse(many).success).toBe(false)
  })
})
