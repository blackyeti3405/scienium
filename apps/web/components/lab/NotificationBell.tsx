'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}

/** Poll cadence for the bell. In-app is the primary channel (email is opt-in). */
const POLL_MS = 60_000

type KindMeta = { icon: string; accent: string; label: string }

const KIND_META: Record<string, KindMeta> = {
  fair_deadline: { icon: '📅', accent: '#f5c518', label: 'Deadline' },
  urgency: { icon: '⚠', accent: '#ff9f43', label: 'Nudge' },
  teacher_feedback: { icon: '💬', accent: '#5ac8fa', label: 'Feedback' },
  phase_reviewed: { icon: '✅', accent: '#4cd964', label: 'Review' },
  showcase_reviewed: { icon: '🏆', accent: '#c58af9', label: 'Showcase' },
}

const FALLBACK_META: KindMeta = { icon: '🔔', accent: 'rgba(255,255,255,0.6)', label: 'Update' }

function metaFor(kind: string): KindMeta {
  return KIND_META[kind] ?? FALLBACK_META
}

/**
 * In-app notification bell (spec §13.7) — the always-visible reminder surface in
 * the status strip. Polls for fair-deadline + urgency notifications, shows an
 * unread badge, and lets the student open/clear them. Silently hides for users
 * without a team (the API 404s).
 */
export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        if (res.status === 404) setAvailable(false)
        return
      }
      const data = await res.json()
      setItems(data.items ?? [])
      setUnread(data.unreadCount ?? 0)
    } catch {
      // transient — keep last good state
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markAllRead() {
    setUnread(0)
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {})
  }

  async function openItem(n: NotificationItem) {
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1))
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {})
    }
    if (n.linkUrl) {
      setOpen(false)
      router.push(n.linkUrl)
    }
  }

  if (!available) return null

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
      >
        <Bell size={15} />
        {unread > 0 && <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__head">
            <span className="font-pixel text-[8px] text-white/60 uppercase tracking-widest">
              Notifications
            </span>
            {unread > 0 && (
              <button type="button" className="notif-bell__clear font-pixel" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-bell__list">
            {items.length === 0 ? (
              <p className="font-pixel text-[8px] text-white/30 text-center py-6">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => {
                const meta = metaFor(n.kind)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={`notif-bell__item${n.readAt ? '' : ' notif-bell__item--unread'}`}
                  >
                    <span className="notif-bell__item-kind font-pixel" style={{ color: meta.accent }}>
                      {meta.label}
                    </span>
                    <span className="notif-bell__item-title">
                      <span style={{ color: meta.accent }}>{meta.icon} </span>
                      {n.title}
                    </span>
                    <span className="notif-bell__item-body">{n.body}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
