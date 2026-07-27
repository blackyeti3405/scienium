'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, FlaskConical } from 'lucide-react'
import type { AdvanceProgress } from '@/lib/team/advance'
import { BusyButton } from '@/components/ui/BusyButton'

/**
 * Phase-gate affordance shown below the status strip during literature_review.
 * Shows live progress toward leaving the phase.
 *
 * When the gate is satisfied:
 *   - Prompts the student for a one-sentence research idea
 *   - Submits to advance-phase which classifies the lab type via Haiku
 *   - Briefly shows the assigned lab type, then refreshes
 */
export function PhaseAdvance({ progress }: { progress: AdvanceProgress }) {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ labTypeLabel: string; rationale: string } | null>(null)

  async function advance() {
    if (!idea.trim()) {
      setError('Please describe your research idea first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/team/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchIdea: idea.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not advance')
      setResult({ labTypeLabel: data.labTypeLabel, rationale: data.rationale })
      // Short pause so the student can see their assigned lab type before refresh.
      setTimeout(() => router.refresh(), 2200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance')
      setBusy(false)
    }
  }

  return (
    <div className={`phase-advance${progress.canAdvance ? ' phase-advance--ready' : ''}`}>
      {!progress.canAdvance && <Lock size={11} className="text-white/40 shrink-0" />}

      {progress.canAdvance && !result && (
        <div className="phase-advance__idea-form">
          <label className="phase-advance__idea-label font-pixel" htmlFor="research-idea">
            Lit review complete — describe your project in one sentence:
          </label>
          <div className="phase-advance__idea-row">
            <input
              id="research-idea"
              type="text"
              className="phase-advance__idea-input font-pixel"
              placeholder="e.g. I'm investigating how soil pH affects plant growth rate…"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && advance()}
              maxLength={500}
              disabled={busy}
            />
            <BusyButton
              busy={busy}
              busyLabel="Classifying…"
              icon={<FlaskConical size={11} />}
              spinnerTone="vega"
              onClick={advance}
              disabled={!idea.trim()}
              className="phase-advance__btn font-pixel"
            >
              Submit
            </BusyButton>
          </div>
        </div>
      )}

      {result && (
        <div className="phase-advance__result font-pixel">
          <FlaskConical size={11} className="shrink-0" />
          <span>
            Lab assigned: <strong>{result.labTypeLabel}</strong> — {result.rationale}
          </span>
        </div>
      )}

      {error && <span className="phase-advance__error font-pixel">{error}</span>}
    </div>
  )
}
