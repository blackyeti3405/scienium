'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'

/**
 * Un-enrol a student from the teacher's class (REFACTOR2 P1-R8, class half).
 *
 * Deliberately here and not on the roster row. The roster row is a `<Link>` to
 * this page, so a destructive control inside it would be a nested interactive
 * element — and, more to the point, removing a student is not a thing to do in
 * passing from a list. It also states its consequence before it happens, which
 * is the same rule the team-panel leave flow follows: the teacher loses access
 * to this student's work, because their visibility is derived from the class.
 */
export function RemoveFromClass({
  studentId,
  studentName,
  className,
}: {
  studentId: string
  studentName: string
  className: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/class/students/${studentId}`, { method: 'DELETE' })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not remove that student')
      // The student is no longer in scope, so this page is no longer viewable.
      router.push('/teacher')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that student')
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        data-testid="remove-from-class"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-red-300 border border-white/10 hover:border-red-400/40 rounded-full px-2.5 py-1 transition-colors"
      >
        <UserMinus size={12} /> Remove from class
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-orange-300/90 leading-relaxed max-w-prose">
        Remove <span className="font-medium">{studentName}</span> from{' '}
        <span className="font-medium">{className}</span>? They keep their lab and all of their
        work — but they leave your roster, and you lose access to their pages until they join a
        class of yours again.
      </p>
      <div className="flex items-center gap-2">
        <BusyButton
          busy={busy}
          busyLabel="Removing…"
          icon={<UserMinus size={12} />}
          onClick={remove}
          data-testid="remove-from-class-confirm"
          className="inline-flex items-center gap-1.5 text-xs bg-red-500/80 text-white rounded-full px-3 py-1 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          Confirm removal
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
