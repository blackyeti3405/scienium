'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Activity } from 'lucide-react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'

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

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/team/activity')
      if (!res.ok) throw new Error('Could not load activity')
      const data = await res.json()
      setFeed(data.feed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
    // Poll every 30 s while the panel is open
    const interval = setInterval(loadFeed, 30_000)
    return () => clearInterval(interval)
  }, [loadFeed])

  return (
    <div className="activity-panel" role="dialog" aria-label="Team activity">
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
