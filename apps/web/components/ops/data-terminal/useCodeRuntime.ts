'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_FIGURE_BYTES,
  MAX_FIGURES,
  MAX_STREAM_BYTES,
  RUN_TIMEOUT_MS,
  type ResultMessage,
  type RuntimeDataset,
  type WorkerToMain,
} from '@/lib/data-terminal/runtime/protocol'

/**
 * The Code-lane runtime, owned by the client. C2's editor calls `run()`; this
 * hook is the whole main-thread half of the sandbox.
 *
 * Two responsibilities the worker CANNOT do itself:
 *
 *  1. **The wall-clock timeout.** A busy wasm loop can't be interrupted from
 *     inside the worker, so the only real kill is `worker.terminate()` from out
 *     here. On expiry we terminate, report `timed out`, and respawn a fresh
 *     worker so the next run starts clean.
 *  2. **Single-flight.** One run at a time — a second `run()` while one is in
 *     flight is refused, so a terminate can never resolve the wrong promise.
 *
 * The first load pulls ~30 MB of wheels through the proxy; `status` exposes that
 * so the UI can show progress instead of a dead Run button.
 */

export type RuntimeStatus = 'loading' | 'ready' | 'error'

export interface RunResult {
  /**
   * Attacker-controlled figure SVG (FIX 2). C2 MUST render each as an inert
   * `<img src={figureDataUrl(fig)}>` — see lib/data-terminal/runtime/figure.ts.
   * NEVER `dangerouslySetInnerHTML` a figure.
   */
  figures: string[]
  stdout: string
  stderr: string
  /** Present on a raise, a timeout, or a runtime load failure. */
  error?: string
}

/** Truncate a stream to MAX_STREAM_BYTES UTF-8 bytes with a notice. */
function truncateStream(s: string): string {
  const bytes = new TextEncoder().encode(s)
  if (bytes.length <= MAX_STREAM_BYTES) return s
  // Decoder drops a partial trailing char rather than emitting a broken byte.
  const head = new TextDecoder().decode(bytes.slice(0, MAX_STREAM_BYTES))
  return `${head}\n… [output truncated]`
}

/**
 * AUTHORITATIVE runtime caps (FIX 3), enforced on the main thread where user
 * Python can't reach them. The worker's Python-side caps are only a courtesy —
 * a script can mutate `__main__._MAX_*`, so these are the real ceiling: figure
 * COUNT ≤ MAX_FIGURES, total figure BYTES ≤ MAX_FIGURE_BYTES, each stream ≤
 * MAX_STREAM_BYTES. Pure so it's unit-tested directly.
 */
export function enforceCaps(result: ResultMessage): RunResult {
  // Cap the figure COUNT first, then the total byte budget.
  let total = 0
  const kept: string[] = []
  for (const svg of result.figures.slice(0, MAX_FIGURES)) {
    total += svg.length
    if (total > MAX_FIGURE_BYTES) break
    kept.push(svg)
  }
  const dropped = result.figures.length - kept.length
  const stdout = truncateStream(result.stdout)
  let stderr = truncateStream(result.stderr)
  if (dropped > 0) {
    stderr = `${stderr}${stderr ? '\n' : ''}[${dropped} figure(s) dropped — over the ${MAX_FIGURES}-figure / size limit]`
  }
  return { figures: kept, stdout, stderr, ...(result.error ? { error: result.error } : {}) }
}

export function useCodeRuntime() {
  const [status, setStatus] = useState<RuntimeStatus>('loading')
  const [running, setRunning] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  // The single in-flight run's plumbing. `settle` resolves the run() promise
  // exactly once; `timer` is the wall-clock kill.
  const pendingRef = useRef<{
    settle: (r: RunResult) => void
    timer: ReturnType<typeof setTimeout>
  } | null>(null)

  const spawn = useCallback(() => {
    // Web Worker + wasm bundling: `new URL(..., import.meta.url)` with
    // `type: 'module'` is how webpack (Next's bundler) discovers and compiles
    // the worker. The wasm/wheels are NOT bundled — they resolve at runtime
    // through the proxy indexURL the worker builds from `self.location.origin`.
    const worker = new Worker(
      // Relative (not the `@/` alias): webpack's `new URL(..., import.meta.url)`
      // worker discovery resolves relative specifiers reliably.
      new URL('../../../lib/data-terminal/runtime/pyodide.worker.ts', import.meta.url),
      { type: 'module' },
    )
    // A worker module-load / instantiation failure (e.g. a CSP block on the
    // worker itself, or a bad import) fires `onerror`, NOT `onmessage` — without
    // this handler such a failure would leave `status` stuck on 'loading' with a
    // dead Run button and no signal. Surface it as `status:'error'` and fail any
    // in-flight run, exactly like a `load-error` message.
    worker.onerror = (event: ErrorEvent) => {
      setStatus('error')
      const pending = pendingRef.current
      if (pending) {
        clearTimeout(pending.timer)
        pendingRef.current = null
        setRunning(false)
        pending.settle({
          figures: [],
          stdout: '',
          stderr: '',
          error: `Runtime failed to load: ${event.message || 'worker error'}`,
        })
      }
    }
    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as WorkerToMain
      if (msg.type === 'ready') {
        setStatus('ready')
        return
      }
      if (msg.type === 'load-error') {
        setStatus('error')
        // Fail any run waiting on a runtime that will never load.
        const pending = pendingRef.current
        if (pending) {
          clearTimeout(pending.timer)
          pendingRef.current = null
          setRunning(false)
          pending.settle({ figures: [], stdout: '', stderr: '', error: `Runtime failed to load: ${msg.error}` })
        }
        return
      }
      // The Code worker only ever posts 'result' here; 'analysis-result' is the
      // Lab lane's and never reaches this hook, but narrow it for the type.
      if (msg.type !== 'result') return
      const pending = pendingRef.current
      if (!pending) return
      clearTimeout(pending.timer)
      pendingRef.current = null
      setRunning(false)
      pending.settle(enforceCaps(msg))
    }
    workerRef.current = worker
    // The worker waits for its package set before loading. The Code lane needs
    // only the lean trio — never the ~35 MB of stats wheels the Lab lane pulls.
    worker.postMessage({ type: 'init', packages: ['numpy', 'matplotlib', 'pandas'] })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    spawn()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer)
        pendingRef.current = null
      }
    }
  }, [spawn])

  const run = useCallback(
    (code: string, dataset: RuntimeDataset): Promise<RunResult> => {
      if (pendingRef.current) {
        return Promise.resolve({
          figures: [],
          stdout: '',
          stderr: '',
          error: 'A run is already in progress.',
        })
      }
      const worker = workerRef.current
      if (!worker) {
        return Promise.resolve({ figures: [], stdout: '', stderr: '', error: 'Runtime is not ready.' })
      }

      setRunning(true)
      return new Promise<RunResult>((resolve) => {
        const timer = setTimeout(() => {
          // The only real kill for a wasm loop: drop the worker on the floor and
          // start a fresh one so the next run isn't poisoned.
          pendingRef.current = null
          worker.terminate()
          setStatus('loading')
          spawn()
          setRunning(false)
          resolve({
            figures: [],
            stdout: '',
            stderr: '',
            error: `Timed out after ${RUN_TIMEOUT_MS / 1000}s — the script was stopped.`,
          })
        }, RUN_TIMEOUT_MS)
        pendingRef.current = { settle: resolve, timer }
        worker.postMessage({ type: 'run', code, dataset })
      })
    },
    [spawn],
  )

  return { status, running, run }
}
