'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'

/**
 * Teacher-initiated lead reassignment (REFACTOR2 P1-R8).
 *
 * The team half shipped "the lead may hand over" and deliberately stopped
 * there, which left the motivating case unserved: a lead who has stopped
 * showing up leaves their team unable to remove members, hand over, or manage
 * invites, and the only remedy was for that lead to act.
 *
 * Same shape as `RemoveFromClass` — states its consequence, then acts. This one
 * is not destructive, but it does take a role away from a student who is not
 * looking at the screen, so it is not a one-click either.
 */
export function MakeLabLead({
  studentId,
  studentName,
  currentLeadName,
}: {
  studentId: string
  studentName: string
  currentLeadName: string | null
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reassign() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/student/${studentId}/lead`, { method: 'POST' })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error ?? 'Could not reassign the lead')
      setConfirming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reassign the lead')
    } finally {
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        data-testid="make-lab-lead"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[#F5C518] border border-white/10 hover:border-[#F5C518]/40 rounded-full px-2.5 py-1 transition-colors"
      >
        <Crown size={12} /> Make lab lead
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[#F5C518]/90 leading-relaxed max-w-prose">
        Make <span className="font-medium">{studentName}</span> the lead of this lab?
        {currentLeadName && (
          <>
            {' '}
            <span className="font-medium">{currentLeadName}</span> becomes a regular member and
            loses the lead-only controls — inviting, removing members, and handing over.
          </>
        )}{' '}
        Nobody is notified; tell them yourself.
      </p>
      <div className="flex items-center gap-2">
        <BusyButton
          busy={busy}
          busyLabel="Reassigning…"
          icon={<Crown size={12} />}
          onClick={reassign}
          data-testid="make-lab-lead-confirm"
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
