'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Send, AlertTriangle, BookOpen } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  body: string
  stage?: string | null
  author: string
  createdAt: string
}

interface FailureEntry {
  id: string
  happened: string
  learned: string
  author: string
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="ops-avatar font-pixel">{name[0]?.toUpperCase() ?? '?'}</span>
  )
}

// ─── Project Log Tab ──────────────────────────────────────────────────────────

function ProjectLogTab() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [body, setBody] = useState('')
  const [stage, setStage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/project-log')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.entries)) setEntries(d.entries)
      })
      .catch(() => {})
  }, [])

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/project-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, stage: stage.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEntries((prev) => [data.entry, ...prev])
      setBody('')
      setStage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ops-tab-body">
      {/* Entry form */}
      <div className="ops-card">
        <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-3">
          What did you work on today?
        </p>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Describe what you accomplished, tested, or discovered…"
          className="ops-textarea"
        />
        <div className="flex items-center gap-2 mt-2">
          <input
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            placeholder="Stage (optional — e.g. Data Collection)"
            maxLength={100}
            className="ops-input flex-1"
          />
          <button
            onClick={submit}
            disabled={busy || !body.trim()}
            className="ops-submit-btn shrink-0"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {busy ? 'Saving…' : 'Log it'}
          </button>
        </div>
        {error && <p className="font-pixel text-[7px] text-red-400 mt-2">{error}</p>}
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="ops-empty">
          <BookOpen size={20} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No entries yet — log your first session above.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e) => (
            <div key={e.id} className="ops-entry">
              <Avatar name={e.author} />
              <div className="ops-entry__body">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-pixel text-[7px] text-white/50">{e.author}</span>
                  {e.stage && (
                    <span className="font-pixel text-[6px] bg-[#F5C518]/15 text-[#F5C518]/70 px-1.5 py-0.5 rounded-sm">
                      {e.stage}
                    </span>
                  )}
                  <span className="font-pixel text-[6px] text-white/25 ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{e.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Failure Log Tab ──────────────────────────────────────────────────────────

function FailureLogTab() {
  const [entries, setEntries] = useState<FailureEntry[]>([])
  const [happened, setHappened] = useState('')
  const [learned, setLearned] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/failure-log')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.entries)) setEntries(d.entries)
      })
      .catch(() => {})
  }, [])

  async function submit() {
    const h = happened.trim(), l = learned.trim()
    if (!h || !l) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/failure-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ happened: h, learned: l }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEntries((prev) => [data.entry, ...prev])
      setHappened('')
      setLearned('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ops-tab-body">
      {/* Entry form */}
      <div className="ops-card">
        <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-3">
          Log a failure — failures accelerate learning
        </p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="font-pixel text-[7px] text-white/40 block mb-1">What failed or didn&apos;t go as expected?</label>
            <textarea
              value={happened}
              onChange={(e) => setHappened(e.target.value)}
              rows={2}
              placeholder="Describe what went wrong…"
              className="ops-textarea"
            />
          </div>
          <div>
            <label className="font-pixel text-[7px] text-white/40 block mb-1">What did you learn from it?</label>
            <textarea
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              rows={2}
              placeholder="What will you try differently?"
              className="ops-textarea"
            />
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={submit}
            disabled={busy || !happened.trim() || !learned.trim()}
            className="ops-submit-btn"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
            {busy ? 'Saving…' : 'Log failure'}
          </button>
        </div>
        {error && <p className="font-pixel text-[7px] text-red-400 mt-2">{error}</p>}
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="ops-empty">
          <AlertTriangle size={20} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No failures logged yet — every setback is data.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e) => (
            <div key={e.id} className="ops-entry">
              <Avatar name={e.author} />
              <div className="ops-entry__body">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-pixel text-[7px] text-white/50">{e.author}</span>
                  <span className="font-pixel text-[6px] text-white/25 ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
                <p className="font-pixel text-[6px] text-white/30 uppercase tracking-widest mb-0.5">What failed</p>
                <p className="text-sm text-white/75 leading-relaxed mb-2">{e.happened}</p>
                <p className="font-pixel text-[6px] text-[#F5C518]/50 uppercase tracking-widest mb-0.5">What I learned</p>
                <p className="text-sm text-[#F5C518]/70 leading-relaxed">{e.learned}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Feature ─────────────────────────────────────────────────────────────

type Tab = 'log' | 'failure'

export function OperationsHubFeature() {
  const [tab, setTab] = useState<Tab>('log')

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Tab bar */}
      <div className="flex border-b border-white/10 shrink-0">
        {([
          ['log', '📋', 'Project Log'],
          ['failure', '⚡', 'Failure Log'],
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`ops-tab-btn font-pixel ${tab === key ? 'ops-tab-btn--active' : ''}`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'log' ? <ProjectLogTab /> : <FailureLogTab />}
    </div>
  )
}
