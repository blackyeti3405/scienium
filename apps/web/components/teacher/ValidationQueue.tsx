'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X } from 'lucide-react'

interface ValidationRequest {
  id: string
  fromPhase: string
  toPhase: string
  note: string | null
  createdAt: string
  requestedBy: { name: string }
  team: {
    id: string
    name: string
    researchIdea: string | null
    labType: string | null
    _count: { papers: number; projectLogs: number }
  }
}

const PHASE_LABEL: Record<string, string> = {
  research_planning: 'Research Plan',
  working: 'Working',
  showcase: 'Showcase',
}

export function ValidationQueue() {
  const [requests, setRequests] = useState<ValidationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/teacher/validations')
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function decide(id: string, decision: 'approve' | 'reject') {
    setBusyId(id)
    try {
      const res = await fetch('/api/teacher/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, decision, note: notes[id]?.trim() || undefined }),
      })
      if (res.ok) setRequests((list) => list.filter((r) => r.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/30" size={24} />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <p className="font-pixel text-[9px] text-white/30 py-10 text-center border border-dashed border-white/10">
        No pending validations. You’re all caught up.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <div key={r.id} className="border border-white/10 bg-[#0a1628] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">{r.team.name}</span>
            <span className="font-pixel text-[8px] text-white/45 uppercase tracking-wider">
              {PHASE_LABEL[r.fromPhase] ?? r.fromPhase} → {PHASE_LABEL[r.toPhase] ?? r.toPhase}
            </span>
          </div>

          <div className="font-pixel text-[7px] text-white/35">
            Requested by {r.requestedBy.name} · {r.team._count.papers} papers ·{' '}
            {r.team._count.projectLogs} logs
          </div>

          {r.team.researchIdea && (
            <p className="text-xs text-white/70 italic border-l-2 border-white/10 pl-3">
              “{r.team.researchIdea}”
            </p>
          )}

          <input
            value={notes[r.id] ?? ''}
            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
            placeholder="Optional note to the team…"
            maxLength={500}
            className="w-full bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decide(r.id, 'approve')}
              disabled={busyId === r.id}
              className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-emerald-500 text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <Check size={12} /> Approve
            </button>
            <button
              type="button"
              onClick={() => decide(r.id, 'reject')}
              disabled={busyId === r.id}
              className="inline-flex items-center gap-1.5 font-pixel text-[8px] border border-white/20 text-white/70 px-3 py-2 hover:border-red-400 hover:text-red-400 disabled:opacity-40 transition-all"
            >
              <X size={12} /> Request changes
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
