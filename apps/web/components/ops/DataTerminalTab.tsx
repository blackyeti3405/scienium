'use client'

import { useState, useEffect, useMemo, useRef, type ComponentType } from 'react'
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
import { Plus, Trash2, BarChart3, ChevronLeft, Download, FileImage, BookOpen, FlaskConical, LineChart as LineChartIcon, PieChart, ClipboardList, Droplets } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { LucideIcon } from 'lucide-react'
import { parsePastedPoints, toCsv } from '@/lib/data-terminal/csv'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface Measurement {
  id: string
  x: number
  y: number
  series: string
  note: string | null
}
interface Experiment {
  id: string
  title: string
  description: string
  xLabel: string
  yLabel: string
  measurements: Measurement[]
}

const SERIES_COLORS = ['#F5C518', '#4FD1C5', '#F687B3', '#90CDF4', '#A0AEC0', '#9AE6B4']

/** Slugify a title to use as a download filename (no extension). */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'experiment'
}

/** Trigger a file download from a Blob. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Safari requires the anchor to be in the DOM before click().
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type DataTerminalView = 'experiments' | 'guide' | 'charts-guide' | 'plot-guide' | 'methods-guide' | 'data-quality-guide'

// The guide panels each pull a large static-content module (plot-guide alone
// is ~765KB of source), but render only when their sub-tab is selected — so
// they are code-split out of the hub chunk and fetched on first open, with the
// guide loader as the fallback (same pattern as lib/featureRegistry.tsx).
const guideLoading = () => <LabeledLoader label="Loading guide…" fill="tab" />
const StatsGuidePanel = dynamic(() => import('./StatsGuidePanel').then((m) => m.StatsGuidePanel), { loading: guideLoading })
const ChartsGuidePanel = dynamic(() => import('./ChartsGuidePanel').then((m) => m.ChartsGuidePanel), { loading: guideLoading })
const PlotGuidePanel = dynamic(() => import('./PlotGuidePanel').then((m) => m.PlotGuidePanel), { loading: guideLoading })
const MethodsGuidePanel = dynamic(() => import('./MethodsGuidePanel').then((m) => m.MethodsGuidePanel), { loading: guideLoading })
const DataQualityGuidePanel = dynamic(() => import('./DataQualityGuidePanel').then((m) => m.DataQualityGuidePanel), { loading: guideLoading })

/**
 * One entry per sub-tab: the strip buttons and the view switch below both
 * render from this table, so adding a guide is a one-line entry (key, label,
 * icon, testId, Panel) instead of two hand-copied JSX blocks. `Panel` is
 * omitted for the experiments tab, which renders `ExperimentsView` with no
 * guide wrapper.
 */
const SUB_TABS: {
  key: DataTerminalView
  label: string
  icon: LucideIcon
  testId: string
  Panel?: ComponentType
}[] = [
  { key: 'experiments', label: 'Experiments', icon: FlaskConical, testId: 'experiments-subtab' },
  { key: 'guide', label: 'Stats Guide', icon: BookOpen, testId: 'stats-guide-tab', Panel: StatsGuidePanel },
  { key: 'charts-guide', label: 'Charts Guide', icon: PieChart, testId: 'charts-guide-tab', Panel: ChartsGuidePanel },
  { key: 'plot-guide', label: 'Plot Guide', icon: LineChartIcon, testId: 'plot-guide-tab', Panel: PlotGuidePanel },
  { key: 'methods-guide', label: 'Methods', icon: ClipboardList, testId: 'methods-guide-tab', Panel: MethodsGuidePanel },
  { key: 'data-quality-guide', label: 'Data Quality', icon: Droplets, testId: 'data-quality-guide-tab', Panel: DataQualityGuidePanel },
]

/**
 * Data Terminal (spec §14.1) — experiment tracking + graphing for the `working`
 * phase, surfaced as an Operations Hub tab. Records x/y measurements per
 * experiment (optionally grouped into series) and charts them with recharts.
 *
 * Feature F12 adds a "Stats Guide" sub-tab (static reference content, no API
 * dependency). Features F13/F14 add "Charts Guide" and "Plot Guide" sub-tabs,
 * same pattern. Feature F3 adds a "Methods Guide" sub-tab (experimental-design
 * concepts — everything before data exists), same pattern again. Feature F4
 * adds a "Data Quality" sub-tab (everything AFTER data is collected —
 * measurement uncertainty, sig figs/units, data cleaning, methodology
 * pitfalls), same pattern again. The `view` switch below is deliberately the
 * FIRST thing this component renders, ABOVE the `loading` / `locked` /
 * `selected` early returns that gate the Experiments view — every guide must
 * stay reachable regardless of phase-lock or load state, so none of them can
 * live behind those branches. Do not move the switch below any early return.
 */
