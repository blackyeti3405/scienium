'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Loader2, Plus, Trash2, BarChart3, ChevronLeft } from 'lucide-react'

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

/**
 * Data Terminal (spec §14.1) — experiment tracking + graphing for the `working`
 * phase, surfaced as an Operations Hub tab. Records x/y measurements per
 * experiment (optionally grouped into series) and charts them with recharts.
 */
export function DataTerminalTab() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

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

  async function removeExperiment(id: string) {
    await fetch(`/api/data-terminal/${id}`, { method: 'DELETE' })
    setExperiments((list) => list.filter((e) => e.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  if (loading) {
    return (
      <div className="ops-tab-body items-center justify-center">
        <Loader2 className="animate-spin text-white/30" size={20} />
      </div>
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
      <ExperimentDetail
        key={selected.id}
        experiment={selected}
        onBack={() => setSelectedId(null)}
        onChange={upsertExperiment}
      />
    )
  }

  return (
    <div className="ops-tab-body">
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
                <button
                  type="button"
                  onClick={() => removeExperiment(exp.id)}
                  className="text-white/30 hover:text-red-400 transition-colors p-1"
                  aria-label="Delete experiment"
                >
                  <Trash2 size={14} />
                </button>
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
        <button
          type="button"
          onClick={submit}
          disabled={busy || !title.trim()}
          className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          {busy ? 'Creating…' : 'Create'}
        </button>
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          points: [{ x: xn, y: yn, series: series.trim() || undefined }],
        }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not add point')
      onChange({ ...experiment, measurements: out.measurements })
      setX('')
      setY('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function removePoint(id: string) {
    const res = await fetch(
      `/api/data-terminal/${experiment.id}/measurements?measurementId=${id}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      onChange({
        ...experiment,
        measurements: experiment.measurements.filter((m) => m.id !== id),
      })
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

        <div className="bg-[#0a1628] border border-white/10 p-2" style={{ height: 240 }}>
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

        {/* Add-point row */}
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
          <button
            type="button"
            onClick={addPoint}
            disabled={busy}
            className="inline-flex items-center gap-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

        {/* Points table */}
        {experiment.measurements.length > 0 && (
          <table className="w-full text-xs text-white/80 border-collapse">
            <thead>
              <tr className="font-pixel text-[7px] text-white/35 uppercase">
                <th className="text-left py-1">{experiment.xLabel}</th>
                <th className="text-left py-1">{experiment.yLabel}</th>
                <th className="text-left py-1">series</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {experiment.measurements.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="py-1">{m.x}</td>
                  <td className="py-1">{m.y}</td>
                  <td className="py-1 text-white/45">{m.series || '—'}</td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removePoint(m.id)}
                      className="text-white/25 hover:text-red-400 transition-colors"
                      aria-label="Delete point"
                    >
                      <Trash2 size={12} />
                    </button>
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
