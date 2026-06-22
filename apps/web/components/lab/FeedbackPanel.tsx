'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, MessageSquare, Loader2, CheckCircle } from 'lucide-react'

interface FeedbackItem {
  id: string
  targetType: string
  targetId: string | null
  body: string
  resolved: boolean
  createdAt: string
  teacher: { name: string | null }
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
}

export function FeedbackPanel({ onClose, onUnresolvedCount }: FeedbackPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)

  // Escape + scroll lock, mirroring TeamPanel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/team/feedback')
      if (!res.ok) throw new Error('Could not load feedback')
      const data = await res.json()
      setItems(data.items)
      onUnresolvedCount?.(data.unresolvedCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [onUnresolvedCount])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  async function toggleResolved(item: FeedbackItem, resolved: boolean) {
    setPatching(item.id)
    // Optimistic update
    const next = items.map((i) => (i.id === item.id ? { ...i, resolved } : i))
    setItems(next)
    const newCount = next.filter((i) => !i.resolved).length
    onUnresolvedCount?.(newCount)

    try {
      const res = await fetch('/api/team/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, resolved }),
      })
      if (!res.ok) {
        // Revert on failure — functional updater avoids clobbering a concurrent item's optimistic state
        setItems((prev) => {
          const reverted = prev.map((i) => (i.id === item.id ? { ...i, resolved: !resolved } : i))
          onUnresolvedCount?.(reverted.filter((i) => !i.resolved).length)
          return reverted
        })
      }
    } catch {
      // Revert on failure — functional updater avoids clobbering a concurrent item's optimistic state
      setItems((prev) => {
        const reverted = prev.map((i) => (i.id === item.id ? { ...i, resolved: !resolved } : i))
        onUnresolvedCount?.(reverted.filter((i) => !i.resolved).length)
        return reverted
      })
    } finally {
      setPatching(null)
    }
  }

  return (
    <div
      className="feature-panel__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Teacher Feedback"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
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
          {loading && (
            <div className="flex items-center justify-center py-10 text-white/40">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}

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
                      <button
                        type="button"
                        onClick={() => toggleResolved(item, false)}
                        disabled={patching === item.id}
                        className="font-pixel text-[7px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
                      >
                        undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleResolved(item, true)}
                      disabled={patching === item.id}
                      className="self-start font-pixel text-[7px] bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] px-3 py-1.5 rounded-sm hover:bg-[#F5C518]/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {patching === item.id ? <Loader2 size={9} className="animate-spin" /> : null}
                      Mark addressed
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
