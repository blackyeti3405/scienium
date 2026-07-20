'use client'

import { useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'

export type QueueDecision = 'approve' | 'reject'

// Only one teacher review queue exists today (showcase moderation) — the
// endpoint/payload key are fixed here rather than parameterized for queues
// that don't exist yet.
const ENDPOINT = '/api/teacher/showcase-moderation'
const PAYLOAD_KEY = 'showcaseId'

/**
 * Shared decide flow for the showcase moderation queue: POST
 * `{ showcaseId: id, decision, note }`, remove the card on success, show an
 * inline error on failure.
 *
 * Busy state records WHICH decision is in flight so only the clicked button
 * relabels ("Approving…" vs "Requesting…") — never both. A single error slot
 * suffices because the whole queue locks while a decision is in flight.
 */
export function useDecisionQueue(onDecided: (id: string) => void) {
  const [busy, setBusy] = useState<{ id: string; decision: QueueDecision } | null>(null)
  const [decideError, setDecideError] = useState<{ id: string; message: string } | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  function setNote(id: string, note: string) {
    setNotes((n) => ({ ...n, [id]: note }))
  }

  async function decide(id: string, decision: QueueDecision) {
    setBusy({ id, decision })
    setDecideError(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [PAYLOAD_KEY]: id, decision, note: notes[id]?.trim() || undefined }),
      })
      if (res.ok) {
        onDecided(id)
      } else {
        setDecideError({ id, message: 'Could not save this decision — try again.' })
      }
    } catch {
      setDecideError({ id, message: 'Could not save this decision — try again.' })
    } finally {
      setBusy(null)
    }
  }

  return { busy, decideError, notes, setNote, decide }
}

/** Note input + Approve / Request-changes button row for one queue card. */
export function DecisionControls({
  id,
  queue,
}: {
  id: string
  queue: ReturnType<typeof useDecisionQueue>
}) {
  const { busy, decideError, notes, setNote, decide } = queue
  return (
    <>
      <input
        value={notes[id] ?? ''}
        onChange={(e) => setNote(id, e.target.value)}
        placeholder="Optional note to the team…"
        maxLength={500}
        className="w-full bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
      />
      <div className="flex gap-2 items-center flex-wrap">
        <BusyButton
          busy={busy?.id === id && busy.decision === 'approve'}
          busyLabel="Approving…"
          icon={<Check size={12} />}
          disabled={busy !== null}
          onClick={() => decide(id, 'approve')}
          className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-emerald-500 text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          Approve
        </BusyButton>
        <BusyButton
          busy={busy?.id === id && busy.decision === 'reject'}
          busyLabel="Requesting…"
          icon={<X size={12} />}
          disabled={busy !== null}
          onClick={() => decide(id, 'reject')}
          className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-white/20 text-white/70 px-3 py-2 hover:border-red-400 hover:text-red-400 disabled:opacity-40 transition-all"
        >
          Request changes
        </BusyButton>
        {decideError?.id === id && (
          <span className="font-pixel text-[7px] text-red-400">{decideError.message}</span>
        )}
      </div>
    </>
  )
}

/** Dashed-border full-width notice used for the queues' error and empty states. */
export function QueueNotice({
  tone = 'muted',
  children,
}: {
  tone?: 'muted' | 'error'
  children: ReactNode
}) {
  return (
    <p
      className={`font-pixel text-[9px] py-10 text-center border border-dashed ${
        tone === 'error' ? 'text-red-400 border-red-400/25' : 'text-white/30 border-white/10'
      }`}
    >
      {children}
    </p>
  )
}
