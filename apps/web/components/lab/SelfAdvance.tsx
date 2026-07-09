'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { PHASE_INFO, type Phase } from '@/lib/phase'
import { BusyButton } from '@/components/ui/BusyButton'

/**
 * Student-facing self-advance affordance for the self-paced transitions
 * (research_planning → working, working → showcase). Posting to
 * /api/team/advance-phase bumps the phase immediately — no gate, no teacher
 * sign-off — and the scene refreshes to reflect the newly unlocked buildings.
 */
export function SelfAdvance({ toPhase }: { toPhase: Phase }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function advance() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/team/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not advance')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const label = PHASE_INFO[toPhase].label

  return (
    <div className="phase-advance">
      <span className="phase-advance__progress font-pixel">Ready for the {label} phase?</span>
      <BusyButton
        busy={busy}
        busyLabel="Advancing…"
        icon={
          <ArrowRight size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
        }
        onClick={advance}
        className="phase-advance__btn font-pixel"
      >
        Advance to {label}
      </BusyButton>
      {error && <span className="font-pixel text-[8px] text-red-400">{error}</span>}
    </div>
  )
}
