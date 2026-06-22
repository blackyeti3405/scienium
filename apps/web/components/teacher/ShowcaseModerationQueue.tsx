'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, ExternalLink } from 'lucide-react'

interface PendingShowcase {
  id: string
  slug: string
  shortTitle: string
  title: string
  abstract: string
  lastEditedAt: string
  team: { name: string; labType: string | null }
}

export function ShowcaseModerationQueue() {
  const [showcases, setShowcases] = useState<PendingShowcase[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/teacher/showcase-moderation')
      .then((r) => r.json())
      .then((d) => setShowcases(d.showcases ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function decide(id: string, decision: 'approve' | 'reject') {
    setBusyId(id)
    try {
      const res = await fetch('/api/teacher/showcase-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcaseId: id, decision, note: notes[id]?.trim() || undefined }),
      })
      if (res.ok) setShowcases((list) => list.filter((s) => s.id !== id))
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

  if (showcases.length === 0) {
    return (
      <p className="font-pixel text-[9px] text-white/30 py-10 text-center border border-dashed border-white/10">
        No pending showcase submissions. You&apos;re all caught up.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {showcases.map((s) => (
        <div key={s.id} className="border border-white/10 bg-[#0a1628] p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white font-medium">{s.team.name}</span>
            <a
              href={`/showcase/${s.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-pixel text-[8px] text-[#F5C518]/70 hover:text-[#F5C518] transition-colors"
            >
              <ExternalLink size={10} /> View submission
            </a>
          </div>

          <div>
            <p className="text-xs text-white font-medium">{s.shortTitle || s.title}</p>
            {s.shortTitle && (
              <p className="font-pixel text-[7px] text-white/35 mt-0.5 leading-relaxed">{s.title}</p>
            )}
          </div>

          {s.abstract && (
            <p className="text-xs text-white/60 line-clamp-3 italic border-l-2 border-white/10 pl-3">
              &ldquo;{s.abstract}&rdquo;
            </p>
          )}

          <div className="font-pixel text-[7px] text-white/35">
            {s.team.labType && <span className="uppercase mr-2">{s.team.labType.replace('_', ' ')}</span>}
            Last edited {new Date(s.lastEditedAt).toLocaleDateString()}
          </div>

          <input
            value={notes[s.id] ?? ''}
            onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
            placeholder="Optional note to the team…"
            maxLength={500}
            className="w-full bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decide(s.id, 'approve')}
              disabled={busyId === s.id}
              className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-emerald-500 text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <Check size={12} /> Approve
            </button>
            <button
              type="button"
              onClick={() => decide(s.id, 'reject')}
              disabled={busyId === s.id}
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
