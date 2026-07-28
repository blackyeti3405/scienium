'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Activity } from 'lucide-react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { useModalA11y } from '@/components/ui/useModalA11y'

interface FeedEntry {
  id: string
  actor: string
  action: string
  description: string
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ActivityPanel({ onClose }: { onClose: () => void }) {
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A 30 s poll with no guard can overlap on a slow connection and let an OLDER
  // response land last, so the feed jumps backwards (§0.9 Row C1). One boolean
  // is enough: a skipped tick costs 30 s of staleness, an out-of-order one
  // costs correctness.
  const inFlightRef = useRef(false)

  const loadFeed = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch('/api/team/activity')
      if (!res.ok) throw new Error('Could not load activity')
      const data = await res.json()
      setFeed(data.feed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
    // Poll every 30 s while the panel is open
    const interval = setInterval(loadFeed, 30_000)
    return () => clearInterval(interval)
  }, [loadFeed])

  // Escape, focus trap and focus restore, via the shared primitive — this was
  // a `role="dialog"` with none of the three (§0.9 Row A). It has no backdrop
  // by design (LabScene renders it as a bare fixed column) but it IS exclusive
  // via the Overlay union, so `aria-modal` is honest.
  const containerRef = useModalA11y({ onClose })

  return (
    <div ref={containerRef} className="activity-panel" role="dialog" aria-modal="true" aria-label="Team activity">
      <div className="activity-panel__header">
        <span className="font-pixel activity-panel__title">
          <Activity size={12} /> Activity
        </span>
        <button
          type="button"
          className="activity-panel__close"
          onClick={onClose}
          aria-label="Close activity"
        >
          <X size={14} />
        </button>
      </div>

      <div className="activity-panel__body">
        {loading && <PanelListSkeleton rows={5} className="p-3" />}

        {error && (
          <p className="activity-panel__empty font-pixel" style={{ color: '#ff6b6b' }}>
            {error}
          </p>
        )}

        {!loading && !error && feed.length === 0 && (
          <p className="activity-panel__empty font-pixel">No activity yet.</p>
        )}

        {!loading &&
          feed.map((entry) => (
            <div key={entry.id} className="activity-panel__entry">
              <div className="activity-panel__avatar font-pixel">
                {entry.actor.charAt(0).toUpperCase()}
              </div>
              <div className="activity-panel__text">
                <span className="activity-panel__actor font-pixel">{entry.actor}</span>
                <span className="activity-panel__desc"> {entry.description}</span>
              </div>
              <span className="activity-panel__time font-pixel">{timeAgo(entry.createdAt)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
