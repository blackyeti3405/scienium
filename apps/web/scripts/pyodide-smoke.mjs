#!/usr/bin/env node
/**
 * Phase C1 milestone check — prove the runtime actually works before any UI.
 *
 * The `pyodide` npm package runs in Node too, so this loads the SAME extracted
 * dist the browser proxy will serve, loads numpy + matplotlib from it, builds a
 * small array + a figure, renders it to SVG, and asserts the output is real SVG.
 * If this passes, the two biggest unknowns are settled headlessly: the wheel set
 * is COMPLETE and the matplotlib→SVG path works.
 *
 * Run `node scripts/fetch-pyodide.mjs` first. Then: node scripts/pyodide-smoke.mjs
 */
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadPyodide } from 'pyodide'
import { PYODIDE_VERSION } from '../lib/data-terminal/runtime/version.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
// loadPyodide wants a trailing slash on the indexURL.
const distDir = path.resolve(here, '..', '.pyodide-cache', 'pyodide') + path.sep

const PY = `
import numpy as np, io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 50)
y = np.sin(x)
assert x.shape == (50,) and abs(float(y.max()) - 1.0) < 1e-3

fig, ax = plt.subplots()
ax.plot(x, y)
ax.set_title("smoke")
buf = io.StringIO()
fig.savefig(buf, format="svg")
plt.close(fig)
# matplotlib prepends an <?xml?> + <!DOCTYPE> prolog; slice to <svg> so the
# figure is inline-embeddable (the same normalisation the worker applies).
s = buf.getvalue()
s[s.index("<svg"):]
`

async function main() {
  await stat(path.join(distDir, 'pyodide.asm.wasm')).catch(() => {
    throw new Error(`No dist at ${distDir} — run: node scripts/fetch-pyodide.mjs`)
  })

  console.log(`Loading pyodide ${PYODIDE_VERSION} from ${distDir}`)
  const py = await loadPyodide({ indexURL: distDir })
  console.log('Loading packages: numpy, matplotlib …')
  await py.loadPackage(['numpy', 'matplotlib'])

  const svg = await py.runPythonAsync(PY)

  const ok = typeof svg === 'string' && svg.trimStart().startsWith('<svg') && svg.length > 1000
  if (!ok) {
    throw new Error(
      `SVG assertion FAILED — got ${typeof svg}, length ${svg?.length ?? 0}, head: ${String(svg).slice(0, 60)}`,
    )
  }
  console.log(`PASS — matplotlib rendered ${svg.length.toLocaleString()} bytes of SVG.`)
  console.log(`SVG head: ${svg.trimStart().slice(0, 80)}…`)
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err.message ?? err)
  process.exit(1)
})
