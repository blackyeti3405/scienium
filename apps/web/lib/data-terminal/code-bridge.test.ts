import { describe, expect, it } from 'vitest'
import { chartToPython, analysisToPython, type BridgeDataset } from './code-bridge'
import type { SheetsChartSpec } from './sheets-chart'
import type { AnalysisSpec } from './dataset-schema'

/**
 * The "Open in Code mode" bridge generators (Phase F2). These pin the code
 * STRUCTURE (chart type → the right matplotlib call, referencing the Code
 * lane's pre-injected `df` rather than embedding rows — the fix for a script
 * that blew past MAX_SCRIPT_CODE on a real dataset and pinned the save queue)
 * and the SECURITY property: a column name reaches the script only as a quoted
 * literal, never as interpolated code. The smoke (`analysis-smoke.mjs`) proves
 * the generated scripts actually RUN to a figure in Pyodide against an injected
 * `df`, exactly like the worker.
 */

const ds: BridgeDataset = {
  columns: [
    { id: 'c1', name: 'Time', type: 'number', role: 'x' },
    { id: 'c2', name: 'Mass', type: 'number', role: 'y' },
    { id: 'c3', name: 'Group', type: 'text', role: 'group' },
    { id: 'c4', name: 'Force', type: 'number', role: 'y' },
    { id: 'c5', name: "O'Brien; import os", type: 'number', role: 'y' },
  ],
  rows: [
    [1, 10, 'a', 5, 1],
    [2, 20, 'b', 6, 2],
    [3, null, 'c', 7, 3],
  ],
}

const baseChart = (spec: Partial<SheetsChartSpec>): SheetsChartSpec => ({
  id: 'ch1',
  type: 'bar',
  xColumnId: 'c3',
  yColumnIds: ['c2'],
  showLegend: true,
  showGridlines: true,
  ...spec,
})

