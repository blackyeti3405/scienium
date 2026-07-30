'use client'

import { useState } from 'react'
import { AlertTriangle, X, ChevronDown, Check, Link2 } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { formatDate } from '../log-shared'
import type { LogEntry, LogReferenceChip } from './types'
import { addLogReference } from './api'

// ─── Reference chips + "Link an entry" picker (F6) ─────────────────────────────

/** Formats a reference chip label: "#3 · Data Collection", falling back to the date if no stage. */
function chipLabel(ref: LogReferenceChip): string {
  return `#${ref.entryNumber} · ${ref.stage ?? formatDate(ref.createdAt)}`
}

export function ReferenceChips({
  title,
  refs,
  onRemove,
  removingId,
  testId,
}: {
  title: string
  refs: LogReferenceChip[]
  onRemove?: (targetId: string) => void
  /** id of the ref currently being removed — disables + spinners just that chip's button. */
  removingId?: string | null
  testId: string
}) {
  if (refs.length === 0) return null
  const muted = !onRemove
  return (
    <div className="mt-3" data-testid={testId}>
      <span className={`font-pixel text-[6px] uppercase tracking-widest ${muted ? 'text-white/40' : 'text-white/40'}`}>
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {refs.map((ref) => (
          <span
            key={ref.id}
            data-testid={`${testId}-chip`}
            data-entry-number={ref.entryNumber}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-pixel text-[6px] ${
              muted
                ? 'border-white/10 text-white/40 bg-white/[0.02]'
                : 'border-[#F5C518]/30 text-[#F5C518]/85 bg-[#F5C518]/[0.06]'
            }`}
          >
            {chipLabel(ref)}
            {onRemove && (
              <BusyButton
                busy={removingId === ref.id}
                icon={<X size={9} />}
                onClick={() => onRemove(ref.id)}
                className="ml-0.5 -mr-0.5 opacity-60 hover:opacity-100 disabled:opacity-100"
                title="Remove link"
                data-testid={`${testId}-remove`}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function LinkEntryPicker({
  entry,
  allEntries,
  onAdd,
}: {
  entry: LogEntry
  allEntries: LogEntry[]
  onAdd: (fromId: string, reference: LogReferenceChip) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkedIds = new Set(entry.links.map((l) => l.id))
  const options = allEntries.filter((e) => e.id !== entry.id && !linkedIds.has(e.id))

  async function submit() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const data = await addLogReference(entry.id, selected)
      onAdd(entry.id, data.reference)
      setSelected('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link entry')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 font-pixel text-[6px] text-white/40 hover:text-[#F5C518] transition-colors"
        data-testid="link-entry-open"
      >
        <Link2 size={10} /> Link entry
      </button>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10" data-testid="link-entry-picker">
      <div className="flex items-center gap-2">
        <div className="ops-select-wrap flex-1">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="ops-select"
            data-testid="link-entry-select"
          >
            <option value="">— Select an entry to link —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.entryNumber} — {o.stage ?? formatDate(o.createdAt)}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="ops-select-icon" />
        </div>
        <BusyButton
          busy={busy}
          icon={<Check size={11} />}
          onClick={submit}
          disabled={!selected}
          className="ops-submit-btn"
          data-testid="link-entry-submit"
        />
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setSelected('') }}
          className="ops-ghost-btn font-pixel"
        >
          Cancel
        </button>
      </div>
      {error && (
        <div className="ops-error mt-2">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="font-pixel text-[7px]">{error}</span>
        </div>
      )}
    </div>
  )
}
