'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Plus, Trash2, ChevronLeft, Download, FileImage } from 'lucide-react'
import { parsePastedPoints, toCsv } from '@/lib/data-terminal/csv'
import { downloadBlob, downloadChartPng, slugify } from '@/lib/data-terminal/export'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import type { Experiment, Measurement } from './types'
import { addMeasurements, deleteMeasurement, listMeasurements } from './api'

const SERIES_COLORS = ['#F5C518', '#4FD1C5', '#F687B3', '#90CDF4', '#A0AEC0', '#9AE6B4']

export function ExperimentDetail({
  experiment,
  onBack,
  onChange,
}: {
  experiment: Experiment
  onBack: () => void
  onChange: (exp: Experiment) => void
}) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [series, setSeries] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Points are lazy-loaded on selection (the list route only carries counts —
  // PERF-2). `null` = still fetching; the component is keyed by experiment.id,
  // so each selection remounts and refetches.
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMeasurements(experiment.id)
      .then((d) => {
        if (!cancelled) setMeasurements(d.measurements)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the data points. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [experiment.id])

  // Keep the list's point count honest whenever the loaded set changes.
  function syncMeasurements(next: Measurement[]) {
    setMeasurements(next)
    onChange({ ...experiment, measurementCount: next.length })
  }

  // Bulk paste state
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteSkipped, setPasteSkipped] = useState<number | null>(null)
  const [pasteRowCount, setPasteRowCount] = useState(0)

  // Delete-measurement busy state (also guards the double-click window).
  const [deletingPointId, setDeletingPointId] = useState<string | null>(null)

  const chartRef = useRef<HTMLDivElement>(null)

  const { chartData, seriesNames } = useMemo(() => {
    const points = measurements ?? []
    const names = Array.from(new Set(points.map((m) => m.series || 'series')))
    const byX = new Map<number, Record<string, number>>()
    for (const m of points) {
      const row = byX.get(m.x) ?? { x: m.x }
      row[m.series || 'series'] = m.y
      byX.set(m.x, row)
    }
    return {
      chartData: Array.from(byX.values()).sort((a, b) => a.x - b.x),
      seriesNames: names,
    }
  }, [measurements])

  async function addPoint() {
    const xn = Number(x)
    const yn = Number(y)
    if (!Number.isFinite(xn) || !Number.isFinite(yn) || busy) {
      setError('Enter numeric x and y values.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const out = await addMeasurements(experiment.id, [
        {
          x: xn,
          y: yn,
          series: series.trim() || undefined,
          note: note.trim() || undefined,
        },
      ])
      syncMeasurements(out.measurements)
      setX('')
      setY('')
      setSeries('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function submitPaste() {
    if (busy) return
    const { points, skipped } = parsePastedPoints(pasteText)
    if (points.length === 0) {
      setError('No valid data rows found. Check that x and y are numeric.')
      return
    }
    setBusy(true)
    setPasteRowCount(points.length)
    setError(null)
    setPasteSkipped(null)
    try {
      const out = await addMeasurements(experiment.id, points)
      syncMeasurements(out.measurements)
      setPasteText('')
      setPasteOpen(false)
      if (skipped > 0) setPasteSkipped(skipped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const csv = toCsv({ xLabel: experiment.xLabel, yLabel: experiment.yLabel, measurements: measurements ?? [] })
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, `${slugify(experiment.title)}.csv`)
  }

  async function exportPng() {
    const container = chartRef.current
    const svg = container?.querySelector('svg')
    if (!svg) {
      setError('Chart not rendered — add points first.')
      return
    }
    try {
      await downloadChartPng(svg, `${slugify(experiment.title)}.png`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG export failed')
    }
  }

  async function removePoint(id: string) {
    if (deletingPointId) return // guard the double-click window
    setDeletingPointId(id)
    try {
      await deleteMeasurement(experiment.id, id)
      syncMeasurements((measurements ?? []).filter((m) => m.id !== id))
    } catch {
      setError('Could not delete the point. Please try again.')
    } finally {
      setDeletingPointId(null)
    }
  }

  // Points still fetching (or failed) — keep the header so Back always works,
  // with a loading affordance where the chart/table will appear.
  if (measurements === null) {
    return (
      <div className="ops-tab-body">
        <div className="max-w-2xl mx-auto w-full space-y-3 py-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70"
          >
            <ChevronLeft size={12} /> All experiments
          </button>

          <h3 className="text-base text-white font-medium">{experiment.title}</h3>

          {loadError ? (
            <p className="font-pixel text-[8px] text-red-400">{loadError}</p>
          ) : (
            <LabeledLoader fill="inline" label="Loading data points…" className="items-start py-6" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ops-tab-body">
      <div className="max-w-2xl mx-auto w-full space-y-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70"
        >
          <ChevronLeft size={12} /> All experiments
        </button>

        <h3 className="text-base text-white font-medium">{experiment.title}</h3>

        {/* Chart */}
        <div ref={chartRef} className="bg-[#0a1628] border border-white/10 p-2" style={{ height: 240 }}>
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="font-pixel text-[8px] text-white/25">
                Add points to plot the graph
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
                <CartesianGrid stroke="#ffffff12" />
                <XAxis
                  dataKey="x"
                  type="number"
                  tick={{ fill: '#ffffff70', fontSize: 10 }}
                  label={{ value: experiment.xLabel, position: 'insideBottom', offset: -8, fill: '#ffffff55', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#ffffff70', fontSize: 10 }}
                  label={{ value: experiment.yLabel, angle: -90, position: 'insideLeft', fill: '#ffffff55', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: '#0d1b2e', border: '1px solid #ffffff20', fontSize: 12 }}
                  labelStyle={{ color: '#ffffffaa' }}
                />
                {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
                {seriesNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={measurements.length === 0}
            className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-white/20 text-white/60 px-3 py-2 hover:border-[#F5C518]/60 hover:text-[#F5C518] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Download size={11} /> Export CSV
          </button>
          <button
            type="button"
            onClick={exportPng}
            disabled={chartData.length === 0}
            className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-white/20 text-white/60 px-3 py-2 hover:border-[#F5C518]/60 hover:text-[#F5C518] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <FileImage size={11} /> Export PNG
          </button>
        </div>

        {/* Add-point row */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <input
              value={x}
              onChange={(e) => setX(e.target.value)}
              placeholder={experiment.xLabel}
              inputMode="decimal"
              className="w-20 bg-[#0a1628] border border-white/15 text-white text-xs px-2 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
            />
            <input
              value={y}
              onChange={(e) => setY(e.target.value)}
              placeholder={experiment.yLabel}
              inputMode="decimal"
              className="w-20 bg-[#0a1628] border border-white/15 text-white text-xs px-2 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
            />
            <input
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="series (optional)"
              maxLength={40}
              className="flex-1 min-w-[120px] bg-[#0a1628] border border-white/15 text-white text-xs px-2 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="note (optional)"
              maxLength={200}
              className="flex-1 min-w-[140px] bg-[#0a1628] border border-white/15 text-white text-xs px-2 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
            />
            <BusyButton
              busy={busy}
              showSpinner={false}
              icon={<Plus size={11} />}
              onClick={addPoint}
              className="inline-flex items-center gap-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              Add
            </BusyButton>
          </div>
        </div>

        {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}
        {pasteSkipped !== null && pasteSkipped > 0 && (
          <p className="font-pixel text-[8px] text-white/40">
            {pasteSkipped} row{pasteSkipped !== 1 ? 's' : ''} skipped (non-numeric or over limit).
          </p>
        )}

        {/* Bulk paste */}
        <div className="border border-white/10 bg-[#0a1628]">
          <button
            type="button"
            onClick={() => {
              setPasteOpen((o) => !o)
              setError(null)
              setPasteSkipped(null)
            }}
            className="w-full flex items-center justify-between px-3 py-2 font-pixel text-[8px] text-white/50 hover:text-white/80 transition-colors"
          >
            <span>Paste from spreadsheet</span>
            <span className="text-white/30">{pasteOpen ? '▲' : '▼'}</span>
          </button>

          {pasteOpen && (
            <div className="px-3 pb-3 space-y-2">
              <p className="font-pixel text-[7px] text-white/30">
                x, y, series, note — one row per line (tab or comma separated)
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder="Paste spreadsheet data here…"
                className="w-full bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/20 resize-y"
              />
              {busy ? (
                <LabeledLoader
                  fill="inline"
                  label={`Importing ${pasteRowCount} row${pasteRowCount !== 1 ? 's' : ''}…`}
                  className="items-start py-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={submitPaste}
                  disabled={!pasteText.trim()}
                  className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  Import
                </button>
              )}
            </div>
          )}
        </div>

        {/* Points table */}
        {measurements.length > 0 && (
          <table className="w-full text-xs text-white/80 border-collapse">
            <thead>
              <tr className="font-pixel text-[7px] text-white/35 uppercase">
                <th className="text-left py-1">{experiment.xLabel}</th>
                <th className="text-left py-1">{experiment.yLabel}</th>
                <th className="text-left py-1">series</th>
                <th className="text-left py-1">note</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="py-1">{m.x}</td>
                  <td className="py-1">{m.y}</td>
                  <td className="py-1 text-white/45">{m.series || '—'}</td>
                  <td className="py-1 text-white/45">{m.note || '—'}</td>
                  <td className="py-1 text-right">
                    <BusyButton
                      busy={deletingPointId === m.id}
                      icon={<Trash2 size={12} />}
                      onClick={() => removePoint(m.id)}
                      className="text-white/25 hover:text-red-400 transition-colors disabled:text-white/25"
                      aria-label="Delete point"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
