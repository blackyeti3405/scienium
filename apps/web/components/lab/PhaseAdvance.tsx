'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ArrowRight, Loader2 } from 'lucide-react'
import { PHASE_INFO } from '@/lib/phase'
import type { AdvanceProgress } from '@/lib/team/advance'

/**
 * Lab-scene affordance for the phase gate (Feature 1e). Sits just under the
 * status strip during literature_review and shows live progress toward leaving
 * it — sources uploaded and how many members are proficient on all of them.
 * Once the gate is satisfied it becomes a gold "advance" button; the server
 * re-checks the gate before bumping the phase.
 */
export function PhaseAdvance({ progress }: { progress: AdvanceProgress }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toLabel = progress.toPhase ? PHASE_INFO[progress.toPhase].label : 'next phase'

  async function advance() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/team/advance-phase', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not advance')
      // The scene (buildings, gating) is server-rendered from the phase, so refresh.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance')
      setBusy(false)
    }
  }

  return (
    <div className={`phase-advance${progress.canAdvance ? ' phase-advance--ready' : ''}`}>
      {!progress.canAdvance && <Lock size={11} className="text-white/40 shrink-0" />}
      <span className="phase-advance__progress font-pixel">
        {progress.sourceCount}/{progress.sourceTarget} sources
        <span className="phase-advance__dot">·</span>
        {progress.membersReady}/{progress.memberCount} members ready
      </span>

      {progress.canAdvance && (
        <button
          type="button"
          className="phase-advance__btn font-pixel"
          onClick={advance}
          disabled={busy}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
          Advance to {toLabel}
        </button>
      )}

      {error && <span className="phase-advance__error font-pixel">{error}</span>}
    </div>
  )
}
