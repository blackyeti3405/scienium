#!/usr/bin/env node
/**
 * Phase D1 correctness proof — the whole point of Lab mode is that the numbers
 * are right. This loads the SAME extracted Pyodide dist the browser proxy
 * serves, loads the full Lab package set (numpy + matplotlib + pandas + scipy +
 * statsmodels) from `.pyodide-cache`, runs the EXACT analysis templates the
 * worker runs (imported from analysis-templates.mjs — one source of truth), and
 * asserts each output against hand-/textbook-computed values.
 *
 * Known-answer datasets (chosen so t, F, eta^2 come out to exact round numbers):
 *   - unpaired t: A=[7..11], B=[12..16] -> t = -5.0, df = 8, Cohen's d = -3.162
 *   - one-way ANOVA: three shifted [1..5] groups -> F = 2.0, df=(2,12), eta^2=0.25
 *   - descriptive on [7..11] -> mean 9, SD 1.5811, SEM 0.7071, 95% CI [7.037, 10.963]
 *
 * Run `node scripts/fetch-pyodide.mjs` first. Then: node scripts/analysis-smoke.mjs
 */
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadPyodide } from 'pyodide'
import { PYODIDE_VERSION } from '../lib/data-terminal/runtime/version.mjs'
import { ANALYSES_PY } from '../lib/data-terminal/runtime/analysis-templates.mjs'
import { chartToPython, analysisToPython } from '../lib/data-terminal/code-bridge-core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(here, '..', '.pyodide-cache', 'pyodide') + path.sep

let failures = 0
function check(name, cond, got, want) {
  const ok = !!cond
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}` + (ok ? '' : `  (got ${got}, want ${want})`))
}
const near = (a, b, tol) => a !== null && a !== undefined && Math.abs(a - b) <= tol

// Phase F1 helpers.
const starsOf = (p) => (p < 0.001 ? 3 : p < 0.01 ? 2 : p < 0.05 ? 1 : 0)
const b64 = (s) => Buffer.from(s ?? '', 'base64')
const setsEqual = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))
// The template pins svg.hashsalt, so element ids are deterministic; the only
// remaining per-render bit is the metadata wall-clock <dc:date>. Strip it to
// compare the actual DRAWING bytes (the byte-identity + "figure changed" proofs).
const stripDate = (svg) => (svg ?? '').replace(/<dc:date>[^<]*<\/dc:date>/g, '')

// FIX 2 (bracket alignment past a dropped empty group). Calls the PRODUCTION
// _box/_violin directly with a synthetic groups list (no analysis guards an
// empty group out here on purpose) and reads back the REAL matplotlib line
// coordinates _draw_brackets produced -- via the same _CAPTURE mechanism
// _export uses to keep a finished figure alive -- instead of parsing SVG
// pixel-space paths. One source of truth: the bracket-drawing code under test
// is exactly what analysis-templates.mjs ships.
const BRACKET_PROBE_PY = `
def _bracket_probe(kind, groups_json, brackets, mode):
    global _CAPTURE
    groups = [(nm, np.array(vals, dtype=float)) for nm, vals in json.loads(groups_json)]
    _CAPTURE = []
    try:
        if kind == 'box':
            _box(groups, {}, 'Value', 'probe', 1.5, brackets, mode)
        else:
            _violin(groups, {}, 'Value', 'probe', brackets, mode)
        fig = _CAPTURE[-1]
        out = []
        for line in fig.axes[0].lines:
            gid = line.get_gid()
            if gid and gid.startswith('dt-bracket-'):
                out.append({'gid': gid, 'x': sorted(set(float(v) for v in line.get_xdata()))})
        return json.dumps(out)
    finally:
        for f in (_CAPTURE or []):
            plt.close(f)
        _CAPTURE = None
`

// Phase F2 code-bridge probe: exec a GENERATED (untrusted-shaped) script exactly
// as the Code lane would, then report whether it produced a valid SVG figure.
// This is the "figure matches" proof: the same plotting on the same data yields
// a figure without error. Uses the module globals ANALYSES_PY already imported.
//
// FIX 1: the generator no longer embeds rows — it references `df`, the SAME
// pre-injected DataFrame the real worker builds in `_namespace`
// (runtime/pyodide.worker.ts). `_bridge_namespace` below is a deliberate
// duplicate of that function (kept in sync by hand, like BOOTSTRAP_PY isn't
// shared with this Node harness elsewhere either) — it must inject `df`
// exactly the way the worker does, or this probe would pass while the real
// Code lane 500s on NameError.
const BRIDGE_PROBE_PY = `
import pandas as pd

def _bridge_namespace(dataset):
    names = [c['name'] for c in dataset['columns']]
    types = [c['type'] for c in dataset['columns']]
    rows = dataset['rows']
    data = {}
    for j, nm in enumerate(names):
        col = [(r[j] if j < len(r) else None) for r in rows]
        if types[j] == 'number':
            data[nm] = np.array([(np.nan if v is None else float(v)) for v in col], dtype=float)
        else:
            data[nm] = np.array([(None if v is None else v) for v in col], dtype=object)
    df = pd.DataFrame(data)
    return {'np': np, 'pd': pd, 'plt': plt, 'df': df}

def _bridge_run(code, dataset_json):
    plt.close('all')
    ns = _bridge_namespace(json.loads(dataset_json))
    err = None
    try:
        exec(compile(code, '<bridge>', 'exec'), ns)
    except BaseException as e:
        err = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
    nums = plt.get_fignums()
    svg_ok = False
    if nums:
        buf = io.StringIO()
        try:
            plt.figure(nums[0]).savefig(buf, format='svg')
            s = buf.getvalue()
            svg_ok = s[s.index('<svg'):].startswith('<svg')
        except Exception as e:
            err = err or str(e)
    plt.close('all')
    return json.dumps({'figures': len(nums), 'svg_ok': svg_ok, 'error': err})
