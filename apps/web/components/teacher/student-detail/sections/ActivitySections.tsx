'use client'

import { useState } from 'react'
import { BookOpen, Send } from 'lucide-react'
import { z } from 'zod'
import { Card, StatTile } from '@/components/ui/Card'
import { BusyButton } from '@/components/ui/BusyButton'
import { ApiError, requestJson } from '@/lib/api/client'
import { fmtDate } from '@/lib/format'
import { Empty } from '../shared'
import type { FeedbackRow, Overview } from '../types'

export function ActivitySection({ overview }: { overview: Overview }) {
  const { activity } = overview

  if (activity.length === 0) {
    return (
      <Card>
        <Empty>No activity yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="space-y-2.5">
        {activity.map((a, i) => (
          <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm border-l-2 border-white/10 pl-3">
            <span className="text-white/70">{a.description}</span>
            <span className="text-white/40 text-xs">— {a.userName}</span>
            <span className="text-white/30 text-xs">{fmtDate(a.createdAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function CodexSection({ overview }: { overview: Overview }) {
  const { codex } = overview

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatTile icon={<BookOpen size={16} />} accent value={codex.lessonsCompleted} label="Lessons completed" />
        <StatTile icon={<BookOpen size={16} />} value={codex.kp.toLocaleString()} label="KP from lessons" />
      </div>

      {codex.recent.length > 0 ? (
        <Card label="Recent lessons">
          <ul className="space-y-4">
            {codex.recent.map((r, i) => (
              <li key={i} className="space-y-1 border-l-2 border-white/10 pl-3">
                <p className="text-xs text-white/40">
                  {r.completedAt ? fmtDate(r.completedAt) : '—'} · {r.trackLabel}
                </p>
                <p className="text-sm text-white/75">{r.lessonLabel}</p>
                <p className="text-xs text-white/50">
                  Checkpoint {r.bestScore}% · +{r.kpAwarded} KP
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <Empty>No Codex lessons completed yet.</Empty>
        </Card>
      )}
    </div>
  )
}

const feedbackResponseSchema = z.object({
  feedback: z.object({
    id: z.string(),
    targetType: z.string(),
    body: z.string(),
    resolved: z.boolean(),
    createdAt: z.coerce.string(),
  }),
})

export function FeedbackSection({
  teamId,
  initial,
}: {
  teamId: string
  initial: FeedbackRow[]
}) {
  const [items, setItems] = useState(initial)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const out = await requestJson('/api/teacher/feedback', feedbackResponseSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, targetType: 'team', body }),
      })
      setItems((list) => [out.feedback, ...list])
      setBody('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send feedback. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave feedback the team will see…"
          maxLength={2000}
          className="flex-1 bg-[#0d1b2e] border border-white/15 rounded-md text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25 transition-colors"
        />
        <BusyButton
          busy={busy}
          busyLabel="Sending…"
          icon={<Send size={14} />}
          disabled={!body.trim()}
          onClick={send}
          className="inline-flex items-center gap-1.5 bg-[#F5C518] text-[#0d1b2e] text-sm font-medium px-3 py-2 rounded-md hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
        >
          Send
        </BusyButton>
      </div>
      {error && <p className="text-sm text-red-400 pt-2">{error}</p>}
      {items.length > 0 && (
        <ul className="space-y-2 pt-2">
          {items.map((f) => (
            <li key={f.id} className="text-sm text-white/65 border-l-2 border-[#F5C518]/30 pl-2">
              {f.body}
              <span className="text-white/30 text-xs ml-2">{fmtDate(f.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && !body && <Empty>No feedback given yet.</Empty>}
    </Card>
  )
}
