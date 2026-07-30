/**
 * "Open in Code mode" bridge generators (Phase F2) — the PURE, framework-free
 * core, in a `.mjs` so BOTH the typed `.ts` wrapper (app + vitest) and the
 * Node smoke (`scripts/analysis-smoke.mjs`, which can't import `.ts`) run the
 * SAME code. One source of truth for the generated Python.
 *
 * Turns a GUI figure spec into an editable matplotlib script that runs against
 * the SAME dataset the Code lane's Pyodide worker already injects as `df` (see
 * `_namespace` in runtime/pyodide.worker.ts, and code-script.ts's starter
 * script, which documents the identical convention). The script never embeds
 * rows as literals — on a real dataset that blew straight past `MAX_SCRIPT_CODE`
 * and pinned the save queue (a script that big never made it into a saved
 * draft again). Referencing the injected `df` keeps the script small AND lets
 * it use the FULL dataset, not a snapshot frozen at generation time.
 *
 * ONE direction: parsing edited code back into the GUI is out of scope forever.
 *
 * SECURITY: never `eval`, never a raw column NAME interpolated as code. Names
 * reach the script ONLY as quoted Python string literals via `pyQuote` (a
 * `df[...]` key), so a name with quotes / spaces / newlines can't break out of
 * its literal or inject a statement.
 */

/**
 * A safely-quoted Python string literal. MIRROR of `pyQuote` in code-script.ts
 * (kept in sync; the bridge tests assert the escaping through the generator
 * output). Escapes `\` and `'` so the delimiters can't be broken out of, and
 * `\n`/`\r`/`\t` so a name with a real newline can't split the literal.
 */
export function pyQuote(s) {
  return `'${String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}'`
}

function numCell(v) {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function columnCells(dataset, id) {
  const idx = dataset.columns.findIndex((c) => c.id === id)
  if (idx === -1) return []
  return dataset.rows.map((r) => r[idx] ?? null)
}

/**
 * Count of rows where `yCol` is a finite number (and, when the x axis is
 * numeric, `xCol` is too) — the same population `fitPolynomial` (trendline.ts)
 * fits against. Used ONLY to decide whether a polynomial trendline call is
 * even worth emitting: `fitPolynomial` refuses (draws NO line) once the order
 * needs more coefficients than there are points, but `np.polyfit` happily
 * returns a rank-deficient curve — mirroring the refusal is what keeps the
 * generated figure matching the GUI's.
 */
function finitePairCount(dataset, xCol, yCol, xIsNumeric) {
  const xs = columnCells(dataset, xCol.id)
  const ys = columnCells(dataset, yCol.id)
  let n = 0
  for (let i = 0; i < ys.length; i++) {
    if (numCell(ys[i]) === null) continue
    if (xIsNumeric && numCell(xs[i]) === null) continue
    n++
  }
  return n
}

/**
 * Mirrors SheetsChart.tsx's `logAvailable`: a log Y axis only ever applies to
 * a line/scatter chart whose plotted Y values are all positive — a bar/area
 * baseline is 0, and a log scale can't place 0 or a negative value. Without
 * this gate, flipping a logged line chart to bar/area left the OLD `logScale`
 * flag on the spec and the generated script kept calling `set_yscale('log')`
 * on an axis the GUI now renders linear.
 * ponytail: checks raw cell values, not the mean-of-replicates the GUI plots
 * for a Y with replicate subcolumns — exact parity there isn't worth chasing
 * for a log-axis availability check; revisit if a replicate chart hits it.
 */
function logAvailable(spec, dataset, xCol, yCols) {
  if (spec.type !== 'line' && spec.type !== 'scatter') return false
  const xs = columnCells(dataset, xCol.id)
  const yColumns = yCols.map((c) => columnCells(dataset, c.id))
  let sawRow = false
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === null || xs[i] === undefined) continue
    sawRow = true
    for (const ys of yColumns) {
      const v = numCell(ys[i])
      if (v !== null && v <= 0) return false
    }
  }
  return sawRow
}

const PREAMBLE = ['import numpy as np', 'import matplotlib.pyplot as plt']

function header(what) {
  return [
    `# Open in Code mode — generated from your ${what} (Data Terminal bridge).`,
    '# This is a plain matplotlib script now: edit it, Run it, download the .py.',
    "# Your dataset is preloaded as `df` (a pandas DataFrame) — same convention",
    '# as a new Code-lane script; reach a column via df[\'Column Name\'].',
  ]
}