describe('chartToPython', () => {
  it('references the Data-Terminal-injected `df` instead of embedding rows (stays well under the size cap)', () => {
    const code = chartToPython(baseChart({}), ds)
    expect(code).toContain('import matplotlib.pyplot as plt')
    expect(code).toContain('import numpy as np')
    // No local DataFrame construction — the worker already injects `df`, keyed
    // by column name, exactly like a new Code-lane script's starter.
    expect(code).not.toContain('pd.DataFrame(')
    expect(code).not.toContain("float('nan')")
    expect(code).toContain("df['Group']")
    expect(code).toContain("df['Mass']")
  })

  it('maps each chart type to the matching matplotlib call', () => {
    expect(chartToPython(baseChart({ type: 'bar' }), ds)).toContain('ax.bar(')
    expect(chartToPython(baseChart({ type: 'pie', xColumnId: 'c3', yColumnIds: ['c2'] }), ds)).toContain('ax.pie(')
    expect(chartToPython(baseChart({ type: 'scatter', xColumnId: 'c1', yColumnIds: ['c2'] }), ds)).toContain('ax.scatter(')
    expect(chartToPython(baseChart({ type: 'line', xColumnId: 'c1', yColumnIds: ['c2'] }), ds)).toContain('ax.plot(')
    expect(chartToPython(baseChart({ type: 'area', xColumnId: 'c1', yColumnIds: ['c2'] }), ds)).toContain('ax.fill_between(')
  })

  it('emits the trendline helper + a _trend call when a chart has one', () => {
    const code = chartToPython(
      baseChart({ type: 'scatter', xColumnId: 'c1', yColumnIds: ['c2'], trendlines: [{ yColumnId: 'c2', kind: 'linear' }] }),
      ds,
    )
    expect(code).toContain('def _trend(')
    expect(code).toContain("_trend(ax, df['Time'], df['Mass'], 'linear')")
  })

  it('carries title / axis titles / legend / log-Y options through', () => {
    const code = chartToPython(
      baseChart({ type: 'line', xColumnId: 'c1', yColumnIds: ['c2'], title: 'My chart', xTitle: 'T', yTitle: 'm', logScale: true }),
      ds,
    )
    expect(code).toContain("ax.set_title('My chart')")
    expect(code).toContain("ax.set_xlabel('T')")
    expect(code).toContain("ax.set_ylabel('m')")
    expect(code).toContain("ax.set_yscale('log')")
    expect(code).toContain('ax.legend()')
  })

  it('escapes a column name with a quote/semicolon so it stays a string literal (no injection)', () => {
    const code = chartToPython(baseChart({ type: 'scatter', xColumnId: 'c1', yColumnIds: ['c5'] }), ds)
    // The dangerous name appears ONLY inside a quoted literal — the quote is
    // backslash-escaped, exactly like code-script.ts's pyQuote.
    expect(code).toContain("'O\\'Brien; import os'")
    // No generated LINE is the bare payload as a statement (it never breaks out).
    expect(code.split('\n').some((l) => l.trim() === 'import os')).toBe(false)
  })

  it('stays runnable (labelled placeholder) when columns are missing', () => {
    const code = chartToPython(baseChart({ xColumnId: 'nope', yColumnIds: [] }), ds)
    expect(code).toContain('fig, ax = plt.subplots()')
    expect(code).toContain('ax.text(')
  })

  it('skips a polynomial trendline when there are too few points to fit it (mirrors fitPolynomial)', () => {
    // c2 (Mass) is [10, 20, null] — only 2 finite points; order 2 needs >= 3.
    const code = chartToPython(
      baseChart({
        type: 'scatter',
        xColumnId: 'c1',
        yColumnIds: ['c2'],
        trendlines: [{ yColumnId: 'c2', kind: 'polynomial', order: 2 }],
      }),
      ds,
    )
    expect(code).not.toContain("_trend(ax, df['Time'], df['Mass']")
  })

  it('still draws a polynomial trendline once there are enough points', () => {
    const code = chartToPython(
      baseChart({
        type: 'scatter',
        xColumnId: 'c1',
        yColumnIds: ['c4'], // Force: [5, 6, 7], all finite — 3 points, order 2 needs 3.
        trendlines: [{ yColumnId: 'c4', kind: 'polynomial', order: 2 }],
      }),
      ds,
    )
    expect(code).toContain("_trend(ax, df['Time'], df['Force'], 'polynomial', order=2)")
  })

  it('does not emit set_yscale("log") on a chart type log is unavailable for (mirrors logAvailable)', () => {
    // baseChart defaults to type 'bar' — log Y only ever applies to line/scatter.
    const code = chartToPython(baseChart({ logScale: true }), ds)
    expect(code).not.toContain('set_yscale')
  })

  it('still emits set_yscale("log") on a line/scatter chart with all-positive Y', () => {
    const code = chartToPython(
      baseChart({ type: 'line', xColumnId: 'c1', yColumnIds: ['c2'], logScale: true }),
      ds,
    )
    expect(code).toContain("ax.set_yscale('log')")
  })
})

describe('analysisToPython', () => {
  const analysis = (spec: Partial<AnalysisSpec>): AnalysisSpec => ({
    id: 'a1',
    analysisId: 'one-way-anova',
    columnIds: ['c2', 'c4'],
    ...spec,
  })

  it('renders a group analysis as a bar of means with SD error bars', () => {
    const code = analysisToPython(analysis({ analysisId: 'one-way-anova', columnIds: ['c2', 'c4'] }), ds)
    expect(code).toContain('ax.bar(')
    expect(code).toContain('yerr=sds')
    expect(code).toContain('ddof=1')
  })

  it('renders an XY analysis as a scatter of the X-role column vs the selected Y (+ fit for linear regression)', () => {
    const code = analysisToPython(analysis({ analysisId: 'linear-regression', columnIds: ['c2'] }), ds)
    expect(code).toContain('ax.scatter(x, y')
    expect(code).toContain('np.polyfit(x, y, 1)')
    // X is the role='x' column (Time), Y the selected one (Mass) — as the template picks them.
    expect(code).toContain("df['Time']")
    expect(code).toContain("df['Mass']")
  })

  it('renders a parts-of-whole analysis as a pie', () => {
    const code = analysisToPython(analysis({ analysisId: 'fraction-of-total', columnIds: ['c2', 'c4'] }), ds)
    expect(code).toContain('ax.pie(')
  })

  it('escapes a hostile column name in a group analysis', () => {
    const code = analysisToPython(analysis({ analysisId: 'descriptive', columnIds: ['c5'] }), ds)
    expect(code).toContain("'O\\'Brien; import os'")
    expect(code.split('\n').some((l) => l.trim() === 'import os')).toBe(false)
  })
})
