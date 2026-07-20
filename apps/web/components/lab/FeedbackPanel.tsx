'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ModalBackdrop } from '@/components/ui/ModalBackdrop'
import { X, MessageSquare, CheckCircle } from 'lucide-react'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { timeAgo } from '@/components/ops/log-shared'

export interface FeedbackItem {
  id: string
  targetType: string
  targetId: string | null
  body: string
  resolved: boolean
  createdAt: string
  teacher: { name: string | null }
}

function targetLabel(targetType: string): string {
  switch (targetType) {
    case 'project_log':
      return 'On your project log'
    case 'paper':
      return 'On a paper'
    case 'showcase':
      return 'On your showcase'
    default:
      return 'To your lab'
  }
}

interface FeedbackPanelProps {
  onClose: () => void
  onUnresolvedCount?: (n: number) => void
  initialData?: { items: FeedbackItem[]; unresolvedCount: number } | null
  onDataChange?: (data: { items: FeedbackItem[]; unresolvedCount: number }) => void
}

export function FeedbackPanel({
  onClose,
  onUnresolvedCount,
  initialData,
  onDataChange,
}: FeedbackPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [items, setItems] = useState<FeedbackItem[]>(initialData?.items ?? [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)

  // Monotonic freshness token: bumped by every LOCAL mutation (optimistic
  // toggle or its revert). A load captures the token when its request STARTS
  // and drops its response if the token moved — a GET requested before the
  // user's click must never overwrite the newer optimistic state when it lands
  // late (dev StrictMode's double-mount makes this a guaranteed duplicate
  // in-flight load; on a slow network it happens in production too — the F1
  // AC5 flake).
  const stateVersionRef = useRef(0)

  const loadFeedback = useCallback(async () => {
    const startedAtVersion = stateVersionRef.current
    try {
      const res = await fetch('/api/team/feedback')
      if (!res.ok) throw new Error('Could not load feedback')
      const data = await res.json()
      if (stateVersionRef.current !== startedAtVersion) return // stale — a mutation won
      setItems(data.items)
      onUnresolvedCount?.(data.unresolvedCount)
      onDataChange?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [onDataChange, onUnresolvedCount])

  // `initialData` is a warm-start SEED only (applied via useState above). It
  // must never re-sync on prop change: LabScene's mount-time warm-up fetch can
  // resolve seconds later (dev-server compile latency) with data requested
  // BEFORE the user's latest action, and re-applying it here clobbered the
  // optimistic resolved-state right after a click (F1 AC5 flake). Once open,
  // this panel owns freshness; the parent hears about changes via onDataChange.
  useEffect(() => {
    if (!initialData) void loadFeedback()
    // Mount-only by design — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleResolved(item: FeedbackItem, resolved: boolean) {
    stateVersionRef.current++ // anything loaded before this click is now stale
    setPatching(item.id)
    // Optimistic update
    const next = items.map((i) => (i.id === item.id ? { ...i, resolved } : i))
    setItems(next)
    const newCount = next.filter((i) => !i.resolved).length
    onUnresolvedCount?.(newCount)
    onDataChange?.({ items: next, unresolvedCount: newCount })

    try {
      const res = await fetch('/api/team/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, resolved }),
      })
      if (!res.ok) {
        stateVersionRef.current++
        // Revert on failure — functional updater avoids clobbering a concurrent item's optimistic state
        setItems((prev) => {
          const reverted = prev.map((i) => (i.id === item.id ? { ...i, resolved: !resolved } : i))
          const count = reverted.filter((i) => !i.resolved).length
          onUnresolvedCount?.(count)
          onDataChange?.({ items: reverted, unresolvedCount: count })
          return reverted
        })
      }
    } catch {
      stateVersionRef.current++
      // Revert on failure — functional updater avoids clobbering a concurrent item's optimistic state
      setItems((prev) => {
        const reverted = prev.map((i) => (i.id === item.id ? { ...i, resolved: !resolved } : i))
        const count = reverted.filter((i) => !i.resolved).length
        onUnresolvedCount?.(count)
        onDataChange?.({ items: reverted, unresolvedCount: count })
        return reverted
      })
    } finally {
      setPatching(null)
    }
  }

  return (
    <ModalBackdrop label="Teacher Feedback" onClose={onClose} initialFocusRef={closeRef}>
      <div className="flex flex-col w-[min(480px,94vw)] max-h-[80vh] bg-[#0d1b2e] text-white border-[3px] border-[#2a3048] rounded-[4px] overflow-hidden shadow-[0_0_0_3px_#10131f,0_18px_60px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b-[3px] border-[#2a3048] bg-[#0f1320] shrink-0">
          <span className="font-pixel text-[10px] text-[#e8ecfb] flex items-center gap-2">
            <MessageSquare size={12} className="text-[#F5C518]" />
            Teacher Feedback
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && <PanelListSkeleton rows={4} className="p-5" />}

          {error && (
            <p className="font-pixel text-[8px] text-red-400 text-center py-6">{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="font-pixel text-[8px] text-white/30 text-center py-10 px-6">
              No feedback from your teacher yet.
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.id}
                  data-feedback-id={item.id}
                  className={`flex flex-col gap-2 px-5 py-4 border-b border-white/[0.06] transition-colors ${
                    item.resolved ? 'opacity-50' : ''
                  }`}
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-pixel text-[8px] text-[#F5C518]">
                      {item.teacher.name ?? 'Your teacher'}
                    </span>
                    <span className="font-pixel text-[7px] text-white/30">·</span>
                    <span className="font-pixel text-[7px] text-white/30">
                      {timeAgo(item.createdAt)}
                    </span>
                    <span className="font-pixel text-[7px] text-white/30">·</span>
                    <span className="font-pixel text-[7px] text-[#7ff2e3]/60">
                      {targetLabel(item.targetType)}
                    </span>
                  </div>

                  {/* Body text — regular font per house rules */}
                  <p className="text-sm text-white/85 leading-relaxed">{item.body}</p>

                  {/* Action */}
                  {item.resolved ? (
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[7px] text-[#7fff8a] flex items-center gap-1">
                        <CheckCircle size={10} />
                        Addressed
                      </span>
                      <BusyButton
                        busy={patching === item.id}
                        showSpinner={false}
                        onClick={() => toggleResolved(item, false)}
                        className="font-pixel text-[7px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
                      >
                        undo
                      </BusyButton>
                    </div>
                  ) : (
                    <BusyButton
                      busy={patching === item.id}
                      onClick={() => toggleResolved(item, true)}
                      className="self-start font-pixel text-[7px] bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] px-3 py-1.5 rounded-sm hover:bg-[#F5C518]/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      Mark addressed
                    </BusyButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalBackdrop>
  )
}
