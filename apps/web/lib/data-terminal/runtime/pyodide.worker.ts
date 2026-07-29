/**
 * The Pyodide Web Worker — where a Data Terminal Code-lane script runs.
 *
 * A saved script is team-shared, so this code runs in a TEAMMATE's browser. The
 * sandbox is designed in from the start (plan §4), not bolted on:
 *
 *  - Worker only: no DOM, no page handle, no Clerk session reachable from here.
 *  - Network is neutralised AFTER the wheels finish loading, so a running script
 *    that reaches for `js.fetch` / XMLHttpRequest / WebSocket FAILS (raises)
 *    rather than silently exfiltrating.
 *  - Only the preloaded wheel set (numpy, matplotlib, pandas) is available; there
 *    is no path to `micropip` / `pip install` because the network is gone.
 *  - The wall-clock timeout is NOT here: a busy wasm loop cannot be interrupted
 *    from inside, so the MAIN thread owns it and calls `worker.terminate()`.
 *    See useCodeRuntime.ts.
 *
 * The runtime files (wasm, stdlib, wheels) are fetched from the same-origin
 * authed proxy at `/api/data-terminal/runtime/`, so the CSP stays `'self'`.
 */
import type { PyodideInterface } from 'pyodide'
import {
  MAX_FIGURES,
  MAX_STREAM_BYTES,
  type AnalyzeMessage,
  type ExportFigureMessage,
  type ExportLayoutMessage,
  type FigureExport,
  type MainToWorker,
  type RuntimeDataset,
  type WorkerToMain,
} from './protocol'
import { neutralizeScope } from './neutralize'
import { sanitizeFigureSvg } from './figure'
import { ANALYSES_PY } from './analysis-templates.mjs'

const post = (msg: WorkerToMain) =>
  (self as unknown as { postMessage(m: unknown): void }).postMessage(msg)

const RUNTIME_INDEX_URL = new URL('/api/data-terminal/runtime/', self.location.origin).href

/**
 * Python side, defined once at load. `_run` is called per message: it injects
 * the dataset into a FRESH namespace (so one run cannot see another's leftover
 * variables), execs the user code with stdout/stderr captured, then renders
 * every figure to inline-ready SVG. Caps are enforced here so a runaway script
 * cannot flood the postMessage channel.
 */
const BOOTSTRAP_PY = `
import sys, io, json, keyword, traceback
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

_MAX_FIGURES = ${MAX_FIGURES}
_MAX_STREAM = ${MAX_STREAM_BYTES}
_RESERVED = {'df', 'np', 'pd', 'plt'}

def _truncate(s):
    b = s.encode('utf-8', 'replace')
    if len(b) <= _MAX_STREAM:
        return s
    return b[:_MAX_STREAM].decode('utf-8', 'ignore') + '\\n… [output truncated]'

def _namespace(dataset):
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
    ns = {'np': np, 'pd': pd, 'plt': plt, 'df': df}
    for nm, arr in data.items():
        if nm.isidentifier() and not keyword.iskeyword(nm) and nm not in _RESERVED:
            ns[nm] = arr
    return ns

def _run(dataset, user_code):
    plt.close('all')
    ns = _namespace(dataset)
    out, err = io.StringIO(), io.StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    error = None
    try:
        exec(compile(user_code, '<script>', 'exec'), ns)
    except BaseException as e:
        error = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
    finally:
        sys.stdout, sys.stderr = old_out, old_err
    figures = []
    for num in plt.get_fignums()[:_MAX_FIGURES]:
        buf = io.StringIO()
        try:
            plt.figure(num).savefig(buf, format='svg')
            s = buf.getvalue()
            figures.append(s[s.index('<svg'):])  # drop the <?xml?> prolog → inline-ready
        except Exception:
            pass
    plt.close('all')
    return json.dumps({
        'figures': figures,
        'stdout': _truncate(out.getvalue()),
        'stderr': _truncate(err.getvalue()),
        'error': error,
    })
`

/**
 * Redefine every egress + realm-creation primitive reachable from a running
 * script to a throwing stub. Called ONLY after the wheels have loaded — the
 * loader itself uses fetch — so from here on any outbound request fails closed.
 *
 * ponytail: the true boundary is "no fresh realm + no egress in THIS realm".
 * The worker legitimately needs same-origin fetch only during Pyodide load
 * (before user code); after this call, all egress is dead. The nested-Worker
 * escape (a child worker = a fresh, un-neutralized realm with a live fetch) is
 * closed two ways: `Worker`/`SharedWorker` are neutralized here, AND the CSP
 * pins `worker-src 'self'` (no blob:) so a blob-worker can't be spawned at all.
 */