export function DataTerminalTab() {
  const [view, setView] = useState<DataTerminalView>('experiments')
  const ActiveGuidePanel = SUB_TABS.find((t) => t.key === view)?.Panel

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex flex-wrap gap-1 px-4 pt-3 shrink-0">
        {SUB_TABS.map(({ key, label, icon: Icon, testId }) => (
          <button
            key={key}
            type="button"
            data-testid={testId}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 font-pixel text-[7px] px-3 py-2 border-b-2 transition-colors ${
              view === key
                ? 'text-[#F5C518] border-[#F5C518]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {ActiveGuidePanel ? (
        <div className="ops-tab-body">
          <div className="max-w-2xl mx-auto w-full py-2">
            <ActiveGuidePanel />
          </div>
        </div>
      ) : (
        <ExperimentsView />
      )}
    </div>
  )
}

/**
 * The pre-F12 Data Terminal body (experiment list, phase-lock screen, detail
 * view) — unchanged behavior, just extracted so `DataTerminalTab` can mount
 * the Stats Guide switch above it.
 */
function ExperimentsView() {
  const { confirm, alert, dialog } = useConfirm()
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data-terminal')
      .then(async (r) => {
        if (r.status === 403) {
          setLocked(true)
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (d?.experiments) setExperiments(d.experiments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selected = experiments.find((e) => e.id === selectedId) ?? null

  function upsertExperiment(exp: Experiment) {
    setExperiments((list) => {
      const idx = list.findIndex((e) => e.id === exp.id)
      if (idx === -1) return [exp, ...list]
      const next = [...list]
      next[idx] = exp
      return next
    })
  }

  async function removeExperiment(exp: Experiment) {
    if (deletingId) return // guard the double-click window
    if (
      !(await confirm({
        title: 'Delete experiment',
        message: `Delete "${exp.title}" and all ${exp.measurements.length} of its data points? This can't be undone.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setDeletingId(exp.id)
    try {
      const res = await fetch(`/api/data-terminal/${exp.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setExperiments((list) => list.filter((e) => e.id !== exp.id))
      if (selectedId === exp.id) setSelectedId(null)
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete the experiment. Please try again.' })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <>
        {dialog}
        <OpsTabSkeleton variant="terminal" />
      </>
    )
  }

  if (locked) {
    return (
      <div className="ops-tab-body items-center justify-center text-center px-8">
        <BarChart3 className="text-white/20 mb-3" size={28} />
        <span className="font-pixel text-[9px] text-white/40 leading-relaxed">
          The Data Terminal unlocks at the Working phase,
          <br />
          once you start collecting data.
        </span>
      </div>
    )
  }

  if (selected) {
    return (
      <>
        {dialog}
        <ExperimentDetail
          key={selected.id}
          experiment={selected}
          onBack={() => setSelectedId(null)}
          onChange={upsertExperiment}
        />
      </>
    )
  }

  return (
    <div className="ops-tab-body">
      {dialog}
      <div className="max-w-2xl mx-auto w-full space-y-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">
            Experiments
          </span>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 transition-all"
          >
            <Plus size={11} /> New
          </button>
        </div>

        {creating && (
          <NewExperimentForm
            onCancel={() => setCreating(false)}
            onCreated={(exp) => {
              upsertExperiment(exp)
              setCreating(false)
              setSelectedId(exp.id)
            }}
          />
        )}

        {experiments.length === 0 && !creating ? (
          <div className="border border-dashed border-white/15 py-10 text-center">
            <span className="font-pixel text-[8px] text-white/30">
              No experiments yet — start one to chart your data.
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {experiments.map((exp) => (
              <li
                key={exp.id}
                className="flex items-center justify-between border border-white/10 bg-[#0a1628] px-3 py-2.5 hover:border-white/25 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(exp.id)}
                  className="text-left flex-1"
                >
                  <span className="text-sm text-white block truncate">{exp.title}</span>
                  <span className="font-pixel text-[7px] text-white/35">
                    {exp.measurements.length} points
                  </span>
                </button>
                <BusyButton
                  busy={deletingId === exp.id}
                  icon={<Trash2 size={14} />}
                  onClick={() => removeExperiment(exp)}
                  className="text-white/30 hover:text-red-400 transition-colors p-1 disabled:opacity-100"
                  aria-label="Delete experiment"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NewExperimentForm({
  onCreated,
  onCancel,
}: {
  onCreated: (exp: Experiment) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [xLabel, setXLabel] = useState('')
  const [yLabel, setYLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/data-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          xLabel: xLabel.trim() || undefined,
          yLabel: yLabel.trim() || undefined,
        }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not create')
      onCreated(out.experiment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-white/15 bg-[#0a1628] p-3 space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Experiment title"
        maxLength={120}
        className="w-full bg-[#0d1b2e] border border-white/15 text-white text-sm px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={xLabel}
          onChange={(e) => setXLabel(e.target.value)}
          placeholder="x-axis label"
          maxLength={40}
          className="bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
        <input
          value={yLabel}
          onChange={(e) => setYLabel(e.target.value)}
          placeholder="y-axis label"
          maxLength={40}
          className="bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
      </div>
      {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <BusyButton
          busy={busy}
          busyLabel="Creating…"
          showSpinner={false}
          onClick={submit}
          disabled={!title.trim()}
          className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          Create
        </BusyButton>
        <button
          type="button"
          onClick={onCancel}
          className="font-pixel text-[8px] text-white/40 hover:text-white/70 px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ExperimentDetail({
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

  // Bulk paste state
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteSkipped, setPasteSkipped] = useState<number | null>(null)
  const [pasteRowCount, setPasteRowCount] = useState(0)

  // Delete-measurement busy state (also guards the double-click window).
  const [deletingPointId, setDeletingPointId] = useState<string | null>(null)

  const chartRef = useRef<HTMLDivElement>(null)

  const { chartData, seriesNames } = useMemo(() => {
    const names = Array.from(
      new Set(experiment.measurements.map((m) => m.series || 'series')),
    )
    const byX = new Map<number, Record<string, number>>()
    for (const m of experiment.measurements) {
      const row = byX.get(m.x) ?? { x: m.x }
      row[m.series || 'series'] = m.y
      byX.set(m.x, row)
    }
    return {
      chartData: Array.from(byX.values()).sort((a, b) => a.x - b.x),
      seriesNames: names,
    }
  }, [experiment.measurements])

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
      const res = await fetch(`/api/data-terminal/${experiment.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [
            {
              x: xn,
              y: yn,
              series: series.trim() || undefined,
              note: note.trim() || undefined,
            },
          ],
        }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not add point')
      onChange({ ...experiment, measurements: out.measurements })
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
      const res = await fetch(`/api/data-terminal/${experiment.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not add points')
      onChange({ ...experiment, measurements: out.measurements })
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
    const csv = toCsv(experiment)
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
      const svgEl = svg.cloneNode(true) as SVGElement
      const width = svg.clientWidth || 600
      const height = svg.clientHeight || 240

      svgEl.setAttribute('width', String(width))
      svgEl.setAttribute('height', String(height))
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

      // Prepend a dark background rect so transparency renders correctly
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('width', String(width))
      bg.setAttribute('height', String(height))
      bg.setAttribute('fill', '#0a1628')
      svgEl.insertBefore(bg, svgEl.firstChild)

      const serialized = new XMLSerializer().serializeToString(svgEl)
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)

      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'))
              return
            }
            downloadBlob(blob, `${slugify(experiment.title)}.png`)
            resolve()
          }, 'image/png')
        }
        img.onerror = () => reject(new Error('SVG image load failed'))
        img.src = dataUrl
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG export failed')
    }
  }

  async function removePoint(id: string) {
    if (deletingPointId) return // guard the double-click window
    setDeletingPointId(id)
    try {
      const res = await fetch(
        `/api/data-terminal/${experiment.id}/measurements?measurementId=${id}`,
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error()
      onChange({
        ...experiment,
        measurements: experiment.measurements.filter((m) => m.id !== id),
      })
    } catch {
      setError('Could not delete the point. Please try again.')
    } finally {
      setDeletingPointId(null)
    }
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
            disabled={experiment.measurements.length === 0}
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
        {experiment.measurements.length > 0 && (
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
              {experiment.measurements.map((m) => (
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
