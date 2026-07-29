'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { DecisionControls, QueueNotice, useDecisionQueue } from './DecisionControls'
import { FlaggedShowcases, type FlaggedShowcase } from './FlaggedShowcases'

interface PendingAsset {
  id: string
  assetType: string
  url: string | null
  kind?: 'pdf' | 'image'
  metadata: { url?: string; label?: string } | null
}

interface PendingShowcase {
  id: string
  slug: string
  shortTitle: string
  title: string
  abstract: string
  lastEditedAt: string
  /** The exact revision being reviewed — echoed back with the decision. */
  contentDigest: string
  previewUrl: string
  assets: PendingAsset[]
  team: { name: string; labType: string | null }
}

const REQUIRED_ASSETS: { type: string; label: string }[] = [
  { type: 'board', label: 'Board PDF' },
  { type: 'quad_chart', label: 'Quad chart' },
  { type: 'video', label: 'Project video' },
]

/** Direct link to one asset — the uploaded bytes, or the pasted external link. */
function assetHref(a: PendingAsset): string | null {
  return a.url ?? a.metadata?.url ?? null
}

export function ShowcaseModerationQueue() {
  const [showcases, setShowcases] = useState<PendingShowcase[]>([])
  const [flagged, setFlagged] = useState<FlaggedShowcase[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const queue = useDecisionQueue((id) => setShowcases((list) => list.filter((s) => s.id !== id)))

  // One fetch serves both sections — the endpoint returns the pending queue and
  // the reported/taken-down list together, so a takedown re-reads both.
  const load = useCallback(() => {
    return fetch('/api/teacher/showcase-moderation')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((d) => {
        setShowcases(d.showcases ?? [])
        setFlagged(d.flagged ?? [])
      })
      .catch(() => setLoadError('Could not load pending submissions. Try refreshing the page.'))
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return <PanelListSkeleton rows={3} />
  }

  if (loadError) {
    return <QueueNotice tone="error">{loadError}</QueueNotice>
  }

  return (
    <div className="space-y-8">
      {/* Reported / taken-down first (REFACTOR2 P1-6): a live page someone has
          objected to outranks one still waiting to go live. Hidden entirely
          when there is nothing — the pending queue is the everyday view. */}
      {flagged.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-pixel text-[10px] text-[#F5C518]">Reported &amp; taken down</h2>
          <FlaggedShowcases flagged={flagged} onChanged={load} />
        </section>
      )}

      {showcases.length === 0 ? (
        <QueueNotice>No pending showcase submissions. You&apos;re all caught up.</QueueNotice>
      ) : (
        <div className="space-y-4">
          {showcases.map((s) => (
            <div key={s.id} className="border border-white/10 bg-[#0a1628] p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-white font-medium">{s.team.name}</span>
                <a
                  href={s.previewUrl}
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
                  <p className="font-pixel text-[7px] text-white/40 mt-0.5 leading-relaxed">{s.title}</p>
                )}
              </div>

              {s.abstract && (
                <p className="text-xs text-white/60 line-clamp-3 italic border-l-2 border-white/10 pl-3">
                  &ldquo;{s.abstract}&rdquo;
                </p>
              )}

              {/* Every required asset, openable (P0-R3). A reviewer must never be
                  asked to approve a board, quad chart, or video they cannot see. */}
              <div className="flex flex-wrap gap-2">
                {REQUIRED_ASSETS.map(({ type, label }) => {
                  const asset = s.assets.find((a) => a.assetType === type)
                  const href = asset ? assetHref(asset) : null
                  return href ? (
                    <a
                      key={type}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-pixel text-[7px] border border-[#F5C518]/30 bg-[#F5C518]/[0.08] text-[#F5C518]/80 px-2 py-1 hover:border-[#F5C518]/60 transition-colors"
                    >
                      <ExternalLink size={9} /> {label}
                    </a>
                  ) : (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 font-pixel text-[7px] border border-red-400/30 text-red-400/80 px-2 py-1"
                    >
                      {label} missing
                    </span>
                  )
                })}
              </div>

              <div className="font-pixel text-[7px] text-white/40">
                {s.team.labType && <span className="uppercase mr-2">{s.team.labType.replace('_', ' ')}</span>}
                Last edited {new Date(s.lastEditedAt).toLocaleDateString()}
              </div>

              <DecisionControls id={s.id} digest={s.contentDigest} queue={queue} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
