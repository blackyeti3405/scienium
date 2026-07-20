'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { DecisionControls, QueueNotice, useDecisionQueue } from './DecisionControls'

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const queue = useDecisionQueue((id) => setShowcases((list) => list.filter((s) => s.id !== id)))

  useEffect(() => {
    fetch('/api/teacher/showcase-moderation')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((d) => setShowcases(d.showcases ?? []))
      .catch(() => setLoadError('Could not load pending submissions. Try refreshing the page.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <PanelListSkeleton rows={3} />
  }

  if (loadError) {
    return <QueueNotice tone="error">{loadError}</QueueNotice>
  }

  if (showcases.length === 0) {
    return <QueueNotice>No pending showcase submissions. You&apos;re all caught up.</QueueNotice>
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

          <DecisionControls id={s.id} queue={queue} />
        </div>
      ))}
    </div>
  )
}
