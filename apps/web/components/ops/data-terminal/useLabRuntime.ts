'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RUN_TIMEOUT_MS,
  type AnalysisDataset,
  type AnalysisResult,
  type AnalysisSpecInput,
  type FigureExport,
  type FigureExportFormat,
  type LayoutPanel,
  type WorkerToMain,
} from '@/lib/data-terminal/runtime/protocol'

/**
 * The Lab-lane runtime — the same Pyodide worker as the Code lane, but loaded
 * with the full stats set (`scipy` + `statsmodels`) and driven with `analyze`
 * messages that run TRUSTED, canned templates (analysis-templates.mjs) rather
 * than free-form user code.
 *
 * ponytail: deliberately a sibling of `useCodeRuntime`, not a shared generic
 * hook. The two genuinely differ — package set, message type, result shape —
 * and forking ~90 lines is lower-risk than threading a generic worker driver
 * through the already-tested Code hook. Same two main-thread responsibilities:
 * the wall-clock timeout (a wasm loop can only be killed with `terminate()`)
 * and single-flight (one analysis OR export at a time — they share the worker).
 *
 * The first load pulls ~65 MB of wheels through the proxy (numpy + matplotlib +
 * pandas + scipy + statsmodels), so `status` drives a real "loading" state.
 */

export type LabStatus = 'loading' | 'ready' | 'error'

/** The Lab lane's package set — MUST include everything a template imports. */
const LAB_PACKAGES = ['numpy', 'matplotlib', 'pandas', 'scipy', 'statsmodels']

/**
 * One in-flight request at a time. `match` is the result message type this
 * promise waits for (analyze vs. figure export); `errorResult` builds the
 * correctly-shaped rejection for a timeout or a load failure.
 */
type Pending = {
  match: 'analysis-result' | 'export-result'
  settle: (r: AnalysisResult | FigureExport) => void
  errorResult: (message: string) => AnalysisResult | FigureExport
  timer: ReturnType<typeof setTimeout>
}