/** The trendline fitter (matches trendline.ts). Emitted only when a chart uses one. */
const TREND_HELPER = `
def _trend(ax, x, y, kind, order=2, window=3):
    x = np.asarray(x, dtype=float); y = np.asarray(y, dtype=float)
    m = np.isfinite(x) & np.isfinite(y)
    x, y = x[m], y[m]
    if x.size < 2:
        return
    xs = np.linspace(x.min(), x.max(), 100)
    if kind == 'movingAverage':
        k = max(2, int(window))
        if x.size >= k:
            o = np.argsort(x); xo, yo = x[o], y[o]
            ax.plot(xo[k - 1:], np.convolve(yo, np.ones(k) / k, 'valid'), '--', color='0.4')
        return
    if kind == 'linear':
        ax.plot(xs, np.polyval(np.polyfit(x, y, 1), xs), '--', color='0.4')
    elif kind == 'polynomial':
        ax.plot(xs, np.polyval(np.polyfit(x, y, max(2, min(6, int(order)))), xs), '--', color='0.4')
    elif kind == 'logarithmic':
        d = x > 0
        if d.sum() >= 2:
            b, a = np.polyfit(np.log(x[d]), y[d], 1); xp = xs[xs > 0]
            ax.plot(xp, a + b * np.log(xp), '--', color='0.4')
    elif kind == 'power':
        d = (x > 0) & (y > 0)
        if d.sum() >= 2:
            b, lna = np.polyfit(np.log(x[d]), np.log(y[d]), 1); xp = xs[xs > 0]
            ax.plot(xp, np.exp(lna) * xp ** b, '--', color='0.4')
    elif kind == 'exponential':
        d = y > 0
        if d.sum() >= 2:
            b, lna = np.polyfit(x[d], np.log(y[d]), 1)
            ax.plot(xs, np.exp(lna) * np.exp(b * xs), '--', color='0.4')
`.trim()

function byId(dataset, id) {
  return dataset.columns.find((c) => c.id === id)
}

/** A runnable placeholder figure — Run still draws something when there's no data. */
function stub(out, message) {
  out.push(
    '',
    'fig, ax = plt.subplots()',
    `ax.text(0.5, 0.5, ${pyQuote(message)}, ha='center', va='center')`,
    'ax.set_axis_off()',
  )
  return out.join('\n')
}

// ─── Sheets chart → matplotlib ───────────────────────────────────────────────

export function chartToPython(spec, dataset) {
  const xCol = byId(dataset, spec.xColumnId)
  const yCols = spec.yColumnIds
    .map((id) => byId(dataset, id))
    .filter((c) => Boolean(c) && c.id !== spec.xColumnId)

  const out = [...header('chart'), '', ...PREAMBLE]
  const trendlines = (spec.trendlines ?? []).filter((t) => yCols.some((c) => c.id === t.yColumnId))
  if (trendlines.length) out.push('', TREND_HELPER)

  if (!xCol || yCols.length === 0) {
    return stub(out, 'Pick an X column and at least one Y column')
  }

  const qx = pyQuote(xCol.name)
  const xIsNumeric = spec.type === 'scatter' || (spec.type !== 'bar' && xCol.type === 'number')

  out.push('', 'fig, ax = plt.subplots()')

  if (spec.type === 'pie') {
    const qy = pyQuote(yCols[0].name)
    out.push(
      `values = np.array(df[${qy}], dtype=float)`,
      `labels = [str(v) for v in df[${qx}]]`,
      'keep = values > 0  # a slice needs a positive share (matches the builder)',
      "ax.pie(values[keep], labels=[l for l, k in zip(labels, keep) if k], autopct='%1.1f%%')",
    )
  } else if (spec.type === 'bar') {
    out.push(
      `labels = [str(v) for v in df[${qx}]]`,
      'xi = np.arange(len(labels))',
      `width = 0.8 / ${yCols.length}`,
    )
    yCols.forEach((c, i) => {
      out.push(`ax.bar(xi + ${i} * width, df[${pyQuote(c.name)}], width, label=${pyQuote(c.name)})`)
    })
    out.push(
      `ax.set_xticks(xi + width * ${(yCols.length - 1) / 2})`,
      "ax.set_xticklabels(labels, rotation=45, ha='right')",
    )
  } else {
    if (xIsNumeric) {
      out.push(`x = np.array(df[${qx}], dtype=float)`)
    } else {
      out.push(`labels = [str(v) for v in df[${qx}]]`, 'x = np.arange(len(labels))')
    }
    yCols.forEach((c) => {
      const qy = pyQuote(c.name)
      if (spec.type === 'scatter') out.push(`ax.scatter(x, df[${qy}], label=${qy})`)
      else if (spec.type === 'area') {
        out.push(`ax.fill_between(x, df[${qy}], alpha=0.4, label=${qy})`, `ax.plot(x, df[${qy}])`)
      } else out.push(`ax.plot(x, df[${qy}], marker='o', label=${qy})`)
    })
    if (!xIsNumeric) out.push('ax.set_xticks(x)', "ax.set_xticklabels(labels, rotation=45, ha='right')")
  }

  for (const t of trendlines) {
    const c = yCols.find((y) => y.id === t.yColumnId)
    if (t.kind === 'polynomial') {
      const order = Math.max(2, Math.min(6, Math.floor(t.order ?? 2)))
      // Mirror fitPolynomial's guard: too few finite points for this order
      // fits nothing sensible, and the GUI draws no line at all — so neither
      // does the script.
      if (finitePairCount(dataset, xCol, c, xIsNumeric) <= order) continue
    }
    const xExpr = xIsNumeric ? `df[${qx}]` : 'np.arange(len(df))'
    out.push(
      `_trend(ax, ${xExpr}, df[${pyQuote(c.name)}], ${pyQuote(t.kind)}` +
        (t.order != null ? `, order=${t.order}` : '') +
        (t.window != null ? `, window=${t.window}` : '') +
        ')',
    )
  }

  if (spec.type !== 'pie') {
    out.push(`ax.set_xlabel(${pyQuote(spec.xTitle || xCol.name)})`)
    const yTitle = spec.yTitle || (yCols.length === 1 ? yCols[0].name : 'Value')
    out.push(`ax.set_ylabel(${pyQuote(yTitle)})`)
    if (spec.logScale && logAvailable(spec, dataset, xCol, yCols)) out.push("ax.set_yscale('log')")
    if (spec.showGridlines) out.push('ax.grid(True, alpha=0.3)')
    if (spec.showLegend && yCols.length > 0) out.push('ax.legend()')
  }
  if (spec.title) out.push(`ax.set_title(${pyQuote(spec.title)})`)
  out.push('fig.tight_layout()')
  return out.join('\n')
}