function neutralizeNetwork() {
  const deny = (): never => {
    throw new Error('Network access is disabled in Data Terminal scripts.')
  }
  // globalThis + its whole prototype chain (fetch et al. live on
  // WorkerGlobalScope.prototype — an own-prop stub only shadows them).
  neutralizeScope(globalThis, deny)
  // sendBeacon is the one egress primitive that hangs off navigator, not global.
  try {
    const nav = (globalThis as { navigator?: object }).navigator
    if (nav) Reflect.defineProperty(nav, 'sendBeacon', { configurable: false, writable: false, value: deny })
  } catch {
    // Non-configurable in this engine — best effort.
  }
}

// The Code lane's lean set; used only if a `run`/`analyze` somehow arrives
// before the `init` message (it never should — the hook posts init on spawn).
const DEFAULT_PACKAGES = ['numpy', 'matplotlib', 'pandas']

let pyodidePromise: Promise<PyodideInterface> | null = null

/**
 * Load Pyodide + the requested wheel set ONCE, then post `ready`. The package
 * set arrives in the `init` message (Code lane = lean, Lab lane = +scipy
 * +statsmodels) rather than being hardcoded, so the Code lane never pays for
 * the ~35 MB of stats wheels it doesn't use. The trusted Lab analysis
 * templates are only compiled in when scipy is present.
 */
function ensureLoad(packages?: string[]): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    const pkgs = packages && packages.length ? packages : DEFAULT_PACKAGES
    pyodidePromise = (async () => {
      // Load Pyodide's own loader from the same-origin proxy — NOT via a static
      // `import 'pyodide'`. If webpack bundles pyodide.mjs it rewrites the loader's
      // internal `import(`${indexURL}pyodide.asm.mjs`)`, which then throws
      // "Cannot find module <proxy-url>" in the browser (the Node path uses a
      // different loader, so the Node smoke never hit this). `webpackIgnore` keeps
      // it a NATIVE dynamic import, so pyodide.mjs — and every asset it pulls —
      // comes straight from the proxy at runtime.
      const { loadPyodide } = (await import(
        /* webpackIgnore: true */ `${RUNTIME_INDEX_URL}pyodide.mjs`
      )) as typeof import('pyodide')
      const py = await loadPyodide({ indexURL: RUNTIME_INDEX_URL })
      await py.loadPackage(pkgs)
      await py.runPythonAsync(BOOTSTRAP_PY)
      // The Lab analysis registry needs scipy; only define it when scipy was
      // loaded, or `import scipy` would raise for the lean Code lane.
      if (pkgs.includes('scipy')) await py.runPythonAsync(ANALYSES_PY)
      neutralizeNetwork() // AFTER the wheels are in — never before.
      return py
    })()
    pyodidePromise.then(
      () => post({ type: 'ready' }),
      (err: unknown) =>
        post({ type: 'load-error', error: err instanceof Error ? err.message : String(err) }),
    )
  }
  return pyodidePromise
}

self.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as MainToWorker
  if (msg.type === 'init') {
    // First message: kick off the load with the lane's package set.
    void ensureLoad(msg.packages)
    return
  }
  if (msg.type === 'run') {
    void runOne(msg.code, msg.dataset)
    return
  }
  if (msg.type === 'analyze') {
    void analyzeOne(msg)
    return
  }
  if (msg.type === 'export-figure') {
    void exportOne(msg)
    return
  }
  if (msg.type === 'export-layout') {
    void exportLayout(msg)
  }
})

