'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, Clock } from 'lucide-react'
import { PHASE_INFO, type Phase } from '@/lib/phase'

/**
 * Student-facing affordance for the teacher-gated transitions (research_planning →
 * working, working → showcase). Posting to /api/team/advance-phase creates a
 * PhaseAdvanceRequest the teacher reviews in their dashboard. Once pending, it
 * shows an awaiting state; the team advances when the teacher approves.
 */
export function RequestAdvance({
  toPhase,
  pending: initialPending,
}: {
  toPhase: Phase
  pending: boolean
}) {
  const [pending, setPending] = useState(initialPending)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function request() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/team/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setPending(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const label = PHASE_INFO[toPhase].label

  return (
    <div className="phase-advance">
      {pending ? (
        <span className="phase-advance__progress font-pixel" style={{ color: '#ffcf66' }}>
          <Clock size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
          Awaiting teacher validation to enter {label}
        </span>
      ) : (
        <>
          <span className="phase-advance__progress font-pixel">
            Ready for {label}? Ask your teacher to validate your progress.
          </span>
          <button
            type="button"
            className="phase-advance__btn font-pixel"
            onClick={request}
            disabled={busy}
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
            )}
            Request validation
          </button>
          {error && <span className="font-pixel text-[8px] text-red-400">{error}</span>}
        </>
      )}
    </div>
  )
}