export function useLabRuntime() {
  const [status, setStatus] = useState<LabStatus>('loading')
  const [running, setRunning] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Pending | null>(null)

  // Settle the pending request (if any) with its own error shape — used by both
  // the worker-load failure paths (onerror / load-error).
  const failPending = useCallback((message: string) => {
    const pending = pendingRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRef.current = null
    setRunning(false)
    pending.settle(pending.errorResult(message))
  }, [])

  const spawn = useCallback(() => {
    const worker = new Worker(
      new URL('../../../lib/data-terminal/runtime/pyodide.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onerror = (event: ErrorEvent) => {
      setStatus('error')
      failPending(`Runtime failed to load: ${event.message || 'worker error'}`)
    }
    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as WorkerToMain
      if (msg.type === 'ready') {
        setStatus('ready')
        return
      }
      if (msg.type === 'load-error') {
        setStatus('error')
        failPending(`Runtime failed to load: ${msg.error}`)
        return
      }
      if (msg.type !== 'analysis-result' && msg.type !== 'export-result') return
      const pending = pendingRef.current
      if (!pending || pending.match !== msg.type) return
      clearTimeout(pending.timer)
      pendingRef.current = null
      setRunning(false)
      pending.settle(msg.result)
    }
    workerRef.current = worker
    // Kick the worker's load with the FULL stats set — network is neutralized
    // after this, so scipy/statsmodels must be requested here or not at all.
    worker.postMessage({ type: 'init', packages: LAB_PACKAGES })
  }, [failPending])

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

  // Respawn a fresh worker after a wall-clock timeout — the only real kill for a
  // busy wasm loop. Shared by analyze + export so the timeout story is identical.
  const respawn = useCallback(() => {
    workerRef.current?.terminate()
    setStatus('loading')
    spawn()
  }, [spawn])

  const analyze = useCallback(
    (
      analysisId: string,
      dataset: AnalysisDataset,
      spec: AnalysisSpecInput,
    ): Promise<AnalysisResult> => {
      if (pendingRef.current) {
        return Promise.resolve({ stats: {}, figures: [], error: 'An analysis is already running.' })
      }
      const worker = workerRef.current
      if (!worker) {
        return Promise.resolve({ stats: {}, figures: [], error: 'Runtime is not ready.' })
      }
      setRunning(true)
      return new Promise<AnalysisResult>((resolve) => {
        const errorResult = (message: string): AnalysisResult => ({ stats: {}, figures: [], error: message })
        const timer = setTimeout(() => {
          pendingRef.current = null
          respawn()
          setRunning(false)
          resolve(errorResult(`Timed out after ${RUN_TIMEOUT_MS / 1000}s — the analysis was stopped.`))
        }, RUN_TIMEOUT_MS)
        pendingRef.current = {
          match: 'analysis-result',
          settle: resolve as (r: AnalysisResult | FigureExport) => void,
          errorResult: errorResult as (m: string) => AnalysisResult | FigureExport,
          timer,
        }
        worker.postMessage({ type: 'analyze', analysisId, dataset, spec })
      })
    },
    [respawn],
  )

  // Phase F1: re-render one figure of a trusted analysis at a chosen format +
  // DPI. Same single-flight + timeout discipline as `analyze`.
  const exportFigure = useCallback(
    (
      analysisId: string,
      dataset: AnalysisDataset,
      spec: AnalysisSpecInput,
      figureIndex: number,
      format: FigureExportFormat,
      dpi: number,
    ): Promise<FigureExport> => {
      if (pendingRef.current) {
        return Promise.resolve({ format, dpi, base64: '', error: 'Another run is in progress — try again in a moment.' })
      }
      const worker = workerRef.current
      if (!worker) {
        return Promise.resolve({ format, dpi, base64: '', error: 'Runtime is not ready.' })
      }
      setRunning(true)
      return new Promise<FigureExport>((resolve) => {
        const errorResult = (message: string): FigureExport => ({ format, dpi, base64: '', error: message })
        const timer = setTimeout(() => {
          pendingRef.current = null
          respawn()
          setRunning(false)
          resolve(errorResult(`Timed out after ${RUN_TIMEOUT_MS / 1000}s — the export was stopped.`))
        }, RUN_TIMEOUT_MS)
        pendingRef.current = {
          match: 'export-result',
          settle: resolve as (r: AnalysisResult | FigureExport) => void,
          errorResult: errorResult as (m: string) => AnalysisResult | FigureExport,
          timer,
        }
        worker.postMessage({ type: 'export-figure', analysisId, dataset, spec, figureIndex, format, dpi })
      })
    },
    [respawn],
  )

  // Phase F2: compose several saved analyses into one multi-panel poster figure
  // at a chosen format + DPI. Same single-flight + timeout discipline, and the
  // SAME `export-result` message shape as `exportFigure`.
  const exportLayout = useCallback(
    (
      dataset: AnalysisDataset,
      panels: LayoutPanel[],
      rows: number,
      cols: number,
      format: FigureExportFormat,
      dpi: number,
    ): Promise<FigureExport> => {
      if (pendingRef.current) {
        return Promise.resolve({ format, dpi, base64: '', error: 'Another run is in progress — try again in a moment.' })
      }
      const worker = workerRef.current
      if (!worker) {
        return Promise.resolve({ format, dpi, base64: '', error: 'Runtime is not ready.' })
      }
      setRunning(true)
      return new Promise<FigureExport>((resolve) => {
        const errorResult = (message: string): FigureExport => ({ format, dpi, base64: '', error: message })
        const timer = setTimeout(() => {
          pendingRef.current = null
          respawn()
          setRunning(false)
          resolve(errorResult(`Timed out after ${RUN_TIMEOUT_MS / 1000}s — the export was stopped.`))
        }, RUN_TIMEOUT_MS)
        pendingRef.current = {
          match: 'export-result',
          settle: resolve as (r: AnalysisResult | FigureExport) => void,
          errorResult: errorResult as (m: string) => AnalysisResult | FigureExport,
          timer,
        }
        worker.postMessage({ type: 'export-layout', dataset, panels, rows, cols, format, dpi })
      })
    },
    [respawn],
  )

  return { status, running, analyze, exportFigure, exportLayout }
}
