'use client'

import { useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'

interface DataRequestRow {
  id: string
  kind: string
  status: string
  createdAt: string
  completedAt: string | null
}

/**
 * "Your data" — the student-facing half of REFACTOR2 P1-R9.
 *
 * Two asks: a copy of your data, or its erasure. Neither happens here. Both
 * queue a durable request an operator reviews, and the copy states plainly that
 * it is delivered through the school rather than downloaded from this page —
 * because an export bundle is the densest personal artifact this system can
 * produce and it must never leave through an unverified channel.
 *
 * Erasure is two-step: the button asks, and only the second click files. There
 * is no server-issued proposal token here (unlike the shared-work deletions in
 * `lib/api/destructive-proposal.ts`) because filing destroys nothing — the
 * operator's approval is the real gate, and it lives outside the app.
 */
export function MyDataSection() {
  const [rows, setRows] = useState<DataRequestRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    fetch('/api/data-requests')
      .then((r) => r.json())
      .then((d: { requests?: DataRequestRow[]; error?: string }) => {
        if (d.error) throw new Error(d.error)
        setRows(d.requests ?? [])
      })
      .catch(() => setRows([]))
  }, [])

  async function file(kind: 'export' | 'delete') {
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch('/api/data-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not file the request')
      setRows((prev) => [d.request, ...(prev ?? []).filter((r) => r.id !== d.request.id)])
      setConfirmingDelete(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not file the request')
    } finally {
      setBusy(null)
    }
  }

  if (rows === null) {
    return (
      <div className="flex flex-col gap-4" data-testid="settings-data-skeleton">
        <PixelSkeleton variant="line" h="h-4" w="w-24" />
        <PixelSkeleton variant="box" h="h-9" w="w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="settings-data-section">
      <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest border-b border-white/10 pb-2">
        Your data
      </h3>

      <p className="font-pixel text-[7px] text-white/40 leading-loose">
        Your teacher reviews these requests. A copy is delivered through your school, not
        downloaded here. Your lab&rsquo;s shared work — papers, logs, the showcase — stays with
        your team either way.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <BusyButton
          busy={busy === 'export'}
          busyLabel="Requesting…"
          icon={<Download size={11} />}
          onClick={() => file('export')}
          className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2"
        >
          Request a copy
        </BusyButton>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <BusyButton
              busy={busy === 'delete'}
              busyLabel="Requesting…"
              icon={<Trash2 size={11} />}
              onClick={() => file('delete')}
              className="font-pixel text-[8px] bg-red-500/80 text-white px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              Confirm deletion request
            </BusyButton>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="font-pixel text-[7px] text-white/40 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="font-pixel text-[7px] text-white/40 hover:text-white/70 border border-white/15 rounded-sm px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={10} /> Request deletion
          </button>
        )}
      </div>

      {confirmingDelete && (
        <p className="font-pixel text-[7px] text-orange-300 leading-loose">
          This asks your teacher to erase your account and everything personal in it — quizzes,
          proficiencies, vocabulary, chats, notifications. It cannot be undone once they approve.
        </p>
      )}

      {error && <p className="font-pixel text-[7px] text-red-400 leading-loose">{error}</p>}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="font-pixel text-[7px] text-white/60 uppercase tracking-widest">
                {r.kind === 'delete' ? 'Deletion' : 'Copy'} ·{' '}
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              <span
                className={`font-pixel text-[7px] uppercase tracking-widest ${
                  r.status === 'completed'
                    ? 'text-green-400'
                    : r.status === 'rejected' || r.status === 'failed'
                      ? 'text-red-400'
                      : 'text-white/40'
                }`}
              >
                {r.status === 'requested' ? 'awaiting review' : r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