// ─── Lab analysis → matplotlib ───────────────────────────────────────────────

const XY_ANALYSES = new Set([
  'correlation',
  'linear-regression',
  'nonlinear-regression',
  'area-under-curve',
  'smoothing',
  'interpolate-standard-curve',
])
const LINEAR_FIT_ANALYSES = new Set(['correlation', 'linear-regression'])
const PARTS_ANALYSES = new Set(['fraction-of-total'])

export function analysisToPython(spec, dataset) {
  const selected = spec.columnIds.map((id) => byId(dataset, id)).filter((c) => Boolean(c))
  const out = [...header('analysis'), '', ...PREAMBLE]

  if (XY_ANALYSES.has(spec.analysisId)) {
    const xCol = dataset.columns.find((c) => c.role === 'x') ?? selected[0]
    const yCol = selected.find((c) => c.id !== (xCol && xCol.id)) ?? selected[0]
    if (!xCol || !yCol) return stub(out, 'Select an X column and a Y column.')
    const qx = pyQuote(xCol.name)
    const qy = pyQuote(yCol.name)
    out.push('', 'fig, ax = plt.subplots()')
    out.push(
      `x = np.array(df[${qx}], dtype=float)`,
      `y = np.array(df[${qy}], dtype=float)`,
      'm = np.isfinite(x) & np.isfinite(y)',
      'x, y = x[m], y[m]',
      'ax.scatter(x, y, zorder=3)',
    )
    if (LINEAR_FIT_ANALYSES.has(spec.analysisId)) {
      out.push(
        'if x.size >= 2 and np.std(x) > 0:',
        '    c = np.polyfit(x, y, 1); xs = np.linspace(x.min(), x.max(), 100)',
        "    ax.plot(xs, np.polyval(c, xs), '--', color='0.4')",
      )
    } else if (spec.analysisId === 'smoothing' || spec.analysisId === 'area-under-curve') {
      out.push('o = np.argsort(x)', "ax.plot(x[o], y[o], color='0.4')")
    }
    out.push(`ax.set_xlabel(${qx})`, `ax.set_ylabel(${qy})`, 'fig.tight_layout()')
    return out.join('\n')
  }

  if (PARTS_ANALYSES.has(spec.analysisId)) {
    const cols = selected.filter((c) => c.type === 'number')
    if (cols.length === 0) return stub(out, 'Select the columns whose totals make up the whole.')
    out.push('', 'fig, ax = plt.subplots()')
    const labels = `[${cols.map((c) => pyQuote(c.name)).join(', ')}]`
    const sums = `[${cols.map((c) => `float(np.nansum(df[${pyQuote(c.name)}]))`).join(', ')}]`
    out.push(
      `labels = ${labels}`,
      `values = np.array(${sums}, dtype=float)`,
      'keep = values > 0',
      "ax.pie(values[keep], labels=[l for l, k in zip(labels, keep) if k], autopct='%1.1f%%')",
      'fig.tight_layout()',
    )
    return out.join('\n')
  }

  const groups = selected.filter((c) => c.type === 'number')
  if (groups.length === 0) return stub(out, 'Select at least one numeric column to summarise.')
  out.push('', 'fig, ax = plt.subplots()')
  const labels = `[${groups.map((c) => pyQuote(c.name)).join(', ')}]`
  const means = `[${groups.map((c) => `float(np.nanmean(df[${pyQuote(c.name)}]))`).join(', ')}]`
  const sds = `[${groups.map((c) => `float(np.nanstd(df[${pyQuote(c.name)}], ddof=1))`).join(', ')}]`
  out.push(
    `labels = ${labels}`,
    `means = ${means}`,
    `sds = ${sds}`,
    'ax.bar(np.arange(len(labels)), means, yerr=sds, capsize=4)',
    'ax.set_xticks(np.arange(len(labels)))',
    "ax.set_xticklabels(labels, rotation=45, ha='right')",
    "ax.set_ylabel('Mean (± SD)')",
    'fig.tight_layout()',
  )
  return out.join('\n')
}
