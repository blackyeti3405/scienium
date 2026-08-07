'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { PHASE_ORDER, PHASE_INFO, type Phase } from '@/lib/phase'

/**
 * Teacher-initiated phase advance — the lever that answers teacher pacing.
 *
 * A lab whose members are in a class does not pace itself: `POST
 * /api/team/advance-phase` refuses it with `teacherPaced: true`, because a room
 * moves together. That refusal is only fair if someone can move it, and this is
 * that someone. Without this control a classroom lab has no way forward at all.
 *
 * Same shape as its siblings (`MakeLabLead`, `RemoveFromClass`): state the
 * consequence, then act. It is deliberately two-click — this changes what an
 * entire lab can see, for students who are not looking at the screen.
 */
export function AdvancePhase({
  studentId,
  teamName,
  phase,
}: {
  studentId: string
  teamName: string
  phase: Phase
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1] as Phase | undefined
  // Already at the end of the arc — nothing to advance to.
  if (!next) return null

  async function advance() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/student/${studentId}/advance`, { method: 'POST' })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error ?? 'Could not advance the lab')
      setConfirming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance the lab')
    } finally {
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        data-testid="advance-phase"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[#F5C518] border border-white/10 hover:border-[#F5C518]/40 rounded-full px-2.5 py-1 transition-colors"
      >
        <ArrowRight size={12} /> Advance to {PHASE_INFO[next].label}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[#F5C518]/90 leading-relaxed max-w-prose">
        Move <span className="font-medium">{teamName}</span> from{' '}
        <span className="font-medium">{PHASE_INFO[phase].label}</span> to{' '}
        <span className="font-medium">{PHASE_INFO[next].label}</span>? This unlocks new buildings
        for everyone in the lab and cannot be undone from here. Nobody is notified; tell them
        yourself.
      </p>
      <div className="flex items-center gap-2">
        <BusyButton
          busy={busy}
          busyLabel="Advancing…"
          icon={<ArrowRight size={12} />}
          onClick={advance}
          data-testid="advance-phase-confirm"
          className="inline-flex items-center gap-1.5 text-xs bg-[#F5C518] text-[#0a1628] font-medium rounded-full px-3 py-1 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          Confirm
        </BusyButton>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
