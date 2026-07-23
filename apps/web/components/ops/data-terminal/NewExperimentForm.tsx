'use client'

import { useState } from 'react'
import { BusyButton } from '@/components/ui/BusyButton'
import type { Experiment } from './types'
import { createExperiment } from './api'

export function NewExperimentForm({
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
      const out = await createExperiment({
        title,
        xLabel: xLabel.trim() || undefined,
        yLabel: yLabel.trim() || undefined,
      })
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
        className="w-full bg-[#0d1b2e] border border-white/15 text-white text-sm px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={xLabel}
          onChange={(e) => setXLabel(e.target.value)}
          placeholder="x-axis label"
          maxLength={40}
          className="bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40"
        />
        <input
          value={yLabel}
          onChange={(e) => setYLabel(e.target.value)}
          placeholder="y-axis label"
          maxLength={40}
          className="bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40"
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