`

async function bridgeRun(py, code, dataset) {
  py.globals.set('__code__', code)
  py.globals.set('__bridge_ds__', JSON.stringify(dataset))
  return JSON.parse(await py.runPythonAsync('_bridge_run(__code__, __bridge_ds__)'))
}

/** Compose a poster layout via the F2 export path (matplotlib subplots + savefig). */
async function exportLayout(py, ds, panels, rows, cols, fmt, dpi) {
  py.globals.set('__ds__', JSON.stringify(ds))
  py.globals.set('__panels__', JSON.stringify(panels))
  py.globals.set('__rows__', rows)
  py.globals.set('__cols__', cols)
  py.globals.set('__fmt__', fmt)
  py.globals.set('__dpi__', dpi)
  const json = await py.runPythonAsync(
    '_export_layout(json.loads(__ds__), json.loads(__panels__), __rows__, __cols__, __fmt__, __dpi__)',
  )
  return JSON.parse(json)
}

/** groupsSpec: [[name, [values...]], ...]; brackets: [[i, j, p], ...] group-index pairs. */
async function bracketProbe(py, kind, groupsSpec, brackets, mode) {
  py.globals.set('__kind__', kind)
  py.globals.set('__groups__', JSON.stringify(groupsSpec))
  py.globals.set('__brackets__', JSON.stringify(brackets))
  py.globals.set('__mode__', mode)
  const out = await py.runPythonAsync(
    '_bracket_probe(__kind__, __groups__, json.loads(__brackets__), __mode__)',
  )
  return JSON.parse(out)
}

/** Re-render one figure of a trusted analysis via the export path (matplotlib savefig). */
async function exportFigure(py, analysisId, ds, columnIds, options, figureIndex, fmt, dpi) {
  py.globals.set('__aid__', analysisId)
  py.globals.set('__ds__', JSON.stringify(ds))
  py.globals.set('__spec__', JSON.stringify({ columnIds, ...(options ? { options } : {}) }))
  py.globals.set('__fidx__', figureIndex)
  py.globals.set('__fmt__', fmt)
  py.globals.set('__dpi__', dpi)
  const json = await py.runPythonAsync(
    '_export(__aid__, json.loads(__ds__), json.loads(__spec__), __fidx__, __fmt__, __dpi__)',
  )
  return JSON.parse(json)
}

/**
 * Build the AnalysisDataset wire shape from column-major arrays. `role`/`type`
 * default to `y`/`number` so every D1/D2a case stays unchanged; the D2b
 * Grouped/Nested cases set them, because those analyses read STRUCTURE from
 * column roles (row factor, treatment, subject).
 */
function dataset(colDefs) {
  const n = Math.max(...colDefs.map((c) => c.values.length))
  const rows = []
  for (let i = 0; i < n; i++) rows.push(colDefs.map((c) => c.values[i] ?? null))
  return {
    columns: colDefs.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type ?? 'number',
      role: c.role ?? 'y',
    })),
    rows,
  }
}

async function analyze(py, analysisId, ds, columnIds, options) {
  py.globals.set('__aid__', analysisId)
  py.globals.set('__ds__', JSON.stringify(ds))
  py.globals.set('__spec__', JSON.stringify({ columnIds, ...(options ? { options } : {}) }))
  const json = await py.runPythonAsync('_analyze(__aid__, json.loads(__ds__), json.loads(__spec__))')
  return JSON.parse(json)
}

async function main() {
  await stat(path.join(distDir, 'pyodide.asm.wasm')).catch(() => {
    throw new Error(`No dist at ${distDir} — run: node scripts/fetch-pyodide.mjs`)
  })

  console.log(`Loading pyodide ${PYODIDE_VERSION} from ${distDir}`)
  const py = await loadPyodide({ indexURL: distDir })
  console.log('Loading Lab package set: numpy, matplotlib, pandas, scipy, statsmodels …')
  await py.loadPackage(['numpy', 'matplotlib', 'pandas', 'scipy', 'statsmodels'])
  // Confirm the two stats wheels are actually served + importable from the cache.
  const versions = await py.runPythonAsync(
    'import scipy, statsmodels; scipy.__version__ + " / " + statsmodels.__version__',
  )
  console.log(`scipy / statsmodels served: ${versions}`)
  await py.runPythonAsync('import json')
  await py.runPythonAsync(ANALYSES_PY)
  await py.runPythonAsync(BRIDGE_PROBE_PY)

  // ── Unpaired t-test ──────────────────────────────────────────────────────
  console.log('\n[unpaired-t]  A=[7..11] vs B=[12..16]  (published: t=-5.0, df=8)')
  {
    const ds = dataset([
      { id: 'a', name: 'Group A', values: [7, 8, 9, 10, 11] },
      { id: 'b', name: 'Group B', values: [12, 13, 14, 15, 16] },
    ])
    const r = await analyze(py, 'unpaired-t', ds, ['a', 'b'])
    const s = r.stats
    console.log(`  t=${s.t}  df=${s.df}  p=${s['p (two-sided)']}  d=${s["Cohen's d"]}`)
    check('t == -5.0', near(s.t, -5.0, 1e-6), s.t, -5.0)
    check('df == 8', s.df === 8, s.df, 8)
    check('mean difference == -5', near(s['mean difference'], -5.0, 1e-9), s['mean difference'], -5)
    check("Cohen's d == -3.1623", near(s["Cohen's d"], -3.16228, 1e-3), s["Cohen's d"], -3.16228)
    check('p in (0.0005, 0.002)', s['p (two-sided)'] > 0.0005 && s['p (two-sided)'] < 0.002, s['p (two-sided)'], '~0.00105')
    check('Levene chose Student (equal var)', s['test used'] === "Student's t", s['test used'], "Student's t")
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, '>=1 svg')
    check('assumptions checklist present', Array.isArray(r.assumptions) && r.assumptions.length === 3, r.assumptions?.length, 3)
  }

  // ── Unpaired t-test: degenerate (zero variance in both groups) ──────────
  console.log('\n[unpaired-t]  A=[5,5,5] vs B=[7,7,7]  (both constant -- t is undefined, must not crash)')
  {
    const ds = dataset([
      { id: 'a', name: 'Group A', values: [5, 5, 5] },
      { id: 'b', name: 'Group B', values: [7, 7, 7] },
    ])
    const r = await analyze(py, 'unpaired-t', ds, ['a', 'b'])
    console.log(`  error=${JSON.stringify(r.error)}`)
    check('no ZeroDivisionError', !r.error?.includes('ZeroDivisionError'), r.error, 'no ZeroDivisionError')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('graceful message present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no t fabricated', r.stats?.t === undefined, r.stats?.t, 'undefined')
    check('no p fabricated', r.stats?.['p (two-sided)'] === undefined, r.stats?.['p (two-sided)'], 'undefined')
  }

  // ── One-way ANOVA ────────────────────────────────────────────────────────
  console.log('\n[one-way-anova]  three shifted [1..5] groups  (published: F=2.0, df=(2,12), eta^2=0.25)')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const r = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'])
    const s = r.stats
    console.log(`  F=${s.F}  df=(${s['df between']}, ${s['df within']})  p=${s.p}  eta^2=${s['eta squared']}`)
    check('F == 2.0', near(s.F, 2.0, 1e-6), s.F, 2.0)
    check('df between == 2', s['df between'] === 2, s['df between'], 2)
    check('df within == 12', s['df within'] === 12, s['df within'], 12)
    check('eta^2 == 0.25', near(s['eta squared'], 0.25, 1e-9), s['eta squared'], 0.25)
    check('p in (0.15, 0.20)', s.p > 0.15 && s.p < 0.2, s.p, '~0.178')
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, '>=1 svg')
  }

  // ── Descriptive statistics ───────────────────────────────────────────────
  console.log('\n[descriptive]  [7..11]  (published: mean 9, SD 1.5811, SEM 0.7071, CI [7.037, 10.963])')
  {
    const ds = dataset([{ id: 'a', name: 'Group A', values: [7, 8, 9, 10, 11] }])
    const r = await analyze(py, 'descriptive', ds, ['a'])
    const row = r.tables[0].rows[0] // [name, n, mean, sd, sem, median, min, max, ci_lo, ci_hi]
    console.log(`  n=${row[1]} mean=${row[2]} sd=${row[3]} sem=${row[4]} median=${row[5]} ci=[${row[8]}, ${row[9]}]`)
    check('n == 5', row[1] === 5, row[1], 5)
    check('mean == 9', near(row[2], 9, 1e-9), row[2], 9)
    check('SD == 1.5811', near(row[3], 1.581139, 1e-4), row[3], 1.581139)
    check('SEM == 0.7071', near(row[4], 0.707107, 1e-4), row[4], 0.707107)
    check('median == 9', near(row[5], 9, 1e-9), row[5], 9)
    check('min == 7', near(row[6], 7, 1e-9), row[6], 7)
    check('max == 11', near(row[7], 11, 1e-9), row[7], 11)
    check('95% CI low == 7.037', near(row[8], 7.0367, 1e-3), row[8], 7.0367)
    check('95% CI high == 10.963', near(row[9], 10.9633, 1e-3), row[9], 10.9633)
  }

  // ── One-sample t-test ────────────────────────────────────────────────────
  // a=[7..11] vs mu0=8: mean 9, SD 1.581139, SEM 0.707107 -> t=(9-8)/SEM=1.414214,
  // df=4, Cohen's d=(9-8)/SD=0.632456, 95% CI = 9 +/- 2.776445*SEM = [7.037, 10.963].
  console.log('\n[one-sample-t]  [7..11] vs mu0=8  (hand: t=1.41421, df=4, d=0.63246)')
  {
    const ds = dataset([{ id: 'a', name: 'Group A', values: [7, 8, 9, 10, 11] }])
    const r = await analyze(py, 'one-sample-t', ds, ['a'], { mu0: 8 })
    const s = r.stats
    console.log(`  t=${s.t}  df=${s.df}  p=${s['p (two-sided)']}  d=${s["Cohen's d"]}  CI=[${s['95% CI low']}, ${s['95% CI high']}]`)
    check('t == 1.41421', near(s.t, 1.414214, 1e-5), s.t, 1.414214)
    check('df == 4', s.df === 4, s.df, 4)
    check('mean == 9', near(s.mean, 9, 1e-9), s.mean, 9)
    check("Cohen's d == 0.63246", near(s["Cohen's d"], 0.632456, 1e-5), s["Cohen's d"], 0.632456)
    check('95% CI low == 7.037', near(s['95% CI low'], 7.0367, 1e-3), s['95% CI low'], 7.0367)
    check('95% CI high == 10.963', near(s['95% CI high'], 10.9633, 1e-3), s['95% CI high'], 10.9633)
    check('p in (0.22, 0.24)', s['p (two-sided)'] > 0.22 && s['p (two-sided)'] < 0.24, s['p (two-sided)'], '~0.2296')
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, '>=1 svg')
  }

  // ── Paired t-test ────────────────────────────────────────────────────────
  // a=[6..10], b=[5,5,5,5,5] -> diffs=[1,2,3,4,5], mean diff 3, SD(diff) 1.581139,
  // SEM 0.707107 -> t=3/0.707107=4.242641, df=4, dz=3/1.581139=1.897367.
  console.log('\n[paired-t]  a-b=[1,2,3,4,5]  (hand: mean diff=3, t=4.24264, df=4, dz=1.89737)')
  {
    const ds = dataset([
      { id: 'a', name: 'After', values: [6, 7, 8, 9, 10] },
      { id: 'b', name: 'Before', values: [5, 5, 5, 5, 5] },
    ])
    const r = await analyze(py, 'paired-t', ds, ['a', 'b'])
    const s = r.stats
    console.log(`  t=${s.t}  df=${s.df}  meanDiff=${s['mean difference']}  dz=${s["Cohen's dz"]}`)
    check('mean difference == 3', near(s['mean difference'], 3, 1e-9), s['mean difference'], 3)
    check('t == 4.24264', near(s.t, 4.242641, 1e-5), s.t, 4.242641)
    check('df == 4', s.df === 4, s.df, 4)
    check("Cohen's dz == 1.89737", near(s["Cohen's dz"], 1.897367, 1e-5), s["Cohen's dz"], 1.897367)
    check('p in (0.010, 0.016)', s['p (two-sided)'] > 0.01 && s['p (two-sided)'] < 0.016, s['p (two-sided)'], '~0.01327')
    check('before-after figure produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, '>=1 svg')
  }

  // ── Mann-Whitney U ───────────────────────────────────────────────────────
  // A=[1..5] entirely below B=[6..10]: U1 = R1 - n1(n1+1)/2 = 15 - 15 = 0; exact
  // two-sided p for complete separation (n1=n2=5) = 2/C(10,5) = 2/252 = 0.007937;
  // rank-biserial = 2*U1/(n1*n2) - 1 = -1 (group 1 always smaller).
  console.log('\n[mann-whitney]  A=[1..5] vs B=[6..10]  (hand: U=0, p=0.007937, r=-1)')
  {
    const ds = dataset([
      { id: 'a', name: 'A', values: [1, 2, 3, 4, 5] },
      { id: 'b', name: 'B', values: [6, 7, 8, 9, 10] },
    ])
    const r = await analyze(py, 'mann-whitney', ds, ['a', 'b'])
    const s = r.stats
    console.log(`  U=${s.U}  p=${s['p (two-sided)']}  r=${s['rank-biserial r']}`)
    check('U == 0', near(s.U, 0, 1e-9), s.U, 0)
    check('p == 0.007937', near(s['p (two-sided)'], 0.007937, 1e-4), s['p (two-sided)'], 0.007937)
    check('rank-biserial == -1', near(s['rank-biserial r'], -1, 1e-9), s['rank-biserial r'], -1)
  }

  // ── Wilcoxon signed-rank ─────────────────────────────────────────────────
  // a-b=[1,2,3,4,5] (5 nonzero, no ties, all same sign): statistic W=min sum=0,
  // exact two-sided p = 2 * (1/2^5) = 0.0625.
  console.log('\n[wilcoxon]  a-b=[1,2,3,4,5]  (hand: W=0, p=0.0625)')
  {
    const ds = dataset([
      { id: 'a', name: 'After', values: [6, 7, 8, 9, 10] },
      { id: 'b', name: 'Before', values: [5, 5, 5, 5, 5] },
    ])
    const r = await analyze(py, 'wilcoxon', ds, ['a', 'b'])
    const s = r.stats
    console.log(`  W=${s.W}  p=${s['p (two-sided)']}  nonzero=${s['nonzero pairs']}`)
    check('W == 0', near(s.W, 0, 1e-9), s.W, 0)
    check('p == 0.0625', near(s['p (two-sided)'], 0.0625, 1e-4), s['p (two-sided)'], 0.0625)
    check('5 nonzero pairs', s['nonzero pairs'] === 5, s['nonzero pairs'], 5)
  }

  // ── Kruskal-Wallis + Dunn's post-hoc ─────────────────────────────────────
  // G1=[1..4],G2=[5..8],G3=[9..12] (N=12, no ties): rank sums 10/26/42, mean ranks
  // 2.5/6.5/10.5. H = 12/(N(N+1)) * sum(Ri^2/ni) - 3(N+1) = 9.84615, df=2,
  // p = chi2.sf(H,2) = exp(-H/2) = exp(-4.923077) = 0.0072767. Dunn SE =
  // sqrt(N(N+1)/12*(1/4+1/4)) = sqrt(6.5) = 2.549510; z(G1,G3) = -8/2.54951 =
  // -3.13783 (the significant pair).
  console.log('\n[kruskal-wallis]  three disjoint [1..12] blocks  (hand: H=9.84615, df=2, p=0.0072767)')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4] },
      { id: 'g2', name: 'G2', values: [5, 6, 7, 8] },
      { id: 'g3', name: 'G3', values: [9, 10, 11, 12] },
    ])
    const r = await analyze(py, 'kruskal-wallis', ds, ['g1', 'g2', 'g3'])
    const s = r.stats
    console.log(`  H=${s.H}  df=${s.df}  p=${s.p}`)
    check('H == 9.84615', near(s.H, 9.846154, 1e-4), s.H, 9.846154)
    check('df == 2', s.df === 2, s.df, 2)
    check('p == 0.0072767', near(s.p, 0.0072767, 1e-5), s.p, 0.0072767)
    const dunn = r.tables?.[0]?.rows ?? []
    // rows: [comparison, z, raw p, adj p, significant]; find G1 vs G3.
    const g13 = dunn.find((row) => row[0] === 'G1 vs G3')
    console.log(`  Dunn G1 vs G3: z=${g13?.[1]}  rawp=${g13?.[2]}  adjp=${g13?.[3]}  sig=${g13?.[4]}`)
    check("Dunn's z(G1,G3) == -3.13783", near(g13?.[1], -3.137833, 1e-4), g13?.[1], -3.137833)
    check("Dunn's G1 vs G3 is the significant pair (Bonferroni)", g13?.[4] === 'yes', g13?.[4], 'yes')
    check('Dunn produced all 3 pairs', dunn.length === 3, dunn.length, 3)
  }

  // ── One-way ANOVA + Tukey HSD (PUBLISHED worked example) ─────────────────
  // Source: Montgomery, "Design and Analysis of Experiments," the tensile-strength
  // vs cotton-weight-percent single-factor example (5 levels x 5 reps). Published
  // ANOVA F = 14.76 on (4, 20) df; MSE = 8.06; Tukey T_0.05 = q_0.05(5,20)*sqrt(MSE/n)
  // = 5.37, so pairs differing by more than 5.37 are significant. Published
  // significant pairs: 15-20, 15-25, 15-30, 20-30, 25-35, 30-35 (means
  // 9.8/15.4/17.6/21.6/10.8). Hand-verified: SS_treat=475.76, SS_error=161.20.
  console.log('\n[one-way-anova + tukey]  Montgomery tensile-strength example  (published: F=14.76, T=5.37)')
  {
    const ds = dataset([
      { id: 'p15', name: '15pct', values: [7, 7, 15, 11, 9] },
      { id: 'p20', name: '20pct', values: [12, 17, 12, 18, 18] },
      { id: 'p25', name: '25pct', values: [14, 18, 18, 19, 19] },
      { id: 'p30', name: '30pct', values: [19, 25, 22, 19, 23] },
      { id: 'p35', name: '35pct', values: [7, 10, 11, 15, 11] },
    ])
    const cols = ['p15', 'p20', 'p25', 'p30', 'p35']
    const r = await analyze(py, 'one-way-anova', ds, cols, { posthoc: 'tukey', correction: 'tukey' })
    const s = r.stats
    console.log(`  F=${s.F}  df=(${s['df between']}, ${s['df within']})  p=${s.p}`)
    check('F == 14.757 (published 14.76)', near(s.F, 14.7568, 1e-2), s.F, 14.7568)
    check('df between == 4', s['df between'] === 4, s['df between'], 4)
    check('df within == 20', s['df within'] === 20, s['df within'], 20)
    const tuk = r.tables?.[0]?.rows ?? []
    const sigPairs = new Set(tuk.filter((row) => row[5] === 'yes').map((row) => row[0]))
    console.log(`  Tukey significant pairs: ${[...sigPairs].join(' | ')}`)
    // Published Montgomery conclusions (|mean diff| > 5.37):
    const wantSig = ['15pct vs 20pct', '15pct vs 25pct', '15pct vs 30pct', '20pct vs 30pct', '25pct vs 35pct', '30pct vs 35pct']
    const wantNot = ['15pct vs 35pct', '20pct vs 25pct', '20pct vs 35pct', '25pct vs 30pct']
    for (const p of wantSig) check(`Tukey: ${p} significant`, sigPairs.has(p), sigPairs.has(p), true)
    for (const p of wantNot) check(`Tukey: ${p} NOT significant`, !sigPairs.has(p), sigPairs.has(p), false)
    check('Tukey table has all 10 pairs', tuk.length === 10, tuk.length, 10)
    // Mean diff sign check: 15pct(9.8) - 20pct(15.4) = -5.6.
    const t1520 = tuk.find((row) => row[0] === '15pct vs 20pct')
    check('Tukey mean diff 15-20 == -5.6', near(t1520?.[1], -5.6, 1e-6), t1520?.[1], -5.6)
  }

  // ── ANOVA all-pairs with a chosen correction family (multipletests) ──────
  // Bonferroni on m pairs: adjusted p = min(1, raw p * m). Proves the honest
  // "which comparisons + matching correction" path is wired to statsmodels.
  console.log('\n[one-way-anova + bonferroni]  correction family via statsmodels multipletests')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const r = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], { posthoc: 'tukey', correction: 'bonferroni' })
    const rows = r.tables?.[0]?.rows ?? []
    // rows: [comparison, mean diff, raw p, adj p, significant]; adj = min(1, raw*3).
    const ok = rows.every((row) => near(row[3], Math.min(1, row[2] * 3), 1e-6))
    console.log(`  ${rows.length} pairs; adj == min(1, raw*3) for all: ${ok}`)
    check('all 3 pairs present', rows.length === 3, rows.length, 3)
    check('Bonferroni adj == min(1, raw*3)', ok, ok, true)
  }

  // ── ANOVA Dunnett vs a control (scipy.stats.dunnett) ─────────────────────
  // Control = 15pct (mean 9.8). Directional/structural known outcomes: 30pct
  // (mean 21.6, diff +11.8) is clearly significant; 35pct (mean 10.8, diff +1.0)
  // is clearly not. scipy.stats.dunnett carries the correction internally.
  console.log('\n[one-way-anova + dunnett]  vs control=15pct  (30pct sig, 35pct not)')
  {
    const ds = dataset([
      { id: 'p15', name: '15pct', values: [7, 7, 15, 11, 9] },
      { id: 'p20', name: '20pct', values: [12, 17, 12, 18, 18] },
      { id: 'p30', name: '30pct', values: [19, 25, 22, 19, 23] },
      { id: 'p35', name: '35pct', values: [7, 10, 11, 15, 11] },
    ])
    const cols = ['p15', 'p20', 'p30', 'p35']
    const r = await analyze(py, 'one-way-anova', ds, cols, { posthoc: 'dunnett', controlColumnId: 'p15' })
    const rows = r.tables?.[0]?.rows ?? []
    const byName = Object.fromEntries(rows.map((row) => [row[0], row]))
    console.log(`  ${rows.map((row) => `${row[0]}:${row[4]}`).join(' | ')}`)
    check('Dunnett has 3 vs-control rows (control excluded)', rows.length === 3, rows.length, 3)
    check('Dunnett 30pct vs 15pct significant', byName['30pct vs 15pct']?.[4] === 'yes', byName['30pct vs 15pct']?.[4], 'yes')
    check('Dunnett 35pct vs 15pct NOT significant', byName['35pct vs 15pct']?.[4] === 'no', byName['35pct vs 15pct']?.[4], 'no')
    check('Dunnett mean diff 30-15 == +11.8', near(byName['30pct vs 15pct']?.[1], 11.8, 1e-6), byName['30pct vs 15pct']?.[1], 11.8)
  }

  // ── ANOVA Dunnett with a STALE columnId ordered before the control ───────
  // Regression for the index-space bug: _groups() SKIPS columnIds that don't
  // resolve in the dataset, so the resolved arrs/names are shorter than the
  // raw spec.columnIds. Resolving the control by `col_ids.index(ctrl_id)`
  // (an index into the UNFILTERED list) landed on the wrong resolved group
  // whenever a stale id was ordered before the control. 'bogus' sits before
  // 'g1' here; a correct fix still finds g1 (mean 3) as the control.
  console.log('\n[one-way-anova + dunnett]  stale id before control  (bogus,g1,g2,g3; control=g1)')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const cols = ['bogus', 'g1', 'g2', 'g3']
    const r = await analyze(py, 'one-way-anova', ds, cols, { posthoc: 'dunnett', controlColumnId: 'g1' })
    const rows = r.tables?.[0]?.rows ?? []
    const byName = Object.fromEntries(rows.map((row) => [row[0], row]))
    console.log(`  title=${JSON.stringify(r.tables?.[0]?.title)}  rows=${rows.map((row) => row[0]).join(' | ')}`)
    check('no error', !r.error, r.error, undefined)
    check('table titled "Dunnett vs G1" (not G2)', r.tables?.[0]?.title === 'Dunnett vs G1', r.tables?.[0]?.title, 'Dunnett vs G1')
    check('2 vs-control rows (g2, g3; control excluded)', rows.length === 2, rows.length, 2)
    check('G2 vs G1 mean diff == +1 (means 4 - 3)', near(byName['G2 vs G1']?.[1], 1, 1e-9), byName['G2 vs G1']?.[1], 1)
    check('G3 vs G1 mean diff == +2 (means 5 - 3)', near(byName['G3 vs G1']?.[1], 2, 1e-9), byName['G3 vs G1']?.[1], 2)
  }

  // ── ANOVA Dunnett with a STALE control column id (deleted column) ────────
  // The control itself no longer resolves -- must be a graceful top-level
  // error, not a wrong table and not a traceback.
  console.log('\n[one-way-anova + dunnett]  stale control column  (controlColumnId="deleted")')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const r = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], { posthoc: 'dunnett', controlColumnId: 'deleted' })
    console.log(`  error=${JSON.stringify(r.error)}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('stats empty', Object.keys(r.stats ?? {}).length === 0, r.stats, {})
    check('no tables fabricated', !r.tables, r.tables, undefined)
  }

  // ── Graph families: box-whisker + violin still return valid SVG ───────────
  console.log('\n[graph families]  box-whisker + violin render for a Column analysis')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const box = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], { graph: 'box', whiskers: 'minmax' })
    const vio = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], { graph: 'violin' })
    check('box-whisker figure is SVG', typeof box.figures?.[0] === 'string' && box.figures[0].startsWith('<svg'), box.figures?.length, 'svg')
    check('box run still has correct F', near(box.stats.F, 2.0, 1e-6), box.stats.F, 2.0)
    check('violin figure is SVG', typeof vio.figures?.[0] === 'string' && vio.figures[0].startsWith('<svg'), vio.figures?.length, 'svg')
  }

  // ══ PHASE D2b ═════════════════════════════════════════════════════════════

  // ── Two-way ANOVA (PUBLISHED worked example) ─────────────────────────────
  // Source: Montgomery, "Design and Analysis of Experiments," Example 5.1 — the
  // battery-life study: 3 plate MATERIALS x 3 TEMPERATURES (15/70/125 F), 4 reps
  // per cell (balanced, so Type II == Type I == Type III). Published ANOVA:
  //   Material     F = 7.91,  df (2, 27), p = 0.002
  //   Temperature  F = 28.97, df (2, 27), p ~ 0.0000
  //   interaction  F = 3.56,  df (4, 27), p = 0.0186
  // Grouped layout: row factor = Temperature (a text label column, repeated 4x
  // per level for the reps), column groups = the three Material y columns.
  console.log('\n[two-way-anova]  Montgomery battery-life  (published: Temp F=28.97, Material F=7.91, interaction F=3.56)')
  {
    const T = ['15', '15', '15', '15', '70', '70', '70', '70', '125', '125', '125', '125']
    const ds = dataset([
      { id: 'temp', name: 'Temperature', type: 'text', role: 'label', values: T },
      { id: 'm1', name: 'Material 1', role: 'y', values: [130, 155, 74, 180, 34, 40, 80, 75, 20, 70, 82, 58] },
      { id: 'm2', name: 'Material 2', role: 'y', values: [150, 188, 159, 126, 136, 122, 106, 115, 25, 70, 58, 45] },
      { id: 'm3', name: 'Material 3', role: 'y', values: [138, 110, 168, 160, 174, 120, 150, 139, 96, 104, 82, 60] },
    ])
    const r = await analyze(py, 'two-way-anova', ds, ['m1', 'm2', 'm3'])
    const rows = r.tables?.[0]?.rows ?? []
    // rows: [effect, SS, df, F, p, partial eta^2]; factor A = Temperature (rows),
    // factor B = "Columns" (Materials), then the interaction.
    const tempRow = rows[0]
    const matRow = rows[1]
    const interRow = rows[2]
    console.log(`  Temp F=${tempRow?.[3]} (df ${tempRow?.[2]})  Material F=${matRow?.[3]} (df ${matRow?.[2]})  interaction F=${interRow?.[3]} (df ${interRow?.[2]})`)
    check('no error', !r.error, r.error, undefined)
    check('Temperature F == 28.97', near(tempRow?.[3], 28.968, 5e-2), tempRow?.[3], 28.968)
    check('Temperature df == 2', tempRow?.[2] === 2, tempRow?.[2], 2)
    check('Material F == 7.91', near(matRow?.[3], 7.911, 5e-2), matRow?.[3], 7.911)
    check('Material df == 2', matRow?.[2] === 2, matRow?.[2], 2)
    check('interaction F == 3.56', near(interRow?.[3], 3.560, 5e-2), interRow?.[3], 3.560)
    check('interaction df == 4', interRow?.[2] === 4, interRow?.[2], 4)
    check('residual df == 27', r.stats?.['residual df'] === 27, r.stats?.['residual df'], 27)
    check('partial eta^2 present (0..1)', typeof matRow?.[5] === 'number' && matRow[5] > 0 && matRow[5] < 1, matRow?.[5], '0..1')
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }

  // ── Two-way ANOVA: a fully-missing factor cell (rank-deficient design) ───
  // Row factor 'r2' has NO data at all for column group 'c2' -- statsmodels
  // would otherwise fit a rank-deficient design (df partition sums to n, not
  // n-1) and report an invalid-but-authoritative-looking table. Must refuse.
  console.log('\n[two-way-anova]  row "r2" entirely missing for column "c2"  (must refuse, not fabricate a table)')
  {
    const ds = dataset([
      { id: 'row', name: 'Row', type: 'text', role: 'label', values: ['r1', 'r1', 'r2', 'r2'] },
      { id: 'c1', name: 'c1', role: 'y', values: [1, 2, 3, 4] },
      { id: 'c2', name: 'c2', role: 'y', values: [5, 6, null, null] },
    ])
    const r = await analyze(py, 'two-way-anova', ds, ['c1', 'c2'])
    console.log(`  error=${JSON.stringify(r.error)}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('mentions the empty combination', /empty|combination/.test(r.error ?? ''), r.error, 'mentions the empty cell')
    check('no invalid table fabricated', !r.tables, r.tables, undefined)
  }

  // ── Two-way ANOVA graph families still render ────────────────────────────
  console.log('\n[two-way-anova graphs]  stacked / scatter / heatmap all return valid SVG')
  {
    const ds = dataset([
      { id: 'row', name: 'Row', type: 'text', role: 'label', values: ['a', 'a', 'b', 'b'] },
      { id: 'y1', name: 'Y1', role: 'y', values: [1, 2, 3, 4] },
      { id: 'y2', name: 'Y2', role: 'y', values: [2, 3, 4, 5] },
    ])
    for (const bars of ['stacked', 'scatter', 'heatmap', 'separated']) {
      const r = await analyze(py, 'two-way-anova', ds, ['y1', 'y2'], { bars })
      check(`bars=${bars} figure is SVG`, typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
    }
  }

  // ── Nested ANOVA — THE ACCEPTANCE CRITERION ──────────────────────────────
  // Known balanced nested design: 3 treatments x 3 subjects x 3 reps. Subject
  // means are G1:[10,20,30] G2:[20,30,40] G3:[30,40,50]; reps are subj-mean +/- 1
  // so each subject mean is exact and within-subject variance is tiny.
  //
  // CORRECT (nested) F tests the treatment against BETWEEN-SUBJECT variance ==
  // one-way ANOVA on the per-subject means (Sokal & Rohlf, Biometry, nested-ANOVA
  // identity for balanced designs; also the pseudoreplication guide's "average
  // each unit first" rule). Hand-derived exactly:
  //   subject-means ANOVA: SS_between = 600 (df 2), SS_within = 600 (df 6)
  //   -> F_nested = (600/2)/(600/6) = 300/100 = 3.0, df (2, 6), p ~ 0.125  (NOT sig)
  // NAIVE (pseudoreplicated) one-way ANOVA on all 27 measurements:
  //   SS_between = 1800 (df 2), SS_within = 1818 (df 24)
  //   -> F_naive = 900/75.75 = 11.881, df (2, 24), p ~ 0.00027  (WRONGLY sig)
  // The tool prevents pseudoreplication: honest p=0.125 (n=3 subjects/group) vs
  // the inflated p=0.0003 (n=9 measurements/group) — CROSSING the .05 threshold.
  console.log('\n[nested-anova]  3x3x3 balanced  (AC: nested F=3.0 p~0.125 NOT sig; naive F=11.88 p~0.0003 sig)')
  {
    const treatment = [...Array(9).fill('G1'), ...Array(9).fill('G2'), ...Array(9).fill('G3')]
    const subject = []
    for (let g = 0; g < 3; g++) for (const s of ['S1', 'S2', 'S3']) subject.push(s, s, s)
    const value = [
      9, 10, 11, 19, 20, 21, 29, 30, 31, // G1: subjects 10,20,30
      19, 20, 21, 29, 30, 31, 39, 40, 41, // G2: subjects 20,30,40
      29, 30, 31, 39, 40, 41, 49, 50, 51, // G3: subjects 30,40,50
    ]
    const ds = dataset([
      { id: 'trt', name: 'Treatment', type: 'text', role: 'group', values: treatment },
      { id: 'subj', name: 'Subject', type: 'text', role: 'label', values: subject },
      { id: 'val', name: 'Value', role: 'y', values: value },
    ])
    const r = await analyze(py, 'nested-anova', ds, ['val'])
    const s = r.stats
    console.log(`  nested F=${s['F (nested)']} df(${s['df treatments']},${s['df subjects (error)']}) p=${s['p (nested)']}  |  naive F=${s['F (naive, WRONG)']} df(${s['df treatments']},${s['df naive error']}) p=${s['p (naive, WRONG)']}`)
    check('no error', !r.error, r.error, undefined)
    // (a) correct n / df / F / p — the honest, subject-level analysis
    check('nested F == 3.0', near(s['F (nested)'], 3.0, 1e-6), s['F (nested)'], 3.0)
    check('df treatments == 2', s['df treatments'] === 2, s['df treatments'], 2)
    check('df subjects (error) == 6 (subjects, NOT measurements)', s['df subjects (error)'] === 6, s['df subjects (error)'], 6)
    check('subjects (real n) == 9', s['subjects (real n)'] === 9, s['subjects (real n)'], 9)
    check('measurements == 27', s['measurements'] === 27, s['measurements'], 27)
    check('nested p ~ 0.125 (NOT significant)', s['p (nested)'] > 0.12 && s['p (nested)'] < 0.13, s['p (nested)'], '~0.125')
    check('nested p > 0.05 (honest: no significant difference)', s['p (nested)'] > 0.05, s['p (nested)'], '>0.05')
    // (b) the naive all-independent ANOVA gives a DIFFERENT (wrong, inflated) p
    check('naive F == 11.881', near(s['F (naive, WRONG)'], 11.8812, 1e-3), s['F (naive, WRONG)'], 11.8812)
    check('df naive error == 24 (all measurements)', s['df naive error'] === 24, s['df naive error'], 24)
    check('naive p < 0.001 (wrongly significant)', s['p (naive, WRONG)'] < 0.001, s['p (naive, WRONG)'], '<0.001')
    check('AC: honest p DIFFERS from naive p and crosses .05', s['p (nested)'] > 0.05 && s['p (naive, WRONG)'] < 0.05, `nested ${s['p (nested)']} vs naive ${s['p (naive, WRONG)']}`, 'nested>.05, naive<.05')
    // per-group table shows n = subjects (3), not measurements (9)
    const g1 = (r.tables?.[0]?.rows ?? []).find((row) => row[0] === 'G1')
    check('per-group table: G1 has 3 subjects, 9 measurements', g1?.[1] === 3 && g1?.[2] === 9, `${g1?.[1]}/${g1?.[2]}`, '3/9')
    check('nested-scatter figure produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }

  // ── Nested t-test — same wall, two groups ────────────────────────────────
  // G1 subjects [10,20,30], G2 subjects [20,30,40] (reps subj-mean +/- 1).
  // CORRECT: unpaired t on the 6 subject means -> df = 4. NAIVE: t on all 18
  // measurements -> df = 16 and a smaller p. Honest n = 3 subjects/group.
  console.log('\n[nested-t]  2x3x3 balanced  (nested df=4 from subjects; naive df=16 from measurements)')
  {
    const treatment = [...Array(9).fill('A'), ...Array(9).fill('B')]
    const subject = []
    for (let g = 0; g < 2; g++) for (const s of ['S1', 'S2', 'S3']) subject.push(s, s, s)
    const value = [9, 10, 11, 19, 20, 21, 29, 30, 31, 19, 20, 21, 29, 30, 31, 39, 40, 41]
    const ds = dataset([
      { id: 'trt', name: 'Treatment', type: 'text', role: 'group', values: treatment },
      { id: 'subj', name: 'Subject', type: 'text', role: 'label', values: subject },
      { id: 'val', name: 'Value', role: 'y', values: value },
    ])
    const r = await analyze(py, 'nested-t', ds, ['val'])
    const s = r.stats
    console.log(`  nested t=${s['t (nested)']} df=${s.df} p=${s['p (nested)']}  |  naive t=${s['t (naive, WRONG)']} df=${s['df naive']} p=${s['p (naive, WRONG)']}`)
    check('no error', !r.error, r.error, undefined)
    check('nested df == 4 (6 subjects - 2)', s.df === 4, s.df, 4)
    check('subjects (real n) == 6', s['subjects (real n)'] === 6, s['subjects (real n)'], 6)
    check('naive df == 16 (18 measurements - 2)', s['df naive'] === 16, s['df naive'], 16)
    check('measurements == 18', s['measurements'] === 18, s['measurements'], 18)
    check('nested p > naive p (honest is less significant)', s['p (nested)'] > s['p (naive, WRONG)'], `${s['p (nested)']} vs ${s['p (naive, WRONG)']}`, 'nested>naive')
    check('mean A == 20', near(s['mean A'], 20, 1e-9), s['mean A'], 20)
    check('mean B == 30', near(s['mean B'], 30, 1e-9), s['mean B'], 30)
  }

  // ── Chi-square (2x2, Yates) ──────────────────────────────────────────────
  // Table [[20,80],[10,90]] (exposed/unexposed x event/no-event). Expected all
  // 15/85 (>= 5). Yates chi^2 = 200*(|ad-bc|-N/2)^2 / (100*100*30*170)
  //   = 200*(1000-100)^2/51e6 = 200*810000/51e6 = 3.1765, df=1, p=0.0747.
  // Cramer's V = sqrt(3.1765/200) = 0.1260. Hand-derived.
  console.log('\n[chi-square]  [[20,80],[10,90]] Yates  (hand: chi^2=3.176, df=1, p=0.0747, V=0.126)')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['Exposed', 'Unexposed'] },
      { id: 'ev', name: 'Event', role: 'y', values: [20, 10] },
      { id: 'no', name: 'No event', role: 'y', values: [80, 90] },
    ])
    const r = await analyze(py, 'chi-square', ds, ['ev', 'no'])
    const s = r.stats
    console.log(`  chi^2=${s['chi-square']}  df=${s.df}  p=${s.p}  V=${s["Cramer's V"]}  Yates=${s['Yates correction']}`)
    check('chi^2 == 3.1765 (Yates)', near(s['chi-square'], 3.17647, 1e-3), s['chi-square'], 3.17647)
    check('df == 1', s.df === 1, s.df, 1)
    check('p == 0.0747', near(s.p, 0.074659, 1e-3), s.p, 0.074659)
    check("Cramer's V == 0.1260", near(s["Cramer's V"], 0.126025, 1e-3), s["Cramer's V"], 0.126025)
    check('Yates applied for 2x2', s['Yates correction'] === 'yes (2x2)', s['Yates correction'], 'yes (2x2)')
    check('expected counts table present', (r.tables?.[0]?.rows ?? []).length === 2, r.tables?.[0]?.rows?.length, 2)
    check('stacked-proportion figure produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }

  // ── Chi-square: expected < 5 flags Fisher (teaching moment) ──────────────
  console.log('\n[chi-square]  small counts flag the expected<5 assumption (suggest Fisher)')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['A', 'B'] },
      { id: 'x', name: 'X', role: 'y', values: [1, 3] },
      { id: 'y', name: 'Y', role: 'y', values: [4, 2] },
    ])
    const r = await analyze(py, 'chi-square', ds, ['x', 'y'])
    const assumption = (r.assumptions ?? [])[0]
    console.log(`  assumption passed=${assumption?.passed}  detail="${assumption?.detail}"`)
    check('expected<5 assumption FAILS', assumption?.passed === false, assumption?.passed, false)
    check('detail suggests Fisher', /Fisher/.test(assumption?.detail ?? ''), assumption?.detail, 'mentions Fisher')
  }

  // ── Chi-square: a non-numeric selected count cell must refuse, not coerce ─
  // A typo in a count cell ('oops') must NOT silently become 0 -- that would
  // fabricate a real zero count and corrupt the test.
  console.log('\n[chi-square]  non-numeric count cell ("oops")  (must refuse, not coerce to 0)')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['G1', 'G2'] },
      { id: 'ev', name: 'Event', role: 'y', values: [20, 'oops'] },
      { id: 'no', name: 'No event', role: 'y', values: [80, 90] },
    ])
    const r = await analyze(py, 'chi-square', ds, ['ev', 'no'])
    console.log(`  error=${JSON.stringify(r.error)}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check("names the offending cell 'oops'", /oops/.test(r.error ?? ''), r.error, "mentions 'oops'")
    check('mentions the column', /Event/.test(r.error ?? ''), r.error, 'mentions Event')
    check('no chi-square fabricated', r.stats?.['chi-square'] === undefined, r.stats?.['chi-square'], 'undefined')
  }

  // ── Fisher's exact (PUBLISHED example) ───────────────────────────────────
  // Source: Wikipedia "Fisher's exact test" worked example (men/women dieting),
  // table [[1,9],[11,3]]. Wikipedia's 0.001346 is the ONE-tailed p; the
  // TWO-sided p (scipy's and R's fisher.test method — sum every table no more
  // probable than the observed one) is 0.0027594. Sample OR = (1*3)/(9*11) = 0.0303.
  console.log("\n[fisher-exact]  [[1,9],[11,3]]  (two-sided p=0.0027595, OR=0.0303; Wikipedia's 0.001346 is one-tailed)")
  {
    const ds = dataset([
      { id: 'cat', name: 'Diet', type: 'text', role: 'label', values: ['Dieting', 'Not dieting'] },
      { id: 'men', name: 'Men', role: 'y', values: [1, 11] },
      { id: 'women', name: 'Women', role: 'y', values: [9, 3] },
    ])
    const r = await analyze(py, 'fisher-exact', ds, ['men', 'women'])
    const s = r.stats
    console.log(`  OR=${s['odds ratio (sample)']}  p=${s['p (two-sided)']}`)
    check('two-sided p == 0.0027595', near(s['p (two-sided)'], 0.00275946, 1e-6), s['p (two-sided)'], 0.00275946)
    check('sample OR == 0.0303', near(s['odds ratio (sample)'], 0.030303, 1e-4), s['odds ratio (sample)'], 0.030303)
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }

  // ── Fisher / RR / OR require a 2x2 (graceful refusal otherwise) ───────────
  console.log('\n[fisher-exact]  three columns is not 2x2  (must refuse gracefully)')
  {
    const ds = dataset([
      { id: 'cat', name: 'G', type: 'text', role: 'label', values: ['A', 'B'] },
      { id: 'x', name: 'X', role: 'y', values: [1, 2] },
      { id: 'y', name: 'Y', role: 'y', values: [3, 4] },
      { id: 'z', name: 'Z', role: 'y', values: [5, 6] },
    ])
    const r = await analyze(py, 'fisher-exact', ds, ['x', 'y', 'z'])
    check('graceful 2x2 refusal', typeof r.error === 'string' && /2x2/.test(r.error), r.error, 'mentions 2x2')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
  }

  // ── Relative risk + odds ratio (hand-derived CIs, Woolf) ─────────────────
  // Table [[20,80],[10,90]], row 0 = exposed, col 0 = event.
  //   RR = (20/100)/(10/100) = 2.0; SE ln(RR) = sqrt(80/2000+90/1000) = 0.36056
  //     -> 95% CI [2*exp(-1.96*.36056), 2*exp(1.96*.36056)] = [0.9866, 4.0546]
  //   OR = (20*90)/(80*10) = 2.25; SE ln(OR) = sqrt(1/20+1/80+1/10+1/90) = 0.41667
  //     -> 95% CI [0.9943, 5.091]
  // (Woolf 1955; Altman, Practical Statistics for Medical Research.)
  console.log('\n[relative-risk]  [[20,80],[10,90]]  (hand: RR=2.0, CI [0.987, 4.055])')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['Exposed', 'Unexposed'] },
      { id: 'ev', name: 'Event', role: 'y', values: [20, 10] },
      { id: 'no', name: 'No event', role: 'y', values: [80, 90] },
    ])
    const r = await analyze(py, 'relative-risk', ds, ['ev', 'no'])
    const s = r.stats
    console.log(`  RR=${s['relative risk']}  CI=[${s['95% CI low']}, ${s['95% CI high']}]`)
    check('RR == 2.0', near(s['relative risk'], 2.0, 1e-9), s['relative risk'], 2.0)
    check('RR CI low == 0.9866', near(s['95% CI low'], 0.98657, 1e-3), s['95% CI low'], 0.98657)
    check('RR CI high == 4.0546', near(s['95% CI high'], 4.05452, 1e-3), s['95% CI high'], 4.05452)
    check('event counted is column 0', s['event counted'] === 'Event', s['event counted'], 'Event')
  }
  // ── Relative risk with a zero cell (b=0): Haldane-Anscombe continuity fix ─
  // [[10,0],[5,5]]: a=10,b=0,c=5,d=5. The old Woolf SE zeroes the b/(a*n1)
  // term (sqrt(0.1)=0.31623), giving RR=2.0, CI=[1.07610, 3.71714] -- too
  // narrow, no caveat. statsmodels' Table2x2(shift_zeros=True) -- the
  // standard fix, 0.5 added only to the zero cell -- gives RR=1.904762,
  // CI=[1.010027, 3.592102]: still finite, and its bounds ratio (how wide the
  // interval is on the ratio scale that RR lives on) is WIDER than the
  // zeroed-SE version's (3.5565 vs 3.4544), reflecting the extra uncertainty
  // a zero cell carries. A caveat about the correction must be surfaced.
  console.log('\n[relative-risk]  [[10,0],[5,5]] b=0  (Haldane-Anscombe: RR=1.90476, CI [1.01003, 3.59210])')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['Exposed', 'Unexposed'] },
      { id: 'ev', name: 'Event', role: 'y', values: [10, 5] },
      { id: 'no', name: 'No event', role: 'y', values: [0, 5] },
    ])
    const r = await analyze(py, 'relative-risk', ds, ['ev', 'no'])
    const s = r.stats
    console.log(`  RR=${s['relative risk']}  CI=[${s['95% CI low']}, ${s['95% CI high']}]  assumptions=${JSON.stringify(r.assumptions?.map((x) => x.label))}`)
    check('no error', !r.error, r.error, undefined)
    check('RR is finite (not NaN/undefined)', typeof s['relative risk'] === 'number' && Number.isFinite(s['relative risk']), s['relative risk'], 'a finite number')
    check('RR == 1.90476 (corrected, not naive 2.0)', near(s['relative risk'], 1.904762, 1e-4), s['relative risk'], 1.904762)
    check('CI low == 1.01003', near(s['95% CI low'], 1.010027, 1e-3), s['95% CI low'], 1.010027)
    check('CI high == 3.59210', near(s['95% CI high'], 3.592102, 1e-3), s['95% CI high'], 3.592102)
    const naiveRatio = 3.717136455945501 / 1.0760971644186115
    const correctedRatio = s['95% CI high'] / s['95% CI low']
    check('corrected CI is WIDER (ratio scale) than the old zeroed-SE CI', correctedRatio > naiveRatio, correctedRatio, `> ${naiveRatio}`)
    const caveat = (r.assumptions ?? []).find((a) => /correction/i.test(a.label ?? '') || /correction/i.test(a.detail ?? ''))
    check('a continuity-correction caveat is present', !!caveat, caveat, 'an assumption entry mentioning the correction')
  }

  console.log('\n[odds-ratio]  [[20,80],[10,90]]  (hand: OR=2.25, CI [0.994, 5.091])')
  {
    const ds = dataset([
      { id: 'cat', name: 'Group', type: 'text', role: 'label', values: ['Exposed', 'Unexposed'] },
      { id: 'ev', name: 'Event', role: 'y', values: [20, 10] },
      { id: 'no', name: 'No event', role: 'y', values: [80, 90] },
    ])
    const r = await analyze(py, 'odds-ratio', ds, ['ev', 'no'])
    const s = r.stats
    console.log(`  OR=${s['odds ratio']}  CI=[${s['95% CI low']}, ${s['95% CI high']}]`)
    check('OR == 2.25', near(s['odds ratio'], 2.25, 1e-9), s['odds ratio'], 2.25)
    check('OR CI low == 0.9943', near(s['95% CI low'], 0.99427, 1e-3), s['95% CI low'], 0.99427)
    check('OR CI high == 5.091', near(s['95% CI high'], 5.09104, 1e-3), s['95% CI high'], 5.09104)
  }

  // ══ PHASE D2c ═════════════════════════════════════════════════════════════

  /** Build an XY dataset: first column is X (role 'x'), the rest are Y (role 'y'). */
  function xyDataset(xVals, yDefs) {
    return dataset([{ id: 'x', name: 'X', role: 'x', values: xVals }, ...yDefs])
  }

  // ── Correlation (Pearson + Spearman + Fisher-z CI) ───────────────────────
  // Hand-derived: X=[1..5], Y=[2,4,5,4,5]. meanX=3, meanY=4.
  //   Sxy = sum(dx*dy) = 6, Sxx = 10, Syy = 6  ->  r = 6/sqrt(60) = 0.7745967,
  //   r^2 = 36/60 = 0.6 exactly. t = r*sqrt(3)/sqrt(0.4) = 2.121320 (df=3),
  //   two-sided p ~ 0.124.
  console.log('\n[correlation]  X=[1..5] Y=[2,4,5,4,5]  (hand: Pearson r=0.7745967, r^2=0.6)')
  {
    const ds = xyDataset([1, 2, 3, 4, 5], [{ id: 'y', name: 'Y', values: [2, 4, 5, 4, 5] }])
    const r = await analyze(py, 'correlation', ds, ['y'])
    const s = r.stats
    console.log(`  Pearson r=${s['Pearson r']} p=${s['Pearson p']} r^2=${s['r squared']} CI=[${s['95% CI low']}, ${s['95% CI high']}]  Spearman r=${s['Spearman r']}`)
    check('no error', !r.error, r.error, undefined)
    check('Pearson r == 0.7745967', near(s['Pearson r'], 0.7745967, 1e-6), s['Pearson r'], 0.7745967)
    check('r squared == 0.6', near(s['r squared'], 0.6, 1e-9), s['r squared'], 0.6)
    check('Pearson p in (0.10, 0.15)', s['Pearson p'] > 0.1 && s['Pearson p'] < 0.15, s['Pearson p'], '~0.124')
    check('Fisher CI low < r < CI high', s['95% CI low'] < s['Pearson r'] && s['Pearson r'] < s['95% CI high'], `${s['95% CI low']}..${s['95% CI high']}`, 'brackets r')
    check('CI low is finite negative here', typeof s['95% CI low'] === 'number' && s['95% CI low'] < 0, s['95% CI low'], '<0')
    check('a scatter figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }

  // Spearman = 1 on a monotonic-but-NONLINEAR pair (y = x^2). Pearson < 1.
  console.log('\n[correlation]  Y=x^2 monotonic  (Spearman r_s=1 exactly; Pearson < 1)')
  {
    const ds = xyDataset([1, 2, 3, 4, 5], [{ id: 'y', name: 'Y', values: [1, 4, 9, 16, 25] }])
    const r = await analyze(py, 'correlation', ds, ['y'])
    const s = r.stats
    console.log(`  Pearson r=${s['Pearson r']}  Spearman r=${s['Spearman r']}`)
    check('Spearman r == 1 (perfectly monotonic)', near(s['Spearman r'], 1.0, 1e-9), s['Spearman r'], 1.0)
    check('Pearson r < 1 (relationship is curved)', s['Pearson r'] < 1.0, s['Pearson r'], '<1')
  }

  // Degenerate: fewer than 3 points, and a constant Y — graceful, no fake r.
  console.log('\n[correlation]  degenerate: 2 points, and a constant Y  (graceful, no fabricated r)')
  {
    const dsFew = xyDataset([1, 2], [{ id: 'y', name: 'Y', values: [3, 4] }])
    const rFew = await analyze(py, 'correlation', dsFew, ['y'])
    check('<3 points refused gracefully', typeof rFew.error === 'string' && rFew.error.length > 0, rFew.error, 'a message')
    check('no r fabricated (too few)', rFew.stats?.['Pearson r'] === undefined, rFew.stats?.['Pearson r'], 'undefined')
    const dsConst = xyDataset([1, 2, 3, 4], [{ id: 'y', name: 'Y', values: [5, 5, 5, 5] }])
    const rConst = await analyze(py, 'correlation', dsConst, ['y'])
    check('constant column refused gracefully', typeof rConst.error === 'string' && rConst.error.length > 0, rConst.error, 'a message')
    check('no traceback', !rConst.error?.includes('Traceback'), rConst.error, 'no Traceback')
    check('no r fabricated (constant)', rConst.stats?.['Pearson r'] === undefined, rConst.stats?.['Pearson r'], 'undefined')
  }

  // Fisher CI at the minimum n=3: r and p must still be honest, but a
  // zero-width "CI" (se=1/sqrt(n-3)=1/sqrt(0) collapsing to 0) is fabricated
  // certainty -- the CI must come back null instead.
  console.log('\n[correlation]  n=3 X=[1,2,3] Y=[1,2,2.9]  (r/p present, CI must be null -- not zero-width)')
  {
    const ds = xyDataset([1, 2, 3], [{ id: 'y', name: 'Y', values: [1, 2, 2.9] }])
    const r = await analyze(py, 'correlation', ds, ['y'])
    const s = r.stats
    console.log(`  Pearson r=${s['Pearson r']} p=${s['Pearson p']} CI=[${s['95% CI low']}, ${s['95% CI high']}]`)
    check('no error', !r.error, r.error, undefined)
    check('Pearson r == 0.99954', near(s['Pearson r'], 0.99954, 1e-4), s['Pearson r'], 0.99954)
    check('Pearson p is present (a number)', typeof s['Pearson p'] === 'number', s['Pearson p'], 'a number')
    check('95% CI low is null (not a fabricated zero-width bound)', s['95% CI low'] === null, s['95% CI low'], null)
    check('95% CI high is null (not a fabricated zero-width bound)', s['95% CI high'] === null, s['95% CI high'], null)
  }
  // n=4 is the smallest n where the Fisher-z CI IS defined -- must stay finite.
  console.log('\n[correlation]  n=4  (CI must still be finite and bracket r)')
  {
    const ds = xyDataset([1, 2, 3, 4], [{ id: 'y', name: 'Y', values: [2, 4, 5, 4] }])
    const r = await analyze(py, 'correlation', ds, ['y'])
    const s = r.stats
    console.log(`  Pearson r=${s['Pearson r']}  CI=[${s['95% CI low']}, ${s['95% CI high']}]`)
    check('no error', !r.error, r.error, undefined)
    check('CI low is a finite number', typeof s['95% CI low'] === 'number' && Number.isFinite(s['95% CI low']), s['95% CI low'], 'finite number')
    check('CI high is a finite number', typeof s['95% CI high'] === 'number' && Number.isFinite(s['95% CI high']), s['95% CI high'], 'finite number')
    check('CI low < r < CI high (nonzero width)', s['95% CI low'] < s['Pearson r'] && s['Pearson r'] < s['95% CI high'], `${s['95% CI low']}..${s['95% CI high']}`, 'brackets r, nonzero width')
  }

  // ── Linear regression (OLS) ──────────────────────────────────────────────
  // Hand-derived: X=[1..5], Y=[2,4,5,4,5]. slope = Sxy/Sxx = 6/10 = 0.6,
  //   intercept = 4 - 0.6*3 = 2.2, R^2 = 0.6, adjR^2 = 1-(0.4)(4/3) = 0.4666667.
  //   SSresid = 2.4 (df 3) -> MSE = 0.8, Sy.x = sqrt(0.8) = 0.8944272,
  //   SE(slope) = sqrt(0.8/10) = 0.2828427, t.975(3) = 3.182446 ->
  //   slope 95% CI = 0.6 +/- 0.9000 = [-0.3, 1.5].
  console.log('\n[linear-regression]  X=[1..5] Y=[2,4,5,4,5]  (hand: slope=0.6, intercept=2.2, R^2=0.6)')
  {
    const ds = xyDataset([1, 2, 3, 4, 5], [{ id: 'y', name: 'Y', values: [2, 4, 5, 4, 5] }])
    const r = await analyze(py, 'linear-regression', ds, ['y'])
    const s = r.stats
    console.log(`  slope=${s.slope} intercept=${s.intercept} R^2=${s['R squared']} adjR^2=${s['adjusted R squared']} SEslope=${s['slope SE']} CI=[${s['slope 95% CI low']}, ${s['slope 95% CI high']}] Sy.x=${s['Sy.x (RMSE)']}`)
    check('no error', !r.error, r.error, undefined)
    check('slope == 0.6', near(s.slope, 0.6, 1e-9), s.slope, 0.6)
    check('intercept == 2.2', near(s.intercept, 2.2, 1e-9), s.intercept, 2.2)
    check('R^2 == 0.6', near(s['R squared'], 0.6, 1e-9), s['R squared'], 0.6)
    check('adjusted R^2 == 0.4666667', near(s['adjusted R squared'], 0.4666667, 1e-6), s['adjusted R squared'], 0.4666667)
    check('slope SE == 0.2828427', near(s['slope SE'], 0.2828427, 1e-6), s['slope SE'], 0.2828427)
    check('slope 95% CI low == -0.3', near(s['slope 95% CI low'], -0.3, 1e-2), s['slope 95% CI low'], -0.3)
    check('slope 95% CI high == 1.5', near(s['slope 95% CI high'], 1.5, 1e-2), s['slope 95% CI high'], 1.5)
    check('Sy.x (RMSE) == 0.8944272', near(s['Sy.x (RMSE)'], 0.8944272, 1e-6), s['Sy.x (RMSE)'], 0.8944272)
    check('df == 3', s.df === 3, s.df, 3)
    check('fit + residual figures produced', r.figures?.length === 2 && r.figures.every((f) => f.startsWith('<svg')), r.figures?.length, 2)
  }

  // Exact line -> R^2 = 1 (sanity: slope/intercept exact, no residual scatter).
  console.log('\n[linear-regression]  Y=2X+1 exact  (slope=2, intercept=1, R^2=1)')
  {
    const ds = xyDataset([1, 2, 3, 4, 5], [{ id: 'y', name: 'Y', values: [3, 5, 7, 9, 11] }])
    const r = await analyze(py, 'linear-regression', ds, ['y'])
    const s = r.stats
    check('slope == 2', near(s.slope, 2, 1e-9), s.slope, 2)
    check('intercept == 1', near(s.intercept, 1, 1e-9), s.intercept, 1)
    check('R^2 == 1', near(s['R squared'], 1, 1e-9), s['R squared'], 1)
  }

  // ── Area under curve (trapezoidal) ───────────────────────────────────────
  // y = x over [0,4] -> triangle area = 8 (base 0 = min y, so above-baseline = 8).
  console.log('\n[area-under-curve]  Y=X over [0,4]  (trapezoid area = 8)')
  {
    const ds = xyDataset([0, 1, 2, 3, 4], [{ id: 'y', name: 'Y', values: [0, 1, 2, 3, 4] }])
    const r = await analyze(py, 'area-under-curve', ds, ['y'])
    const s = r.stats
    console.log(`  AUC total=${s['AUC (total)']}  above baseline=${s['AUC above baseline']}  baseline=${s['baseline (min y)']}`)
    check('no error', !r.error, r.error, undefined)
    check('AUC (total) == 8', near(s['AUC (total)'], 8, 1e-9), s['AUC (total)'], 8)
    check('baseline (min y) == 0', near(s['baseline (min y)'], 0, 1e-9), s['baseline (min y)'], 0)
    check('AUC above baseline == 8', near(s['AUC above baseline'], 8, 1e-9), s['AUC above baseline'], 8)
    check('a shaded-area figure produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }
  // Baseline matters: Y=[2,3,4,3,2] over [0,4] -> total = 12, min y = 2,
  //   above-baseline area of [0,1,2,1,0] = 4.
  console.log('\n[area-under-curve]  Y=[2,3,4,3,2] over [0,4]  (total=12, above baseline=4)')
  {
    const ds = xyDataset([0, 1, 2, 3, 4], [{ id: 'y', name: 'Y', values: [2, 3, 4, 3, 2] }])
    const r = await analyze(py, 'area-under-curve', ds, ['y'])
    const s = r.stats
    check('AUC (total) == 12', near(s['AUC (total)'], 12, 1e-9), s['AUC (total)'], 12)
    check('AUC above baseline == 4', near(s['AUC above baseline'], 4, 1e-9), s['AUC above baseline'], 4)
  }
  // Degenerate: a single point cannot be integrated.
  console.log('\n[area-under-curve]  one point  (graceful refusal)')
  {
    const ds = xyDataset([1], [{ id: 'y', name: 'Y', values: [5] }])
    const r = await analyze(py, 'area-under-curve', ds, ['y'])
    check('one point refused gracefully', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message')
    check('no AUC fabricated', r.stats?.['AUC (total)'] === undefined, r.stats?.['AUC (total)'], 'undefined')
  }

  // ── Smoothing (moving average, display transform) ────────────────────────
  // Y=[1,2,3,4,5], window 3 -> valid convolution = [2,3,4] at window-mean X.
  console.log('\n[smoothing]  Y=[1..5] window 3  (moving average = [2,3,4])')
  {
    const ds = xyDataset([1, 2, 3, 4, 5], [{ id: 'y', name: 'Y', values: [1, 2, 3, 4, 5] }])
    const r = await analyze(py, 'smoothing', ds, ['y'], { smoother: 'moving-average', window: 3 })
    const rows = r.tables?.[0]?.rows ?? []
    const sy = rows.map((row) => row[1])
    console.log(`  smoothed=${JSON.stringify(sy)}`)
    check('no error', !r.error, r.error, undefined)
    check('3 smoothed points', sy.length === 3, sy.length, 3)
    check('moving average == [2,3,4]', near(sy[0], 2, 1e-9) && near(sy[1], 3, 1e-9) && near(sy[2], 4, 1e-9), JSON.stringify(sy), '[2,3,4]')
    check('a figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }
  // LOWESS path renders a valid figure (a smoother, not a hand-checkable number).
  console.log('\n[smoothing]  LOWESS path renders')
  {
    const ds = xyDataset([1, 2, 3, 4, 5, 6, 7, 8], [{ id: 'y', name: 'Y', values: [1, 3, 2, 5, 4, 7, 6, 9] }])
    const r = await analyze(py, 'smoothing', ds, ['y'], { smoother: 'lowess' })
    check('LOWESS figure is SVG', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
    check('LOWESS no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
  }

  // ── Fraction of total ────────────────────────────────────────────────────
  // Values [1,3,6] sum to 10 -> 10% / 30% / 60%, cumulative 10 / 40 / 100.
  console.log('\n[fraction-of-total]  [1,3,6]  (10% / 30% / 60%, cumulative 10 / 40 / 100)')
  {
    const ds = dataset([
      { id: 'lab', name: 'Part', type: 'text', role: 'label', values: ['A', 'B', 'C'] },
      { id: 'v', name: 'Amount', role: 'y', values: [1, 3, 6] },
    ])
    const r = await analyze(py, 'fraction-of-total', ds, ['v'], { graph: 'pie' })
    const rows = r.tables?.[0]?.rows ?? [] // [label, value, percent, cumulative%]
    console.log(`  percents=${rows.map((row) => row[2]).join(', ')}  cumulative=${rows.map((row) => row[3]).join(', ')}`)
    check('no error', !r.error, r.error, undefined)
    check('total == 10', near(r.stats?.total, 10, 1e-9), r.stats?.total, 10)
    check('percent A == 10', near(rows[0]?.[2], 10, 1e-9), rows[0]?.[2], 10)
    check('percent B == 30', near(rows[1]?.[2], 30, 1e-9), rows[1]?.[2], 30)
    check('percent C == 60', near(rows[2]?.[2], 60, 1e-9), rows[2]?.[2], 60)
    check('cumulative C == 100', near(rows[2]?.[3], 100, 1e-9), rows[2]?.[3], 100)
    check('a pie figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }
  // Donut + stacked variants still render; a negative part is refused.
  console.log('\n[fraction-of-total]  donut/stacked render; negative part refused')
  {
    const ds = dataset([
      { id: 'lab', name: 'Part', type: 'text', role: 'label', values: ['A', 'B', 'C'] },
      { id: 'v', name: 'Amount', role: 'y', values: [1, 3, 6] },
    ])
    for (const graph of ['donut', 'stacked']) {
      const r = await analyze(py, 'fraction-of-total', ds, ['v'], { graph })
      check(`graph=${graph} figure is SVG`, typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
    }
    const dsNeg = dataset([
      { id: 'lab', name: 'Part', type: 'text', role: 'label', values: ['A', 'B'] },
      { id: 'v', name: 'Amount', role: 'y', values: [5, -2] },
    ])
    const rNeg = await analyze(py, 'fraction-of-total', dsNeg, ['v'])
    check('negative part refused gracefully', typeof rNeg.error === 'string' && /negative/.test(rNeg.error), rNeg.error, 'mentions negative')
  }

  // ── Correlation matrix ───────────────────────────────────────────────────
  // V1=[1..5], V2=[2,4,5,4,5], V3=V1. Known off-diagonals: r(V1,V2)=0.7745967,
  //   r(V1,V3)=1, r(V2,V3)=0.7745967.  rrows[i] = [name, r_i0, r_i1, r_i2].
  console.log('\n[correlation-matrix]  V1,V2,V3=V1  (r(V1,V2)=0.7745967, r(V1,V3)=1)')
  {
    const ds = dataset([
      { id: 'v1', name: 'V1', role: 'y', values: [1, 2, 3, 4, 5] },
      { id: 'v2', name: 'V2', role: 'y', values: [2, 4, 5, 4, 5] },
      { id: 'v3', name: 'V3', role: 'y', values: [1, 2, 3, 4, 5] },
    ])
    const r = await analyze(py, 'correlation-matrix', ds, ['v1', 'v2', 'v3'])
    const rr = r.tables?.[0]?.rows ?? []
    console.log(`  r(V1,V2)=${rr[0]?.[2]}  r(V1,V3)=${rr[0]?.[3]}  r(V2,V3)=${rr[1]?.[3]}`)
    check('no error', !r.error, r.error, undefined)
    check('diagonal r(V1,V1) == 1', near(rr[0]?.[1], 1, 1e-9), rr[0]?.[1], 1)
    check('r(V1,V2) == 0.7745967', near(rr[0]?.[2], 0.7745967, 1e-6), rr[0]?.[2], 0.7745967)
    check('r(V1,V3) == 1', near(rr[0]?.[3], 1, 1e-9), rr[0]?.[3], 1)
    check('symmetric: r(V2,V1) == r(V1,V2)', near(rr[1]?.[1], rr[0]?.[2], 1e-9), rr[1]?.[1], rr[0]?.[2])
    check('a heatmap figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }
  // Degenerate: a constant variable yields a BLANK cell, never a fabricated r.
  console.log('\n[correlation-matrix]  a constant column -> blank cell (not a fake r)')
  {
    const ds = dataset([
      { id: 'v1', name: 'V1', role: 'y', values: [1, 2, 3, 4, 5] },
      { id: 'v2', name: 'V2', role: 'y', values: [2, 4, 5, 4, 5] },
      { id: 'v3', name: 'V3', role: 'y', values: [5, 5, 5, 5, 5] },
    ])
    const r = await analyze(py, 'correlation-matrix', ds, ['v1', 'v2', 'v3'])
    const rr = r.tables?.[0]?.rows ?? []
    check('no error', !r.error, r.error, undefined)
    check('r(V1,V3) is blank (null) for a constant column', rr[0]?.[3] === null, rr[0]?.[3], null)
    check('r(V1,V2) still computed', near(rr[0]?.[2], 0.7745967, 1e-6), rr[0]?.[2], 0.7745967)
  }

  // ── Multiple regression (2 predictors) ───────────────────────────────────
  // y = 1 + 2*x1 + 3*x2 exactly -> intercept=1, b(x1)=2, b(x2)=3, R^2=1.
  console.log('\n[multiple-regression]  y=1+2*x1+3*x2  (coeffs 1 / 2 / 3, R^2=1)')
  {
    const ds = dataset([
      { id: 'y', name: 'Y', role: 'y', values: [9, 8, 19, 18, 29] },
      { id: 'x1', name: 'X1', role: 'y', values: [1, 2, 3, 4, 5] },
      { id: 'x2', name: 'X2', role: 'y', values: [2, 1, 4, 3, 6] },
    ])
    const r = await analyze(py, 'multiple-regression', ds, ['y', 'x1', 'x2'], { dependentColumnId: 'y' })
    const rows = r.tables?.[0]?.rows ?? [] // [term, coef, se, t, p]
    const coef = Object.fromEntries(rows.map((row) => [row[0], row[1]]))
    console.log(`  intercept=${coef['(intercept)']}  X1=${coef['X1']}  X2=${coef['X2']}  R^2=${r.stats?.['R squared']}`)
    check('no error', !r.error, r.error, undefined)
    check('intercept == 1', near(coef['(intercept)'], 1, 1e-6), coef['(intercept)'], 1)
    check('coef X1 == 2', near(coef['X1'], 2, 1e-6), coef['X1'], 2)
    check('coef X2 == 3', near(coef['X2'], 3, 1e-6), coef['X2'], 3)
    check('R^2 == 1', near(r.stats?.['R squared'], 1, 1e-9), r.stats?.['R squared'], 1)
    check('dependent is Y', r.stats?.dependent === 'Y', r.stats?.dependent, 'Y')
    check('2 predictors', r.stats?.predictors === 2, r.stats?.predictors, 2)
    check('observed-vs-predicted figure produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
  }
  // Degenerate: perfectly collinear predictors (x2 = 2*x1) -> VIF flags it.
  console.log('\n[multiple-regression]  collinear predictors (x2=2*x1)  (VIF assumption fails, no crash)')
  {
    const ds = dataset([
      { id: 'y', name: 'Y', role: 'y', values: [1, 2, 3, 4, 5] },
      { id: 'x1', name: 'X1', role: 'y', values: [1, 2, 3, 4, 5] },
      { id: 'x2', name: 'X2', role: 'y', values: [2, 4, 6, 8, 10] },
    ])
    const r = await analyze(py, 'multiple-regression', ds, ['y', 'x1', 'x2'], { dependentColumnId: 'y' })
    console.log(`  multicollinearity=${JSON.stringify(r.stats?.multicollinearity)}`)
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    const vif = (r.assumptions ?? []).find((a) => /VIF|collinear/i.test(a.label ?? ''))
    check('a multicollinearity assumption is present', !!vif, vif, 'a VIF assumption')
    check('multicollinearity assumption FAILS for collinear predictors', vif?.passed === false, vif?.passed, false)
  }
  // Degenerate: a constant predictor (X2 same value every row, e.g. a
  // units/ID/same-dose column). sm.add_constant's default has_constant='skip'
  // sees the existing constant column and adds NO intercept, so coef_names
  // (npred+1 entries) outruns Xc's columns (npred) -- an IndexError traceback
  // in the results sheet. Must refuse gracefully, naming the offending column.
  console.log('\n[multiple-regression]  constant predictor X2=[3,3,3,3,3,3]  (graceful refusal, no traceback)')
  {
    const ds = dataset([
      { id: 'y', name: 'Y', role: 'y', values: [1, 2, 1, 2, 1, 2] },
      { id: 'x1', name: 'X1', role: 'y', values: [1, 2, 1, 2, 1, 2] },
      { id: 'x2', name: 'X2', role: 'y', values: [3, 3, 3, 3, 3, 3] },
    ])
    const r = await analyze(py, 'multiple-regression', ds, ['y', 'x1', 'x2'], { dependentColumnId: 'y' })
    console.log(`  error=${JSON.stringify(r.error)}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('no IndexError', !r.error?.includes('IndexError'), r.error, 'no IndexError')
    check('names the offending predictor X2', /X2/.test(r.error ?? ''), r.error, 'mentions X2')
    check('no coefficients fabricated', !r.tables, r.tables, undefined)
  }
  // Degenerate: dependent not among the selected columns -> graceful refusal.
  console.log('\n[multiple-regression]  dependentColumnId not selected  (graceful refusal)')
  {
    const ds = dataset([
      { id: 'a', name: 'A', role: 'y', values: [1, 2, 3, 4] },
      { id: 'b', name: 'B', role: 'y', values: [2, 3, 4, 5] },
    ])
    const r = await analyze(py, 'multiple-regression', ds, ['a', 'b'], { dependentColumnId: 'gone' })
    check('graceful refusal', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message')
    check('no coefficients fabricated', !r.tables, r.tables, undefined)
  }

  // ══ PHASE E1 ═════════════════════════════════════════════════════════════
  // Nonlinear regression + the equation library + model comparison + standard-
  // curve interpolation. The point of Lab mode is that the numbers are right, so
  // each equation is fit to data GENERATED from it with known parameters and the
  // fit must recover them. The three phase-E acceptance criteria are called out.

  // JS mirrors of the Python models (analysis-templates.mjs `_EQUATIONS`), used
  // ONLY to generate known-answer data here.
  const M = {
    line: (x, [m, b]) => m * x + b,
    'line-origin': (x, [m]) => m * x,
    'exp-decay-1phase': (x, [Y0, P, K]) => (Y0 - P) * Math.exp(-K * x) + P,
    'exp-assoc-1phase': (x, [Y0, P, K]) => Y0 + (P - Y0) * (1 - Math.exp(-K * x)),
    'exp-growth': (x, [Y0, K]) => Y0 * Math.exp(K * x),
    'dr-3param': (x, [B, T, e]) => B + (T - B) / (1 + 10 ** (e - x)),
    'dr-4param': (x, [B, T, e, h]) => B + (T - B) / (1 + 10 ** ((e - x) * h)),
    'michaelis-menten': (x, [Vmax, Km]) => (Vmax * x) / (Km + x),
    'one-site-binding': (x, [Bmax, Kd]) => (Bmax * x) / (Kd + x),
    logistic: (x, [L, k, x0]) => L / (1 + Math.exp(-k * (x - x0))),
    gompertz: (x, [A, B, C]) => A * Math.exp(-B * Math.exp(-C * x)),
    gaussian: (x, [A, c, w]) => A * Math.exp(-((x - c) ** 2) / (2 * w * w)),
    sine: (x, [A, f, p, o]) => A * Math.sin(2 * Math.PI * f * x + p) + o,
    'damped-sine': (x, [A, tau, f, p, o]) =>
      A * Math.exp(-x / tau) * Math.sin(2 * Math.PI * f * x + p) + o,
    power: (x, [a, b]) => a * x ** b,
  }
  const range = (lo, hi, step) => {
    const out = []
    for (let v = lo; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)))
    return out
  }
  /** Generate y = model(x) + deterministic noise (so the smoke is reproducible). */
  const gen = (id, xs, params, noiseAmp = 0) =>
    xs.map((x, i) => M[id](x, params) + (noiseAmp ? noiseAmp * Math.sin(i * 1.7) : 0))
  /** Build an XY dataset + run nonlinear-regression / interpolate for `id`. */
  const nlfit = (analysis, xs, ys, options) =>
    analyze(py, analysis, xyDataset(xs, [{ id: 'y', name: 'Y', values: ys }]), ['y'], options)
  /** name -> best-fit value from the parameter table (tables[0]). */
  const pmap = (r) =>
    Object.fromEntries(
      (r.tables?.[0]?.rows ?? []).map((row) => [String(row[0]).replace(' (fixed)', ''), row[1]]),
    )

  // ── AC-E1 (HEADLINE): 4-parameter dose-response reproduces a known EC50 ────
  // Published-style: Bottom=0, Top=100, logEC50=-6, HillSlope=1, log-doses -9..-3.
  // With realistic scatter the variable-slope Hill fit must recover all four.
  console.log('\n[nonlinear dr-4param]  AC: recover logEC50=-6, Top=100, Bottom=0, Hill=1')
  {
    const xs = range(-9, -3, 0.5)
    const ys = gen('dr-4param', xs, [0, 100, -6, 1], 1.2)
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'dr-4param' })
    const p = pmap(r)
    console.log(
      `  Bottom=${p.Bottom} Top=${p.Top} logEC50=${p.logEC50} Hill=${p.HillSlope} R^2=${r.stats?.['R squared']} converged=${r.stats?.converged}`,
    )
    check('no error', !r.error, r.error, undefined)
    check('converged == yes', r.stats?.converged === 'yes', r.stats?.converged, 'yes')
    check('logEC50 recovered ~ -6', near(p.logEC50, -6, 0.1), p.logEC50, -6)
    check('Top recovered ~ 100', near(p.Top, 100, 3), p.Top, 100)
    check('Bottom recovered ~ 0', near(p.Bottom, 0, 3), p.Bottom, 0)
    check('HillSlope recovered ~ 1', near(p.HillSlope, 1, 0.15), p.HillSlope, 1)
    check('R^2 > 0.99', r.stats?.['R squared'] > 0.99, r.stats?.['R squared'], '>0.99')
    // SE + 95% CI present for the EC50 (row: [name, best, se, lo, hi]).
    const ecRow = (r.tables?.[0]?.rows ?? []).find((row) => row[0] === 'logEC50')
    check('logEC50 SE is finite', typeof ecRow?.[2] === 'number' && Number.isFinite(ecRow[2]), ecRow?.[2], 'finite SE')
    check('logEC50 95% CI brackets the estimate', ecRow?.[3] < ecRow?.[1] && ecRow?.[1] < ecRow?.[4], `${ecRow?.[3]}..${ecRow?.[4]}`, 'brackets')
    check('fit + residual figures produced', r.figures?.length === 2 && r.figures.every((f) => f.startsWith('<svg')), r.figures?.length, 2)
  }

  // ── AC-E2: the F test prefers the SIMPLER model on data generated from it ──
  // Data from the 3-parameter model (HillSlope fixed at 1). Fit the richer
  // 4-parameter Hill and compare to the 3-parameter: freeing HillSlope must NOT
  // significantly improve the fit (p not significant) — the honest-reporting AC.
  console.log('\n[nonlinear F test]  AC: data from 3-param -> F does NOT prefer the 4-param')
  {
    const xs = range(-9, -3, 0.5)
    const ys = gen('dr-3param', xs, [0, 100, -6], 2.0)
    const r = await nlfit('nonlinear-regression', xs, ys, {
      equationId: 'dr-4param',
      compareModel: 'dr-3param',
    })
    const s = r.stats
    console.log(`  F=${s?.['F (extra sum-of-squares)']} p=${s?.['p (F test)']} supports="${s?.['model the data support']}"`)
    check('no error', !r.error, r.error, undefined)
    check('an F statistic was reported', typeof s?.['F (extra sum-of-squares)'] === 'number', s?.['F (extra sum-of-squares)'], 'a number')
    check('F-test p is NOT significant (p > 0.05)', s?.['p (F test)'] > 0.05, s?.['p (F test)'], '>0.05')
    check('the data support the SIMPLER (3-parameter) model', /3-parameter/.test(s?.['model the data support'] ?? ''), s?.['model the data support'], 'the 3-parameter model')
    const cmp = r.tables?.find((t) => /Model comparison/.test(t.title))
    check('a model-comparison table with AICc is present', !!cmp && cmp.rows.length === 2, cmp?.rows?.length, 2)
    check('AICc reported for both models', typeof cmp?.rows?.[0]?.[3] === 'number' && typeof cmp?.rows?.[1]?.[3] === 'number', cmp?.rows?.map((row) => row[3]), 'two AICc numbers')
  }

  // ── FIX 1: a NON-nested compare pair must NOT get an F test ───────────────
  // gaussian (a 3-param peak) vs line (2-param): neither is a special case of
  // the other, so the extra-sum-of-squares F test's nesting assumption is
  // violated. Must report AICc-for-both + a "not nested" note, and NEVER an
  // F/p (this used to fabricate F=2825, p=1.5e-17 on this exact pairing).
  // Center=2 (off the x-domain's midpoint of 3) so the OLS line slope isn't
  // ~0 -- an exactly-zero seed parameter is a known curve_fit finite-diff
  // degeneracy (singular pcov) unrelated to the nesting fix under test.
  console.log('\n[nonlinear F test]  FIX 1: non-nested (gaussian vs line) -> AICc only, no F/p')
  {
    const xs = range(0, 6, 0.5)
    // noiseAmp > 0 so SS_res > 0 for both fits -- AICc needs a nonzero residual.
    const ys = gen('gaussian', xs, [5, 2, 1], 0.3)
    const r = await nlfit('nonlinear-regression', xs, ys, {
      equationId: 'gaussian',
      compareModel: 'line',
    })
    const s = r.stats
    console.log(`  F=${s?.['F (extra sum-of-squares)']} p=${s?.['p (F test)']} note="${s?.['model comparison note']}"`)
    check('no error', !r.error, r.error, undefined)
    check('NO F statistic emitted (not nested)', s?.['F (extra sum-of-squares)'] === undefined, s?.['F (extra sum-of-squares)'], undefined)
    check('NO p emitted (not nested)', s?.['p (F test)'] === undefined, s?.['p (F test)'], undefined)
    check("a 'not nested' note is present", /aren.t nested|not nested/i.test(s?.['model comparison note'] ?? ''), s?.['model comparison note'], 'mentions not nested')
    const cmp = r.tables?.find((t) => /Model comparison/.test(t.title))
    check('table title says AICc only, not nested', /not nested/i.test(cmp?.title ?? ''), cmp?.title, 'mentions not nested')
    check('AICc reported for both models', typeof cmp?.rows?.[0]?.[3] === 'number' && typeof cmp?.rows?.[1]?.[3] === 'number', cmp?.rows?.map((row) => row[3]), 'two AICc numbers')
    check('table has exactly 2 rows', cmp?.rows?.length === 2, cmp?.rows?.length, 2)
  }

  // ── AC-E3: standard-curve interpolation returns a value with a CI ──────────
  // Linear calibration y = 2x + 1 over x=1..10; read off an unknown response
  // Y0=11 -> X ~ 5, and the interpolated X must carry a finite 95% CI.
  console.log('\n[interpolate linear]  AC: read Y0=11 off y=2x+1 -> X~5 with a 95% CI')
  {
    const xs = range(1, 10, 1)
    const ys = gen('line', xs, [2, 1], 0.3)
    const r = await nlfit('interpolate-standard-curve', xs, ys, { equationId: 'line', interpolateY: 11 })
    const s = r.stats
    console.log(`  X=${s?.['interpolated X']}  CI=[${s?.['95% CI low']}, ${s?.['95% CI high']}]  SE=${s?.['SE of X']}`)
    check('no error', !r.error, r.error, undefined)
    check('interpolated X is finite ~ 5', typeof s?.['interpolated X'] === 'number' && near(s['interpolated X'], 5, 0.6), s?.['interpolated X'], 5)
    check('CI low is finite', typeof s?.['95% CI low'] === 'number' && Number.isFinite(s['95% CI low']), s?.['95% CI low'], 'finite')
    check('CI high is finite', typeof s?.['95% CI high'] === 'number' && Number.isFinite(s['95% CI high']), s?.['95% CI high'], 'finite')
    check('CI brackets the interpolated X (nonzero width)', s?.['95% CI low'] < s?.['interpolated X'] && s?.['interpolated X'] < s?.['95% CI high'], `${s?.['95% CI low']}..${s?.['95% CI high']}`, 'brackets X')
    check('a standard-curve figure was produced', typeof r.figures?.[0] === 'string' && r.figures[0].startsWith('<svg'), r.figures?.length, 'svg')
    check('monotonic curve: NO monotonicity caveat (unchanged)', (r.assumptions ?? []).length === 1, r.assumptions?.length, 1)
  }

  // ── FIX 2: non-monotonic curve interpolation carries a multi-root caveat ──
  // A Gaussian peak crosses a given Y twice (once rising, once falling); the
  // first crossing is still returned as the representative X, but the
  // student must be told there is more than one solution.
  console.log('\n[interpolate gaussian]  FIX 2: non-monotonic curve -> multi-solution caveat present')
  {
    const xs = range(0, 6, 0.5)
    const ys = gen('gaussian', xs, [5, 3, 1])
    const r = await nlfit('interpolate-standard-curve', xs, ys, { equationId: 'gaussian', interpolateY: 2 })
    const s = r.stats
    const caveat = (r.assumptions ?? []).find((a) => /monotonic/i.test(a.label ?? ''))
    console.log(`  X=${s?.['interpolated X']}  caveat="${caveat?.detail}"`)
    check('no error', !r.error, r.error, undefined)
    check('interpolated X is still returned', typeof s?.['interpolated X'] === 'number', s?.['interpolated X'], 'a number')
    check('a monotonicity caveat is present', !!caveat, caveat, 'an assumption entry')
    check('caveat is flagged failed (passed=false)', caveat?.passed === false, caveat?.passed, false)
    check('caveat mentions multiple X values', /more than one X/.test(caveat?.detail ?? ''), caveat?.detail, 'mentions multiple X')
  }
  // Standard-curve interpolation off a 4-parameter Hill curve (the ELISA case).
  console.log('\n[interpolate dr-4param]  read Y0=50 off a Hill curve -> X ~ logEC50 = -6 with a CI')
  {
    const xs = range(-9, -3, 0.5)
    const ys = gen('dr-4param', xs, [0, 100, -6, 1], 1.0)
    const r = await nlfit('interpolate-standard-curve', xs, ys, { equationId: 'dr-4param', interpolateY: 50 })
    const s = r.stats
    console.log(`  X=${s?.['interpolated X']}  CI=[${s?.['95% CI low']}, ${s?.['95% CI high']}]`)
    check('no error', !r.error, r.error, undefined)
    check('interpolated X ~ -6 (the logEC50)', near(s?.['interpolated X'], -6, 0.5), s?.['interpolated X'], -6)
    check('CI brackets X', s?.['95% CI low'] < s?.['interpolated X'] && s?.['interpolated X'] < s?.['95% CI high'], `${s?.['95% CI low']}..${s?.['95% CI high']}`, 'brackets X')
  }

  // ── Known-value fits: Michaelis-Menten, one-phase decay, Gaussian, linear ──
  console.log('\n[nonlinear michaelis-menten]  recover Vmax=10, Km=2')
  {
    const xs = [0.5, 1, 2, 3, 4, 6, 8, 12, 16]
    const ys = gen('michaelis-menten', xs, [10, 2])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'michaelis-menten' })
    const p = pmap(r)
    console.log(`  Vmax=${p.Vmax} Km=${p.Km}`)
    check('no error', !r.error, r.error, undefined)
    check('Vmax recovered == 10', near(p.Vmax, 10, 0.05), p.Vmax, 10)
    check('Km recovered == 2', near(p.Km, 2, 0.05), p.Km, 2)
  }
  console.log('\n[nonlinear one-phase decay]  recover K=0.5 (Y0=100, Plateau=20)')
  {
    const xs = range(0, 10, 1)
    const ys = gen('exp-decay-1phase', xs, [100, 20, 0.5])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'exp-decay-1phase' })
    const p = pmap(r)
    console.log(`  Y0=${p.Y0} Plateau=${p.Plateau} K=${p.K}`)
    check('no error', !r.error, r.error, undefined)
    check('rate K recovered == 0.5', near(p.K, 0.5, 0.02), p.K, 0.5)
    check('Y0 recovered == 100', near(p.Y0, 100, 1), p.Y0, 100)
    check('Plateau recovered == 20', near(p.Plateau, 20, 1), p.Plateau, 20)
  }
  console.log('\n[nonlinear gaussian]  recover Center=3, Width=1 (Amp=5)')
  {
    const xs = range(0, 6, 0.5)
    const ys = gen('gaussian', xs, [5, 3, 1])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'gaussian' })
    const p = pmap(r)
    console.log(`  Amp=${p.Amp} Center=${p.Center} Width=${p.Width}`)
    check('no error', !r.error, r.error, undefined)
    check('Center recovered == 3', near(p.Center, 3, 0.05), p.Center, 3)
    check('Width recovered == 1', near(Math.abs(p.Width), 1, 0.05), p.Width, 1)
  }
  console.log('\n[nonlinear line]  recover slope=0.6, intercept=2.2 (matches the OLS smoke)')
  {
    const r = await nlfit('nonlinear-regression', [1, 2, 3, 4, 5], [2, 4, 5, 4, 5], { equationId: 'line' })
    const p = pmap(r)
    check('slope == 0.6', near(p.Slope, 0.6, 1e-3), p.Slope, 0.6)
    check('intercept == 2.2', near(p.Intercept, 2.2, 1e-3), p.Intercept, 2.2)
  }
  console.log('\n[nonlinear power]  recover a=2, b=1.5')
  {
    const xs = [1, 2, 3, 4, 5]
    const ys = gen('power', xs, [2, 1.5])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'power' })
    const p = pmap(r)
    check('a == 2', near(p.a, 2, 1e-3), p.a, 2)
    check('b == 1.5', near(p.b, 1.5, 1e-3), p.b, 1.5)
  }
  console.log('\n[nonlinear logistic]  recover L=100, k=1, x0=5')
  {
    const xs = range(0, 10, 0.5)
    const ys = gen('logistic', xs, [100, 1, 5])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'logistic' })
    const p = pmap(r)
    check('L == 100', near(p.L, 100, 1), p.L, 100)
    check('x0 == 5', near(p.x0, 5, 0.1), p.x0, 5)
    check('k == 1', near(p.k, 1, 0.1), p.k, 1)
  }

  // ── Every remaining equation converges on its own generated data ──────────
  // Proves the data-driven initial-value rules seed each model into its basin.
  console.log('\n[nonlinear library]  each remaining equation recovers its known parameters')
  {
    const cases = [
      { id: 'line-origin', xs: range(1, 5, 1), t: [3], check: { Slope: [3, 1e-3] } },
      { id: 'exp-assoc-1phase', xs: range(0, 10, 1), t: [0, 100, 0.4], check: { Plateau: [100, 2], K: [0.4, 0.05] } },
      { id: 'exp-growth', xs: range(0, 5, 0.5), t: [2, 0.3], check: { Y0: [2, 0.1], K: [0.3, 0.02] } },
      { id: 'dr-3param', xs: range(-9, -3, 0.5), t: [0, 100, -6], check: { Top: [100, 2], logEC50: [-6, 0.05] } },
      { id: 'one-site-binding', xs: [0.5, 1, 2, 4, 8, 16], t: [50, 3], check: { Bmax: [50, 1], Kd: [3, 0.2] } },
      { id: 'gompertz', xs: range(0, 10, 0.5), t: [100, 3, 0.5], check: { A: [100, 3], C: [0.5, 0.1] } },
      { id: 'sine', xs: range(0, 20, 0.5), t: [2, 0.2, 0.5, 5], check: { Freq: [0.2, 0.02], Offset: [5, 0.3] } },
      { id: 'damped-sine', xs: range(0, 20, 0.25), t: [5, 8, 0.3, 0, 0], check: { Freq: [0.3, 0.02] } },
    ]
    for (const c of cases) {
      const ys = gen(c.id, c.xs, c.t)
      const r = await nlfit('nonlinear-regression', c.xs, ys, { equationId: c.id })
      const p = pmap(r)
      check(`${c.id}: no error`, !r.error, r.error, undefined)
      for (const [name, [want, tol]] of Object.entries(c.check)) {
        check(`${c.id}: ${name} ~ ${want}`, near(p[name], want, tol), p[name], want)
      }
    }
  }

  // ── Weighting is applied per point (1/Y^2) and reported ───────────────────
  console.log('\n[nonlinear weighting]  1/Y^2 weighting runs and is reported')
  {
    const xs = [0.5, 1, 2, 3, 4, 6, 8, 12, 16]
    const ys = gen('michaelis-menten', xs, [10, 2])
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'michaelis-menten', weighting: '1/Y2' })
    check('no error', !r.error, r.error, undefined)
    check('weighting reported', r.stats?.weighting === '1/Y2', r.stats?.weighting, '1/Y2')
    check('still recovers Vmax ~ 10', near(pmap(r).Vmax, 10, 0.2), pmap(r).Vmax, 10)
  }

  // ── A fixed parameter is honored ──────────────────────────────────────────
  console.log('\n[nonlinear fix]  fixing HillSlope=1 makes dr-4param behave like the 3-param fit')
  {
    const xs = range(-9, -3, 0.5)
    const ys = gen('dr-3param', xs, [0, 100, -6], 1.0)
    // HillSlope is param index 3 of dr-4param; fix it to 1.
    const r = await nlfit('nonlinear-regression', xs, ys, {
      equationId: 'dr-4param',
      fixValues: [null, null, null, 1],
    })
    const rows = r.tables?.[0]?.rows ?? []
    const hill = rows.find((row) => String(row[0]).startsWith('HillSlope'))
    console.log(`  HillSlope row=${JSON.stringify(hill)}  df=${r.stats?.['degrees of freedom']}`)
    check('no error', !r.error, r.error, undefined)
    check('HillSlope is marked fixed', /fixed/.test(String(hill?.[0])), hill?.[0], 'HillSlope (fixed)')
    check('fixed HillSlope value == 1', near(hill?.[1], 1, 1e-9), hill?.[1], 1)
    check('fixed param has no SE', hill?.[2] === null, hill?.[2], null)
    check('df counts only the 3 free params (n=13 -> df=10)', r.stats?.['degrees of freedom'] === 10, r.stats?.['degrees of freedom'], 10)
  }

  // ── Non-convergence is reported LOUDLY, with no fabricated parameters ──────
  // Flat data has no dose-response shape: Top==Bottom, so logEC50/HillSlope are
  // unidentifiable and the covariance is undefined. Must refuse, not invent.
  console.log('\n[nonlinear non-convergence]  flat data -> graceful "did not converge", no params')
  {
    const xs = range(-9, -3, 0.5)
    const ys = xs.map(() => 50)
    const r = await nlfit('nonlinear-regression', xs, ys, { equationId: 'dr-4param' })
    console.log(`  error=${JSON.stringify((r.error ?? '').slice(0, 90))}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('says it did not converge', /did not converge|identifiable/i.test(r.error ?? ''), r.error, 'mentions non-convergence')
    check('no converged flag fabricated', r.stats?.converged === undefined, r.stats?.converged, 'undefined')
    check('no parameters fabricated', !r.tables, r.tables, undefined)
    check('no figures fabricated', (r.figures ?? []).length === 0, r.figures?.length, 0)
  }
  // Too few points for the parameters is also refused (n < free params + 1).
  console.log('\n[nonlinear non-convergence]  4 params but only 3 points -> refused, no params')
  {
    const r = await nlfit('nonlinear-regression', [1, 2, 3], [1, 2, 3], { equationId: 'dr-4param' })
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message')
    check('no parameters fabricated', !r.tables, r.tables, undefined)
  }

  // ══ PHASE E2 ═════════════════════════════════════════════════════════════
  // Global fitting (plan §5.1): K curves = one X column with MULTIPLE Y columns,
  // fit simultaneously under one equation where each parameter is shared /
  // separate / fixed. The proof is the AC (a shared-parameter fit across ≥3
  // curves converges and recovers the shared params AND each curve's own
  // parameter), the F test (detects a real difference, and does NOT when there
  // is none), the over-sharing→ambiguous SVD path, and loud non-convergence.

  /** Build an XY dataset with one X (role 'x') + several Y curves (role 'y'). */
  const gfDataset = (xs, curves) =>
    dataset([{ id: 'x', name: 'X', role: 'x', values: xs }, ...curves])
  const gfit = (xs, curves, columnIds, options) =>
    analyze(py, 'global-fit', gfDataset(xs, curves), columnIds, options)
  /** The best-fit parameter table (tables[0]): row = [Param, Curve, Best, SE, lo, hi, Note]. */
  const gRows = (r) => r.tables?.[0]?.rows ?? []
  const gShared = (r, name) => gRows(r).find((row) => row[0] === name && row[1] === 'shared')
  const gSep = (r, name, curve) => gRows(r).find((row) => row[0] === name && row[1] === curve)

  // ── AC-E2 (HEADLINE): a shared-parameter global fit across ≥3 curves converges
  // Three dose-response curves share Top=100, Bottom=0, HillSlope=1 but have
  // DIFFERENT logEC50 (-7, -6, -5). Fit globally sharing Top/Bottom/HillSlope and
  // letting logEC50 vary → recover the shared params AND each curve's logEC50.
  const gfEC = [-7, -6, -5]
  const gfXs = range(-9, -3, 0.5)
  const gfCurves = gfEC.map((e, i) => ({
    id: `y${i}`,
    name: `Dose ${i + 1}`,
    values: gen('dr-4param', gfXs, [0, 100, e, 1], 1.0),
  }))
  console.log('\n[global-fit dr-4param]  AC: 3 curves share Top/Bottom/Hill, logEC50 varies (-7,-6,-5)')
  {
    const r = await gfit(gfXs, gfCurves, ['y0', 'y1', 'y2'], {
      equationId: 'dr-4param',
      // Bottom, Top, logEC50, HillSlope -> share all but logEC50 (index 2).
      paramModes: ['shared', 'shared', 'separate', 'shared'],
    })
    const top = gShared(r, 'Top')
    const bot = gShared(r, 'Bottom')
    const hill = gShared(r, 'HillSlope')
    const ec = gfEC.map((_, i) => gSep(r, 'logEC50', `Dose ${i + 1}`))
    console.log(
      `  converged=${r.stats?.converged} K=${r.stats?.['curves (K)']} theta=${r.stats?.['unique parameters']}` +
        ` Top=${top?.[2]} Bottom=${bot?.[2]} Hill=${hill?.[2]} logEC50=[${ec.map((e) => e?.[2]).join(', ')}]`,
    )
    check('no error', !r.error, r.error, undefined)
    check('converged == yes', r.stats?.converged === 'yes', r.stats?.converged, 'yes')
    check('K == 3 curves', r.stats?.['curves (K)'] === 3, r.stats?.['curves (K)'], 3)
    // Sharing Bottom/Top/Hill (3) + 3 separate logEC50 = 6 unique parameters.
    check('6 unique parameters (3 shared + 3 separate)', r.stats?.['unique parameters'] === 6, r.stats?.['unique parameters'], 6)
    check('shared Top recovered ~ 100', near(top?.[2], 100, 3), top?.[2], 100)
    check('shared Bottom recovered ~ 0', near(bot?.[2], 0, 3), bot?.[2], 0)
    check('shared HillSlope recovered ~ 1', near(hill?.[2], 1, 0.15), hill?.[2], 1)
    check('shown ONCE (shared)', gRows(r).filter((row) => row[0] === 'Top').length === 1, gRows(r).filter((row) => row[0] === 'Top').length, 1)
    check('logEC50 shown per curve (3 rows)', gRows(r).filter((row) => row[0] === 'logEC50').length === 3, gRows(r).filter((row) => row[0] === 'logEC50').length, 3)
    check('curve 1 logEC50 ~ -7', near(ec[0]?.[2], -7, 0.15), ec[0]?.[2], -7)
    check('curve 2 logEC50 ~ -6', near(ec[1]?.[2], -6, 0.15), ec[1]?.[2], -6)
    check('curve 3 logEC50 ~ -5', near(ec[2]?.[2], -5, 0.15), ec[2]?.[2], -5)
    // Finite SEs (col 3) on the recovered parameters — the honest-uncertainty AC.
    check('shared Top SE finite', typeof top?.[3] === 'number' && Number.isFinite(top[3]), top?.[3], 'finite')
    check('curve-1 logEC50 SE finite', typeof ec[0]?.[3] === 'number' && Number.isFinite(ec[0][3]), ec[0]?.[3], 'finite')
    check('one overlay figure of all K curves', r.figures?.length === 1 && r.figures[0].startsWith('<svg'), r.figures?.length, 1)
    check('R^2 > 0.99', r.stats?.['R squared'] > 0.99, r.stats?.['R squared'], '>0.99')
  }

  // ── F test DETECTS a real difference: the same curves (EC50s genuinely differ)
  // → shared-logEC50 null vs separate-logEC50 alternative should be significant.
  console.log('\n[global-fit F test]  EC50s DIFFER -> F prefers separate (p small)')
  {
    const r = await gfit(gfXs, gfCurves, ['y0', 'y1', 'y2'], {
      equationId: 'dr-4param',
      paramModes: ['shared', 'shared', 'shared', 'shared'],
      fTestParam: 2, // logEC50
    })
    const s = r.stats
    console.log(`  F=${s?.['F (shared vs separate logEC50)']} p=${s?.['p (F test)']} differs=${s?.['logEC50 differs across curves']}`)
    check('no error', !r.error, r.error, undefined)
    check('an F statistic was reported', typeof s?.['F (shared vs separate logEC50)'] === 'number', s?.['F (shared vs separate logEC50)'], 'a number')
    check('F-test p IS significant (p < 0.05)', s?.['p (F test)'] < 0.05, s?.['p (F test)'], '<0.05')
    check('verdict: logEC50 differs across curves', s?.['logEC50 differs across curves'] === 'yes', s?.['logEC50 differs across curves'], 'yes')
    const cmp = r.tables?.find((t) => /F test/.test(t.title))
    check('an F-test table with AICc for both models', !!cmp && cmp.rows.length === 2, cmp?.rows?.length, 2)
    check('AICc reported for both models', typeof cmp?.rows?.[0]?.[3] === 'number' && typeof cmp?.rows?.[1]?.[3] === 'number', 'both', 'two AICc numbers')
  }

  // ── F test does NOT prefer separate when there is NO difference: three curves
  // generated with the SAME logEC50 (-6) → freeing it per curve must NOT help.
  console.log('\n[global-fit F test]  EC50s SAME -> F does NOT prefer separate (p not significant)')
  {
    const same = [0, 1, 2].map((i) => ({
      id: `y${i}`,
      name: `Rep ${i + 1}`,
      values: gen('dr-4param', gfXs, [0, 100, -6, 1], 1.0 + i * 0.3),
    }))
    const r = await gfit(gfXs, same, ['y0', 'y1', 'y2'], {
      equationId: 'dr-4param',
      paramModes: ['shared', 'shared', 'shared', 'shared'],
      fTestParam: 2,
    })
    const s = r.stats
    console.log(`  F=${s?.['F (shared vs separate logEC50)']} p=${s?.['p (F test)']} differs=${s?.['logEC50 differs across curves']}`)
    check('no error', !r.error, r.error, undefined)
    check('F-test p is NOT significant (p > 0.05)', s?.['p (F test)'] > 0.05, s?.['p (F test)'], '>0.05')
    check('verdict: logEC50 does NOT differ', s?.['logEC50 differs across curves'] === 'no', s?.['logEC50 differs across curves'], 'no')
  }

  // ── OVER-SHARING → AMBIGUOUS (the SVD path): share Slope across 3 curves whose
  // X is CONSTANT (0). With X≡0 the line is y=Intercept, so Slope has ZERO effect
  // → J^T J is rank-deficient in that direction. The shared Slope must be flagged
  // AMBIGUOUS with an EMPTY CI — never a confident tiny CI from the pseudo-inverse.
  console.log('\n[global-fit over-sharing]  constant-X shared Slope -> flagged ambiguous, NOT confident')
  {
    const flat = [0, 1, 2].map((i) => ({
      id: `y${i}`,
      name: `C${i + 1}`,
      values: [i + 1, i + 1, i + 1], // constant per curve -> Intercept identifiable, Slope not
    }))
    const r = await gfit([0, 0, 0], flat, ['y0', 'y1', 'y2'], {
      equationId: 'line',
      paramModes: ['shared', 'separate'], // Slope shared, Intercept separate
    })
    const slope = gShared(r, 'Slope')
    console.log(`  converged=${r.stats?.converged} ambiguous=${JSON.stringify(r.stats?.['ambiguous parameters'] ?? null)} slopeRow=${JSON.stringify(slope)}`)
    check('no error (it CONVERGED, but a param is ambiguous)', !r.error, r.error, undefined)
    check('reports ambiguous parameters', typeof r.stats?.['ambiguous parameters'] === 'string', r.stats?.['ambiguous parameters'], 'a note')
    check('shared Slope is flagged ambiguous', /ambiguous/i.test(String(slope?.[6] ?? '')), slope?.[6], 'ambiguous')
    check('shared Slope has NO confident CI (CI low is null)', slope?.[4] === null, slope?.[4], null)
    check('shared Slope has NO confident CI (CI high is null)', slope?.[5] === null, slope?.[5], null)
    check('shared Slope SE is null, not a tiny fabricated number', slope?.[3] === null, slope?.[3], null)
    // The identifiable Intercepts are NOT flagged ambiguous.
    const int0 = gSep(r, 'Intercept', 'C1')
    check('Intercept C1 is identifiable (not ambiguous)', !/ambiguous/i.test(String(int0?.[6] ?? '')), int0?.[6], 'not ambiguous')
    check('Intercept C1 recovered ~ 1', near(int0?.[2], 1, 1e-6), int0?.[2], 1)
  }

  // ── Non-convergence reported LOUDLY, no fabricated params: two curves under the
  // 4-parameter Hill with everything SEPARATE needs 8 params but only 4 points.
  console.log('\n[global-fit non-convergence]  8 params, 4 points -> refused, no fabricated params')
  {
    const tiny = [0, 1].map((i) => ({ id: `y${i}`, name: `C${i}`, values: [1 + i, 2 + i] }))
    const r = await gfit([-6, -5], tiny, ['y0', 'y1'], {
      equationId: 'dr-4param',
      paramModes: ['separate', 'separate', 'separate', 'separate'],
    })
    console.log(`  error=${JSON.stringify((r.error ?? '').slice(0, 90))}`)
    check('graceful error present', typeof r.error === 'string' && r.error.length > 0, r.error, 'a message string')
    check('no traceback', !r.error?.includes('Traceback'), r.error, 'no Traceback')
    check('no converged flag fabricated', r.stats?.converged === undefined, r.stats?.converged, 'undefined')
    check('no parameters fabricated', !r.tables, r.tables, undefined)
    check('no figures fabricated', (r.figures ?? []).length === 0, r.figures?.length, 0)
  }

  // ── FIX (dof + dropped-blank-column): an entirely-blank Y column must be
  // DROPPED, not kept as a 0-point "curve" -- that used to inflate p_theta
  // (and via the old m-p_theta dof, the real curves' CIs) without adding any
  // rank. Two IDENTICAL real curves (so the pooled residual variance collapses
  // to exactly the single-curve variance) + one all-blank column: the
  // recovered SE for a real curve's Slope must equal an ordinary single-curve
  // OLS fit exactly, and the blank column must not be counted in K.
  console.log('\n[global-fit blank column]  FIX: all-blank Y column dropped; real-curve SE == single-curve SE')
  {
    const lineXs = [1, 2, 3, 4, 5]
    const lineYs = [2.0, 4.3, 5.8, 8.4, 9.9]
    const ds = gfDataset(lineXs, [
      { id: 'y0', name: 'C1', values: lineYs },
      { id: 'y1', name: 'C2', values: lineYs },
      { id: 'yb', name: 'Blank', values: [null, null, null, null, null] },
    ])
    const r = await analyze(py, 'global-fit', ds, ['y0', 'y1', 'yb'], {
      equationId: 'line', paramModes: ['separate', 'separate'],
    })
    const lin = await analyze(
      py, 'linear-regression',
      gfDataset(lineXs, [{ id: 'y0', name: 'C1', values: lineYs }]), ['y0'], {},
    )
    const slopeC1 = gSep(r, 'Slope', 'C1')
    console.log(
      `  K=${r.stats?.['curves (K)']} skipped=${r.stats?.['columns skipped']} df=${r.stats?.['degrees of freedom']}` +
        ` slopeSE(global)=${slopeC1?.[3]} slopeSE(single-curve)=${lin.stats?.['slope SE']}`,
    )
    check('no error', !r.error, r.error, undefined)
    check('blank column dropped -> K == 2 (only the real curves)', r.stats?.['curves (K)'] === 2, r.stats?.['curves (K)'], 2)
    check('reports the skipped column by name', r.stats?.['columns skipped'] === 'Blank', r.stats?.['columns skipped'], 'Blank')
    check('dof counts only the 2 real curves: (5-2)+(5-2)=6', r.stats?.['degrees of freedom'] === 6, r.stats?.['degrees of freedom'], 6)
    check(
      "real curve's Slope SE matches an ordinary single-curve fit (not inflated by a phantom curve)",
      near(slopeC1?.[3], lin.stats?.['slope SE'], 1e-6), slopeC1?.[3], lin.stats?.['slope SE'],
    )
  }

  // ── FIX (practically unidentifiable): a curve that stays in the shallow tail
  // of a steep Hill curve (never nears its inflection or plateau) leaves
  // logEC50/HillSlope barely constrained by the data -- full numerical rank
  // (not the exact-singular `ambiguous` path), but a huge relative SE. Bottom
  // and Top (the two curves' own asymptote levels) stay normally constrained
  // in the SAME fit -- the fix must flag only the genuinely poor ones.
  console.log('\n[global-fit poorly-constrained]  FIX: barely-rising curve -> logEC50/HillSlope flagged, Bottom/Top stay normal')
  {
    const flatXs = [-9, -8.5, -8, -7.5, -7, -6.5]
    const flatCurves = [
      { id: 'y0', name: 'A', values: gen('dr-4param', flatXs, [0, 100, -6, 2], 0.2) },
      { id: 'y1', name: 'B', values: gen('dr-4param', flatXs, [0, 100, -6, 2], 0.25) },
    ]
    const r = await gfit(flatXs, flatCurves, ['y0', 'y1'], {
      equationId: 'dr-4param',
      paramModes: ['shared', 'separate', 'shared', 'shared'],
    })
    const bottom = gShared(r, 'Bottom')
    const topA = gSep(r, 'Top', 'A')
    const ec = gShared(r, 'logEC50')
    const hill = gShared(r, 'HillSlope')
    console.log(
      `  converged=${r.stats?.converged} poor=${JSON.stringify(r.stats?.['poorly constrained parameters'] ?? null)}` +
        ` Bottom note=${JSON.stringify(bottom?.[6])} logEC50 note=${JSON.stringify(ec?.[6])}`,
    )
    check('no error (it converged)', !r.error, r.error, undefined)
    check('reports poorly-constrained parameters', typeof r.stats?.['poorly constrained parameters'] === 'string', r.stats?.['poorly constrained parameters'], 'a note')
    check('logEC50 (shared) is flagged poorly constrained', /poorly constrained/i.test(String(ec?.[6] ?? '')), ec?.[6], 'poorly constrained')
    check('HillSlope (shared) is flagged poorly constrained', /poorly constrained/i.test(String(hill?.[6] ?? '')), hill?.[6], 'poorly constrained')
    check('logEC50 keeps its real (huge but finite) SE, not nulled', typeof ec?.[3] === 'number' && Number.isFinite(ec[3]), ec?.[3], 'finite')
    check('logEC50 keeps its real (huge but finite) CI, not nulled', typeof ec?.[4] === 'number' && typeof ec?.[5] === 'number', [ec?.[4], ec?.[5]], 'two numbers')
    // The well-identified params in the SAME fit are NOT flagged.
    check('Bottom (shared) is NOT flagged poorly constrained', !/poorly constrained/i.test(String(bottom?.[6] ?? '')), bottom?.[6], 'not flagged')
    check('Top (curve A) is NOT flagged poorly constrained', !/poorly constrained/i.test(String(topA?.[6] ?? '')), topA?.[6], 'not flagged')
    check('Bottom SE is a normal, modest number', near(bottom?.[2], 0, 1) && bottom?.[3] < 1, bottom?.[3], '< 1')
    check('Top (curve A) SE is a normal, modest number (rel SE < 100)', topA?.[3] / Math.abs(topA?.[2]) < 100, topA?.[3] / Math.abs(topA?.[2]), '< 100')
  }

  // ══ PHASE F1 — FIGURE CRAFT ═══════════════════════════════════════════════

  // ── Significance brackets — THE F ACCEPTANCE CRITERION ───────────────────
  // The on-figure brackets must be IDENTICAL to the results-table significance:
  // one bracket per significant Tukey pair, none for non-significant pairs, and
  // each bracket's star level follows that same pair's adjusted p. Reuses the
  // Montgomery tensile-strength case (6 significant of 10 pairs). Each bracket
  // is tagged with a gid dt-bracket-{i}-{j}-s{stars} in the SVG.
  console.log('\n[significance brackets — THE F ACCEPTANCE CRITERION]  Montgomery ANOVA+Tukey, brackets:stars')
  {
    const names = ['15pct', '20pct', '25pct', '30pct', '35pct']
    const ds = dataset([
      { id: 'p15', name: '15pct', values: [7, 7, 15, 11, 9] },
      { id: 'p20', name: '20pct', values: [12, 17, 12, 18, 18] },
      { id: 'p25', name: '25pct', values: [14, 18, 18, 19, 19] },
      { id: 'p30', name: '30pct', values: [19, 25, 22, 19, 23] },
      { id: 'p35', name: '35pct', values: [7, 10, 11, 15, 11] },
    ])
    const cols = ['p15', 'p20', 'p25', 'p30', 'p35']
    const r = await analyze(py, 'one-way-anova', ds, cols, {
      posthoc: 'tukey', correction: 'tukey', brackets: 'stars',
    })
    const svg = r.figures?.[0] ?? ''
    const gids = [...svg.matchAll(/dt-bracket-(\d+)-(\d+)-s(\d)/g)]
    const tuk = r.tables?.[0]?.rows ?? []
    const sigLabels = new Set(tuk.filter((row) => row[5] === 'yes').map((row) => row[0]))
    const adjByPair = Object.fromEntries(tuk.map((row) => [row[0], row[2]]))
    const bracketPairs = new Set()
    let starMatch = true
    for (const g of gids) {
      const i = Number(g[1]), j = Number(g[2]), stars = Number(g[3])
      const label = `${names[i]} vs ${names[j]}`
      bracketPairs.add(label)
      if (starsOf(adjByPair[label]) !== stars) starMatch = false
    }
    console.log(`  brackets in SVG=${gids.length}  significant table rows=${sigLabels.size}  pairs=[${[...bracketPairs].join(' | ')}]`)
    check('a bracket is drawn (the SVG carries dt-bracket gids)', gids.length > 0, gids.length, '>0')
    check('AC: bracket count == number of significant Tukey pairs', gids.length === sigLabels.size, gids.length, sigLabels.size)
    check('AC: exactly the 6 significant Montgomery pairs are bracketed', gids.length === 6, gids.length, 6)
    check('AC: the bracketed set EQUALS the significant table set (one source of truth)', setsEqual(bracketPairs, sigLabels), [...bracketPairs].sort().join(','), [...sigLabels].sort().join(','))
    check('AC: each bracket star level matches that pair\'s adjusted p', starMatch, starMatch, true)
    // Explicit published pairs.
    const wantSig = ['15pct vs 20pct', '15pct vs 25pct', '15pct vs 30pct', '20pct vs 30pct', '25pct vs 35pct', '30pct vs 35pct']
    const wantNot = ['15pct vs 35pct', '20pct vs 25pct', '20pct vs 35pct', '25pct vs 30pct']
    for (const p of wantSig) check(`bracketed: ${p}`, bracketPairs.has(p), bracketPairs.has(p), true)
    for (const p of wantNot) check(`NOT bracketed: ${p}`, !bracketPairs.has(p), bracketPairs.has(p), false)
  }

  // ── Brackets default OFF: the figure is byte-identical to the pre-F1 one ──
  console.log('\n[brackets default off]  no brackets option -> no bracket marks; no-op options byte-identical')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const plain = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], {})
    const noop = await analyze(py, 'one-way-anova', ds, ['g1', 'g2', 'g3'], {
      graph: 'bar', brackets: 'none', minorTicks: 'off', symbol: 'circle', symbolFill: 'filled', errorBarDir: 'both',
    })
    check('no bracket gid when brackets are not opted in', !/dt-bracket-/.test(plain.figures?.[0] ?? ''), 'has dt-bracket', 'none')
    check('all-default format/bracket options render a BYTE-IDENTICAL figure (prior smoke stays green)', stripDate(noop.figures?.[0]) === stripDate(plain.figures?.[0]), 'differs', 'equal drawing bytes')
  }

  // ── Bracket alignment past a dropped empty group — FIX 2 ─────────────────
  // _box/_violin drop empty groups before plotting, but a bracket's (i, j)
  // always indexes the analysis's FULL groups list. No shipping analysis lets
  // an empty group reach a bracketed figure today (each guards it out before
  // calling _group_fig) -- this is the latent trap F2 would otherwise walk
  // into, so it's exercised directly against _box/_violin here.
  console.log('\n[bracket alignment — FIX 2]  box/violin brackets track the DRAWN boxes past a dropped empty group')
  {
    await py.runPythonAsync(BRACKET_PROBE_PY)
    // G0 is empty and gets dropped; G1..G4 draw as the 1st..4th boxes.
    const withEmpty = [
      ['G0', []],
      ['G1', [1, 2, 3, 4, 5]],
      ['G2', [10, 11, 12, 13, 14]],
      ['G3', [20, 21, 22, 23, 24]],
      ['G4', [30, 31, 32, 33, 34]],
    ]
    for (const kind of ['box', 'violin']) {
      // The significant pair is G1 vs G2 (group-index 1, 2) -- the FIRST and
      // SECOND drawn boxes (x=1, x=2), since G0 (index 0) was dropped. Indexing
      // the pre-drop range directly (the bug) would instead land this on the
      // 2nd/3rd boxes (x=2, x=3) -- G2 vs G3, the WRONG pair.
      const hit = await bracketProbe(py, kind, withEmpty, [[1, 2, 0.01]], 'stars')
      console.log(`  ${kind}: bracket for group-index (1,2) drawn at x=${JSON.stringify(hit[0]?.x)}`)
      check(`${kind}: exactly one bracket drawn for the real pair`, hit.length === 1, hit.length, 1)
      check(`${kind}: AC — bracket sits over the CORRECT drawn boxes (x=1,2, not x=2,3)`,
        !!hit[0] && hit[0].x[0] === 1 && hit[0].x[1] === 2, hit[0]?.x, [1, 2])

      // A bracket naming the DROPPED (empty) group has no box to point at --
      // it must be skipped outright, never misdrawn against whatever sits at
      // that index.
      const dropped = await bracketProbe(py, kind, withEmpty, [[0, 1, 0.01]], 'stars')
      check(`${kind}: a bracket referencing the dropped empty group is skipped`, dropped.length === 0, dropped.length, 0)
    }

    // Normal figure (no empty groups): the fix must be a no-op here -- same
    // drawn positions as the pre-fix range(1, len(groups)+1).
    const allFilled = [
      ['G1', [1, 2, 3, 4, 5]],
      ['G2', [10, 11, 12, 13, 14]],
      ['G3', [20, 21, 22, 23, 24]],
    ]
    for (const kind of ['box', 'violin']) {
      const hit = await bracketProbe(py, kind, allFilled, [[0, 1, 0.01]], 'stars')
      check(`${kind}: a normal (all-non-empty) figure's brackets are unchanged (x=1,2)`,
        hit.length === 1 && hit[0].x[0] === 1 && hit[0].x[1] === 2, hit[0]?.x, [1, 2])
    }
  }

  // ── DPI + format export (300-dpi PNG is the poster AC) ───────────────────
  console.log('\n[DPI export]  300-dpi PNG (poster AC), 72-dpi scaling, SVG + PDF')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const cols = ['g1', 'g2', 'g3']
    const png300 = await exportFigure(py, 'one-way-anova', ds, cols, {}, 0, 'png', 300)
    const png72 = await exportFigure(py, 'one-way-anova', ds, cols, {}, 0, 'png', 72)
    check('no export error', !png300.error, png300.error, undefined)
    const b300 = b64(png300.base64), b72 = b64(png72.base64)
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    check('300-dpi PNG carries the PNG magic header', b300.subarray(0, 8).equals(PNG_MAGIC), b300.subarray(0, 8).toString('hex'), PNG_MAGIC.toString('hex'))
    check('300-dpi PNG is non-trivial (> 5 KB)', b300.length > 5000, b300.length, '>5000')
    const w300 = b300.readUInt32BE(16), h300 = b300.readUInt32BE(20)
    const w72 = b72.readUInt32BE(16), h72 = b72.readUInt32BE(20)
    console.log(`  300dpi=${w300}x${h300}  72dpi=${w72}x${h72}  width ratio=${(w300 / w72).toFixed(3)} (want ${(300 / 72).toFixed(3)})`)
    check('300-dpi pixel width reflects the 300/72 scaling vs 72 dpi', Math.abs(w300 / w72 - 300 / 72) < 0.05, w300 / w72, 300 / 72)
    check('300-dpi pixel height scales the same way', Math.abs(h300 / h72 - 300 / 72) < 0.05, h300 / h72, 300 / 72)
    const svg = await exportFigure(py, 'one-way-anova', ds, cols, {}, 0, 'svg', 300)
    const svgText = b64(svg.base64).toString('utf-8')
    check('SVG export is raw vector (starts with <?xml or <svg)', svgText.startsWith('<?xml') || svgText.startsWith('<svg'), svgText.slice(0, 12), '<?xml / <svg')
    const pdf = await exportFigure(py, 'one-way-anova', ds, cols, {}, 0, 'pdf', 300)
    check('PDF export starts with %PDF', b64(pdf.base64).subarray(0, 4).toString('ascii') === '%PDF', b64(pdf.base64).subarray(0, 4).toString('ascii'), '%PDF')
  }

  // ── Format Axes / Format Graph actually change the figure ────────────────
  console.log('\n[format options]  log-Y differs, y-range clips, symbol changes; default unchanged')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
    ])
    const cols = ['g1', 'g2', 'g3']
    const plain = await analyze(py, 'one-way-anova', ds, cols, {})
    const logY = await analyze(py, 'one-way-anova', ds, cols, { yScale: 'log10' })
    const clip = await analyze(py, 'one-way-anova', ds, cols, { yMax: 3 })
    const sqr = await analyze(py, 'one-way-anova', ds, cols, { symbol: 'square', symbolSize: 30 })
    check('log-Y option changes the figure', typeof logY.figures?.[0] === 'string' && stripDate(logY.figures[0]) !== stripDate(plain.figures?.[0]), 'differs', 'differs')
    check('a y-range override (yMax) changes the figure', stripDate(clip.figures?.[0]) !== stripDate(plain.figures?.[0]), 'differs', 'differs')
    check('a symbol/size change changes the figure', stripDate(sqr.figures?.[0]) !== stripDate(plain.figures?.[0]), 'differs', 'differs')
    check('all three formatted figures are still valid SVG', [logY, clip, sqr].every((r) => (r.figures?.[0] ?? '').startsWith('<svg')), 'all svg', 'all svg')
  }

  // ── Phase F2: poster layout (multi-panel A/B labels, 300-dpi PNG) ─────────
  console.log('\n[layout export]  1x2 poster of two analyses at 300 dpi with A/B labels (poster AC)')
  {
    const ds = dataset([
      { id: 'g1', name: 'G1', values: [1, 2, 3, 4, 5] },
      { id: 'g2', name: 'G2', values: [2, 3, 4, 5, 6] },
      { id: 'g3', name: 'G3', values: [3, 4, 5, 6, 7] },
      { id: 'x', name: 'Dose', values: [1, 2, 3, 4, 5], role: 'x' },
      { id: 'y', name: 'Response', values: [2, 4, 5, 4, 6] },
    ])
    const panels = [
      { analysisId: 'one-way-anova', spec: { columnIds: ['g1', 'g2', 'g3'] } },
      { analysisId: 'linear-regression', spec: { columnIds: ['y'] } },
    ]
    const png = await exportLayout(py, ds, panels, 1, 2, 'png', 300)
    const png72 = await exportLayout(py, ds, panels, 1, 2, 'png', 72)
    check('no layout export error', !png.error, png.error, undefined)
    const b = b64(png.base64)
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    check('poster PNG carries the PNG magic header', b.subarray(0, 8).equals(PNG_MAGIC), b.subarray(0, 8).toString('hex'), PNG_MAGIC.toString('hex'))
    check('poster PNG is non-trivial (> 5 KB)', b.length > 5000, b.length, '>5000')
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20)
    // 1x2 at _PANEL_W=4.5, _PANEL_H=3.4 → figsize (9.0, 3.4) → 2700 x 1020 @300 dpi.
    console.log(`  poster 300dpi = ${w}x${h}  (want 2700x1020, reflecting 300 dpi)`)
    check('poster width reflects 2 cols × 4.5in × 300 dpi (= 2700 px)', w === 2700, w, 2700)
    check('poster height reflects 3.4in × 300 dpi (= 1020 px)', h === 1020, h, 1020)
    const w72 = b64(png72.base64).readUInt32BE(16)
    check('poster pixel width scales with dpi (300/72 vs the 72-dpi export)', Math.abs(w / w72 - 300 / 72) < 0.05, w / w72, 300 / 72)
    // A/B panel labels present via gid (the SVG backend writes <g id='dt-panel-A'>).
    const svg = await exportLayout(py, ds, panels, 1, 2, 'svg', 300)
    const svgText = b64(svg.base64).toString('utf-8')
    check("poster SVG carries the 'A' panel label", svgText.includes('dt-panel-A'), 'dt-panel-A', 'present')
    check("poster SVG carries the 'B' panel label", svgText.includes('dt-panel-B'), 'dt-panel-B', 'present')
  }

  // ── Phase F2: "Open in Code mode" bridge (generated script runs to a figure) ─
  console.log('\n[code bridge]  generated matplotlib runs to a matching figure in Pyodide (bridge AC)')
  {
    const bd = {
      columns: [
        { id: 'c1', name: 'Time', type: 'number', role: 'x' },
        { id: 'c2', name: 'Mass g', type: 'number', role: 'y' },
        { id: 'c3', name: "O'Brien; drop", type: 'number', role: 'y' }, // hostile name
        { id: 'c4', name: 'Grp', type: 'text', role: 'group' },
      ],
      rows: [[1, 10, 3, 'a'], [2, 20, 6, 'b'], [3, 30, 9, 'c'], [4, 25, 7, 'a']],
    }
    // Sheets chart → scatter + a linear trendline.
    const chartCode = chartToPython(
      { id: 'ch1', type: 'scatter', xColumnId: 'c1', yColumnIds: ['c2'], showLegend: true, showGridlines: true, trendlines: [{ yColumnId: 'c2', kind: 'linear' }] },
      bd,
    )
    const r1 = await bridgeRun(py, chartCode, bd)
    check('chartToPython (scatter + trend) runs without error', !r1.error, r1.error, 'no error')
    check('chartToPython renders exactly one SVG figure', r1.figures === 1 && r1.svg_ok, `${r1.figures} / ${r1.svg_ok}`, '1 / true')
    // Sheets bar chart whose column name has a quote + semicolon: escaping must hold
    // — and now that the generator references `df['O\'Brien; drop']` instead of
    // embedding the column, this is also the proof the df-reference approach
    // didn't reopen the injection question the reviewer signed off on.
    const barCode = chartToPython(
      { id: 'ch2', type: 'bar', xColumnId: 'c4', yColumnIds: ['c3'], showLegend: false, showGridlines: false },
      bd,
    )
    const r2 = await bridgeRun(py, barCode, bd)
    check('chartToPython (bar, quote/semicolon in name) runs — escaping holds', !r2.error && r2.figures === 1, `${r2.error} / ${r2.figures}`, 'no error / 1 fig')
    // Lab group analysis → bar of means ± SD.
    const grpCode = analysisToPython({ id: 'a1', analysisId: 'one-way-anova', columnIds: ['c2', 'c3'] }, bd)
    const r3 = await bridgeRun(py, grpCode, bd)
    check('analysisToPython (group bar) runs to a figure', !r3.error && r3.figures === 1, `${r3.error} / ${r3.figures}`, 'no error / 1 fig')
    // Lab XY analysis → scatter + fit line.
    const xyCode = analysisToPython({ id: 'a2', analysisId: 'linear-regression', columnIds: ['c2'] }, bd)
    const r4 = await bridgeRun(py, xyCode, bd)
    check('analysisToPython (XY scatter + fit) runs to a figure', !r4.error && r4.figures === 1, `${r4.error} / ${r4.figures}`, 'no error / 1 fig')

    // ── FIX 1 acceptance: a LARGE dataset no longer blows the script past
    // MAX_SCRIPT_CODE (20 000 chars). Before referencing the injected `df`
    // instead of embedding rows, `descriptive` on 2000x5 measured ~97 398 chars
    // — over the cap, so the script could never be added to draft.scripts
    // (ScriptsSchema rejects it and pins the WHOLE save queue). It must now be
    // small AND still render, using the FULL 2000 rows the worker injects.
    const bigCols = ['Time', 'Mass', 'Force', 'Volume', 'Speed']
    const bigRows = []
    for (let i = 0; i < 2000; i++) {
      bigRows.push([i, Math.sin(i) * 10 + 20, i % 7, Math.sqrt(i), (i * 1.3) % 50])
    }
    const bigDs = {
      columns: bigCols.map((name, i) => ({ id: `bc${i}`, name, type: 'number', role: i === 0 ? 'x' : 'y' })),
      rows: bigRows,
    }
    const bigCode = analysisToPython(
      { id: 'a3', analysisId: 'descriptive', columnIds: bigCols.map((_, i) => `bc${i}`).slice(1) },
      bigDs,
    )
    console.log(`  descriptive on 2000x5 -> ${bigCode.length} chars (was ~97398 embedding rows; cap is 20000)`)
    check('large-dataset script is well under MAX_SCRIPT_CODE (20000)', bigCode.length < 20000, bigCode.length, '<20000')
    const r5 = await bridgeRun(py, bigCode, bigDs)
    check('large-dataset script still runs to a figure over the FULL 2000 rows', !r5.error && r5.figures === 1 && r5.svg_ok, `${r5.error} / ${r5.figures} / ${r5.svg_ok}`, 'no error / 1 / true')

    // ── FIX 3: a polynomial trendline with too few points draws NO line
    // (mirrors fitPolynomial's guard) instead of np.polyfit's rank-deficient wiggle.
    const fewPtsDs = {
      columns: [
        { id: 'x', name: 'X', type: 'number', role: 'x' },
        { id: 'y', name: 'Y', type: 'number', role: 'y' },
      ],
      rows: [[1, 2], [2, 4]], // 2 points; polynomial order 2 needs >= 3.
    }
    const polyCode = chartToPython(
      { id: 'ch3', type: 'scatter', xColumnId: 'x', yColumnIds: ['y'], showLegend: false, showGridlines: false, trendlines: [{ yColumnId: 'y', kind: 'polynomial', order: 2 }] },
      fewPtsDs,
    )
    const polyCallEmitted = polyCode.includes("_trend(ax, df['X'], df['Y']")
    check('polynomial trendline with too few points is not emitted', !polyCallEmitted, polyCallEmitted, false)
    const r6 = await bridgeRun(py, polyCode, fewPtsDs)
    check('the (trendline-less) chart still runs to a figure', !r6.error && r6.figures === 1, `${r6.error} / ${r6.figures}`, 'no error / 1 fig')

    // ── FIX 4: log-Y on a bar chart is never emitted (mirrors logAvailable —
    // log only ever applies to a line/scatter chart with all-positive Y).
    const barLogCode = chartToPython(
      { id: 'ch4', type: 'bar', xColumnId: 'c4', yColumnIds: ['c2'], showLegend: false, showGridlines: false, logScale: true },
      bd,
    )
    check('log-Y on a bar chart emits no set_yscale', !barLogCode.includes('set_yscale'), barLogCode.includes('set_yscale'), false)
    const r7 = await bridgeRun(py, barLogCode, bd)
    check('the (linear) bar chart still runs to a figure', !r7.error && r7.figures === 1, `${r7.error} / ${r7.figures}`, 'no error / 1 fig')
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} — analysis templates match known values.`)
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err.message ?? err)
  process.exit(1)
})
