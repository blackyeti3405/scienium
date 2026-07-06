'use client'

import { useState, useEffect } from 'react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { DecisionControls, QueueNotice, useDecisionQueue } from './DecisionControls'

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const queue = useDecisionQueue('/api/teacher/validations', 'requestId', (id) =>
    setRequests((list) => list.filter((r) => r.id !== id)),
  )

  useEffect(() => {
    fetch('/api/teacher/validations')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((d) => setRequests(d.requests ?? []))
      .catch(() => setLoadError('Could not load pending validations. Try refreshing the page.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <PanelListSkeleton rows={3} />
  }

  if (loadError) {
    return <QueueNotice tone="error">{loadError}</QueueNotice>
  }

  if (requests.length === 0) {
    return <QueueNotice>No pending validations. You’re all caught up.</QueueNotice>
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

          <DecisionControls id={r.id} queue={queue} />
        </div>
      ))}
    </div>
  )
}
