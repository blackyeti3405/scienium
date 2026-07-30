'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Sparkles } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { ApiError } from '@/lib/api/client'
import type { FailureEntry } from './types'
import { answerFollowup, generateFollowup } from './api'

export function FailureFollowup({
  entry,
  onUpdated,
}: {
  entry: FailureEntry
  onUpdated: (updated: FailureEntry) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleDigDeeper() {
    setGenerating(true)
    setGenError(null)
    try {
      const data = await generateFollowup(entry.id)
      onUpdated({ ...entry, followup: data.followup })
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : 'Network error — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveAnswer() {
    if (!answerText.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await answerFollowup(entry.id, answerText.trim())
      onUpdated({ ...entry, followup: data.followup })
      setAnswerText('')
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const { followup } = entry

  // State A: no follow-up yet — show "Dig deeper" button, or a Vega labeled
  // loader in its place once clicked (this is a 5-30s LLM wait, undersold by
  // a tiny button spinner).
  if (!followup) {
    if (generating) {
      return (
        <div className="mt-3 pt-3 border-t border-white/10">
          <LabeledLoader
            tone="vega"
            fill="inline"
            label="Vega is thinking about this failure…"
            icon={<Sparkles size={16} className="text-[#7ff2e3] animate-pulse" />}
            className="py-2"
          />
        </div>
      )
    }
    return (
      <div className="mt-3 pt-3 border-t border-white/10">
        {genError && (
          <div className="ops-error mb-2">
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-pixel text-[7px]">{genError}</span>
          </div>
        )}
        <button
          onClick={handleDigDeeper}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#F5C518]/40 bg-[#F5C518]/5 text-[#F5C518] font-pixel text-[7px] hover:bg-[#F5C518]/15 transition-colors"
        >
          <Sparkles size={11} className="shrink-0" />
          Dig deeper
        </button>
      </div>
    )
  }

  // State B: question generated but not yet answered — show question + answer textarea.
  if (followup.response === null) {
    return (
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="font-pixel text-[6px] text-[#F5C518]/60 uppercase tracking-widest mb-1">Mentor asks</p>
        <p className="text-sm text-white/80 leading-relaxed mb-3 italic">{followup.question}</p>
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          rows={3}
          placeholder="Your reflection…"
          className="ops-textarea mb-2"
        />
        {saveError && (
          <div className="ops-error mb-2">
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-pixel text-[7px]">{saveError}</span>
          </div>
        )}
        <BusyButton
          busy={saving}
          busyLabel="Saving…"
          icon={<Check size={11} />}
          onClick={handleSaveAnswer}
          disabled={!answerText.trim()}
          className="ops-submit-btn"
        >
          Save
        </BusyButton>
      </div>
    )
  }

  // State C: answered — render question + answer read-only.
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="font-pixel text-[6px] text-[#F5C518]/60 uppercase tracking-widest mb-1">Mentor asks</p>
      <p className="text-sm text-white/80 leading-relaxed mb-3 italic">{followup.question}</p>
      <div className="ops-nextsteps">
        <span className="ops-nextsteps__label font-pixel">My reflection</span>
        <p className="text-sm text-[#F5C518]/80 leading-relaxed mt-1">{followup.response}</p>
      </div>
    </div>
  )
}
