'use client'

import { useState } from 'react'
import { Plus, Trash2, BarChart3 } from 'lucide-react'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useExperiments } from './useExperiments'
import { NewExperimentForm } from './NewExperimentForm'
import { ExperimentDetail } from './ExperimentDetail'

/**
 * The pre-F12 Data Terminal body (experiment list, phase-lock screen, detail
 * view) — unchanged behavior, just extracted so `DataTerminalTab` can mount
 * the Stats Guide switch above it.
 */
export function ExperimentsView() {
  const { confirm, alert, dialog } = useConfirm()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const { experiments, loading, locked, deletingId, upsertExperiment, removeExperiment } =
    useExperiments({
      confirm,
      alert,
      onDeleted: (id) => {
        if (selectedId === id) setSelectedId(null)
      },
    })

  const selected = experiments.find((e) => e.id === selectedId) ?? null

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
          // Kept local over <EmptyState>: this block predates the primitive and
          // its type scale/tint (8px, white/30) differ — visual parity wins.
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
                    {exp.measurementCount} points
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
