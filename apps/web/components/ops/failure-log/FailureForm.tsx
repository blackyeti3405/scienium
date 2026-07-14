'use client'

import { useState } from 'react'
import { AlertTriangle, X, Check } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { SectionLabel } from '../log-shared'
import type { FailureEntry, SavedFailureEntry } from './types'
import { saveFailureEntry } from './api'

export function FailureForm({
  entry,
  onSaved,
  onCancel,
}: {
  entry?: FailureEntry
  onSaved: (entry: SavedFailureEntry, mode: 'create' | 'edit') => void
  onCancel?: () => void
}) {
  const isEdit = !!entry
  const [happened, setHappened] = useState(entry?.happened ?? '')
  const [learned, setLearned] = useState(entry?.learned ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const h = happened.trim(), l = learned.trim()
    if (!h || !l) { setError('Both fields are required.'); return }
    setBusy(true)
    setError(null)
    try {
      const data = await saveFailureEntry({ happened: h, learned: l }, isEdit ? entry!.id : undefined)
      onSaved(data.entry, isEdit ? 'edit' : 'create')
      if (!isEdit) { setHappened(''); setLearned('') }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ops-entry-card">
      <div className="ops-entry-card__head">
        <span className="ops-entry-card__badge ops-entry-card__badge--failure font-pixel">
          <AlertTriangle size={12} />
        </span>
        <div className="flex flex-col">
          <span className="font-pixel text-[9px] text-white">{isEdit ? 'Editing failure' : 'Log a failure'}</span>
          <span className="font-pixel text-[6px] text-white/35 mt-0.5">Every setback is data — document it</span>
        </div>
        {isEdit && onCancel && (
          <button onClick={onCancel} className="ops-entry-card__cancel font-pixel" title="Cancel edit">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="ops-entry-card__body">
        <div className="ops-field">
          <SectionLabel required>What failed or didn&apos;t go as expected?</SectionLabel>
          <textarea
            value={happened}
            onChange={(e) => setHappened(e.target.value)}
            rows={3}
            placeholder="Be specific about conditions and what you expected vs. what happened."
            className="ops-textarea"
          />
        </div>
        <div className="ops-field">
          <SectionLabel required>What did you learn from it?</SectionLabel>
          <textarea
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
            rows={3}
            placeholder="What will you try differently? What does this tell you about your hypothesis or design?"
            className="ops-textarea"
          />
        </div>
        {error && (
          <div className="ops-error">
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-pixel text-[7px]">{error}</span>
          </div>
        )}
      </div>

      <div className="ops-entry-card__foot">
        {isEdit && onCancel && (
          <button onClick={onCancel} className="ops-ghost-btn font-pixel">Cancel</button>
        )}
        <BusyButton
          busy={busy}
          busyLabel="Saving…"
          icon={isEdit ? <Check size={11} /> : <AlertTriangle size={11} />}
          onClick={submit}
          className="ops-submit-btn"
        >
          {isEdit ? 'Save changes' : 'Log failure'}
        </BusyButton>
      </div>
    </div>
  )
}