async function runOne(code: string, dataset: RuntimeDataset): Promise<void> {
  try {
    const py = await ensureLoad()
    py.globals.set('__ds__', JSON.stringify(dataset))
    py.globals.set('__code__', code)
    const resultJson = await py.runPythonAsync('_run(json.loads(__ds__), __code__)')
    const parsed = JSON.parse(resultJson as string) as {
      figures: string[]
      stdout: string
      stderr: string
      error: string | null
    }
    post({
      type: 'result',
      // Belt (FIX 2): strip active vectors from attacker-controlled figure SVG
      // before it leaves the sandbox. The PRIMARY defense is C2 rendering each
      // figure as <img src={figureDataUrl(fig)}> — see lib/.../runtime/figure.ts.
      figures: parsed.figures.map(sanitizeFigureSvg),
      stdout: parsed.stdout,
      stderr: parsed.stderr,
      ...(parsed.error ? { error: parsed.error } : {}),
    })
  } catch (err) {
    // A failure OUTSIDE user code (e.g. the runtime never loaded). User-code
    // exceptions are captured in Python and come back as `error` above.
    post({
      type: 'result',
      figures: [],
      stdout: '',
      stderr: '',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Run one TRUSTED Lab analysis template. `_analyze` (analysis-templates.mjs)
 * returns already-structured JSON — the template is OUR code, so it is not the
 * untrusted-code path, but the figure it produces is still rendered inert via
 * `<img>` and belt-sanitized here exactly like a Code-lane figure.
 */
async function analyzeOne(msg: AnalyzeMessage): Promise<void> {
  try {
    const py = await ensureLoad()
    py.globals.set('__aid__', msg.analysisId)
    py.globals.set('__ds__', JSON.stringify(msg.dataset))
    py.globals.set('__spec__', JSON.stringify(msg.spec))
    const resultJson = await py.runPythonAsync(
      '_analyze(__aid__, json.loads(__ds__), json.loads(__spec__))',
    )
    const parsed = JSON.parse(resultJson as string) as {
      stats: Record<string, number | string | null>
      tables?: { title: string; columns: string[]; rows: (number | string | null)[][] }[]
      figures: string[]
      assumptions?: { label: string; passed: boolean; detail: string }[]
      error?: string
    }
    post({
      type: 'analysis-result',
      result: { ...parsed, figures: (parsed.figures ?? []).map(sanitizeFigureSvg) },
    })
  } catch (err) {
    post({
      type: 'analysis-result',
      result: { stats: {}, figures: [], error: err instanceof Error ? err.message : String(err) },
    })
  }
}

/**
 * Re-render one figure of a trusted analysis to PNG/SVG/PDF at a chosen DPI
 * (Phase F1). `_export` re-runs the SAME template and `savefig`s the requested
 * figure, returning base64 bytes — the client turns them into a Blob and
 * downloads. The figure never leaves the sandbox as active markup; PNG/PDF are
 * opaque bytes and the SVG variant is inert bytes the user downloads, not one
 * this page ever renders.
 */
async function exportOne(msg: ExportFigureMessage): Promise<void> {
  try {
    const py = await ensureLoad()
    py.globals.set('__aid__', msg.analysisId)
    py.globals.set('__ds__', JSON.stringify(msg.dataset))
    py.globals.set('__spec__', JSON.stringify(msg.spec))
    py.globals.set('__fidx__', msg.figureIndex)
    py.globals.set('__fmt__', msg.format)
    py.globals.set('__dpi__', msg.dpi)
    const resultJson = await py.runPythonAsync(
      '_export(__aid__, json.loads(__ds__), json.loads(__spec__), __fidx__, __fmt__, __dpi__)',
    )
    const parsed = JSON.parse(resultJson as string) as Partial<FigureExport> & { error?: string }
    post({
      type: 'export-result',
      result: {
        format: parsed.format ?? msg.format,
        dpi: parsed.dpi ?? msg.dpi,
        base64: parsed.base64 ?? '',
        ...(parsed.error ? { error: parsed.error } : {}),
      },
    })
  } catch (err) {
    post({
      type: 'export-result',
      result: {
        format: msg.format,
        dpi: msg.dpi,
        base64: '',
        error: err instanceof Error ? err.message : String(err),
      },
    })
  }
}

/**
 * Compose several analyses into ONE multi-panel poster figure (Phase F2). Each
 * panel's TRUSTED template is re-run and its first figure rasterised into a
 * `rows × cols` subplot grid with an A/B/C label, then the whole board is
 * `savefig`'d at the chosen DPI — see `_export_layout` in analysis-templates.mjs.
 * Returns bytes via the same `export-result` message as a single-figure export.
 */
async function exportLayout(msg: ExportLayoutMessage): Promise<void> {
  try {
    const py = await ensureLoad()
    py.globals.set('__ds__', JSON.stringify(msg.dataset))
    py.globals.set('__panels__', JSON.stringify(msg.panels))
    py.globals.set('__rows__', msg.rows)
    py.globals.set('__cols__', msg.cols)
    py.globals.set('__fmt__', msg.format)
    py.globals.set('__dpi__', msg.dpi)
    const resultJson = await py.runPythonAsync(
      '_export_layout(json.loads(__ds__), json.loads(__panels__), __rows__, __cols__, __fmt__, __dpi__)',
    )
    const parsed = JSON.parse(resultJson as string) as Partial<FigureExport> & { error?: string }
    post({
      type: 'export-result',
      result: {
        format: parsed.format ?? msg.format,
        dpi: parsed.dpi ?? msg.dpi,
        base64: parsed.base64 ?? '',
        ...(parsed.error ? { error: parsed.error } : {}),
      },
    })
  } catch (err) {
    post({
      type: 'export-result',
      result: {
        format: msg.format,
        dpi: msg.dpi,
        base64: '',
        error: err instanceof Error ? err.message : String(err),
      },
    })
  }
}
