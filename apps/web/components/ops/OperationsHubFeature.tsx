'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2,
  Send,
  AlertTriangle,
  BookOpen,
  ImagePlus,
  X,
  ChevronDown,
  Users,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RichEditor } from './RichEditor'

// ─── Stage options ─────────────────────────────────────────────────────────────

const SCIENCE_STAGES = [
  'Background Research',
  'Question Formulation',
  'Hypothesis Development',
  'Experimental Design',
  'Data Collection',
  'Data Analysis',
  'Drawing Conclusions',
  'Report Writing',
  'Presentation Prep',
]

const ENGINEERING_STAGES = [
  'Define the Problem',
  'Research & Brainstorm',
  'Specify Requirements',
  'Design & Prototype',
  'Build & Construct',
  'Test & Evaluate',
  'Refine & Redesign',
  'Final Design',
  'Documentation & Report',
]

const ENGINEERING_LAB_TYPES = ['volt_lab', 'aero_lab', 'mech_lab', 'comp_lab']

function getStages(labType: string | null): string[] {
  if (!labType) return [...SCIENCE_STAGES, ...ENGINEERING_STAGES]
  return ENGINEERING_LAB_TYPES.includes(labType) ? ENGINEERING_STAGES : SCIENCE_STAGES
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Member { userId: string; name: string }

interface LogEntry {
  id: string
  entryNumber: number
  body: string
  nextSteps: string
  stage: string | null
  attendeeIds: string[]
  attachmentUrls: string[]
  createdAt: string
  createdBy: { id: string; name: string }
}

interface FailureEntry {
  id: string
  happened: string
  learned: string
  author: string
  createdAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <span className="ops-avatar font-pixel" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="ops-label font-pixel">
      {children}
      {required && <span className="ops-label__req">*</span>}
    </p>
  )
}

// ─── Attachment uploader ───────────────────────────────────────────────────────

function AttachmentUploader({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/project-log/attachment', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange([...urls, data.url])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        {urls.map((url, i) => (
          <div key={i} className="ops-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`attachment ${i + 1}`} className="ops-thumb" />
            <button
              type="button"
              className="ops-thumb__remove"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
              title="Remove"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="ops-upload-btn"
          title="Add photo"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          <span className="font-pixel text-[7px]">{uploading ? 'Uploading…' : 'Add photo'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
            e.target.value = ''
          }}
        />
      </div>
      {uploadError && <p className="font-pixel text-[7px] text-red-400">{uploadError}</p>}
    </div>
  )
}

// ─── Project Log Tab ───────────────────────────────────────────────────────────

function ProjectLogTab() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labType, setLabType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [body, setBody] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [stage, setStage] = useState('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/project-log')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.entries)) setEntries(d.entries)
        if (Array.isArray(d.members)) setMembers(d.members)
        if (d.labType !== undefined) setLabType(d.labType)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stages = getStages(labType)

  function toggleAttendee(userId: string) {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function submit() {
    setError(null)
    const plainBody = body.replace(/[*_#>\-\s]/g, '')
    if (!plainBody) { setError('Session notes are required.'); return }
    if (!nextSteps.trim()) { setError('Next steps are required.'); return }
    if (attachmentUrls.length === 0) { setError('At least one photo is required.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/project-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          nextSteps: nextSteps.trim(),
          stage: stage || undefined,
          attendeeIds,
          attachmentUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEntries((prev) => [data.entry, ...prev])
      setBody('')
      setNextSteps('')
      setStage('')
      setAttendeeIds([])
      setAttachmentUrls([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="ops-tab-body items-center justify-center">
        <Loader2 size={18} className="animate-spin text-white/25" />
      </div>
    )
  }

  return (
    <div className="ops-tab-body">
      {/* ── New entry card ── */}
      <div className="ops-entry-card">
        {/* Card header */}
        <div className="ops-entry-card__head">
          <span className="ops-entry-card__badge font-pixel">#{entries.length + 1}</span>
          <div className="flex flex-col">
            <span className="font-pixel text-[9px] text-white">New session entry</span>
            <span className="font-pixel text-[6px] text-white/35 mt-0.5 flex items-center gap-1">
              <Calendar size={8} />
              {formatDate(new Date().toISOString())}
            </span>
          </div>
        </div>

        <div className="ops-entry-card__body">
          {/* Attendance */}
          {members.length > 1 && (
            <div className="ops-field">
              <SectionLabel><Users size={9} className="inline mr-1 -mt-0.5" />Who was present?</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const checked = attendeeIds.includes(m.userId)
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAttendee(m.userId)}
                      className={`ops-attendee-chip ${checked ? 'ops-attendee-chip--on' : ''}`}
                    >
                      <span className="ops-attendee-chip__check">{checked ? '✓' : ''}</span>
                      <span className="font-pixel text-[7px]">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stage */}
          <div className="ops-field">
            <SectionLabel>Project stage</SectionLabel>
            <div className="ops-select-wrap">
              <select value={stage} onChange={(e) => setStage(e.target.value)} className="ops-select">
                <option value="">— Select stage —</option>
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="ops-select-icon" />
            </div>
          </div>

          {/* Notes */}
          <div className="ops-field">
            <SectionLabel required>Session notes</SectionLabel>
            <RichEditor
              value={body}
              onChange={setBody}
              placeholder="What did you do? What did you observe? What worked, what didn't?"
            />
          </div>

          {/* Next steps */}
          <div className="ops-field">
            <SectionLabel required>Next steps</SectionLabel>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              rows={2}
              placeholder="What will you tackle in the next session?"
              className="ops-textarea"
            />
          </div>

          {/* Photos */}
          <div className="ops-field">
            <SectionLabel required>
              Photos <span className="ops-label__hint">— at least one</span>
            </SectionLabel>
            <AttachmentUploader urls={attachmentUrls} onChange={setAttachmentUrls} />
          </div>

          {error && (
            <div className="ops-error">
              <AlertTriangle size={11} className="shrink-0" />
              <span className="font-pixel text-[7px]">{error}</span>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="ops-entry-card__foot">
          <button onClick={submit} disabled={busy} className="ops-submit-btn">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      {entries.length === 0 ? (
        <div className="ops-empty">
          <BookOpen size={22} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No entries yet — log your first session above.</span>
        </div>
      ) : (
        <>
          <div className="ops-timeline-header">
            <span className="font-pixel text-[7px] text-white/30 uppercase tracking-widest">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
            <div className="ops-timeline-header__line" />
          </div>
          <div className="ops-timeline">
            {entries.map((e) => {
              const attendeeNames = members
                .filter((m) => e.attendeeIds.includes(m.userId) && m.userId !== e.createdBy.id)
                .map((m) => m.name)
              return (
                <div key={e.id} className="ops-log-entry">
                  <div className="ops-log-entry__rail">
                    <span className="ops-log-entry__num font-pixel">{e.entryNumber}</span>
                  </div>
                  <div className="ops-log-entry__card">
                    <div className="ops-log-entry__head">
                      <Avatar name={e.createdBy.name} size={24} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-pixel text-[7px] text-white/70">
                          {e.createdBy.name}
                          {attendeeNames.length > 0 && (
                            <span className="text-white/30"> + {attendeeNames.join(', ')}</span>
                          )}
                        </span>
                        <span className="font-pixel text-[6px] text-white/30 mt-0.5">
                          {formatDate(e.createdAt)} · {timeAgo(e.createdAt)}
                        </span>
                      </div>
                      {e.stage && <span className="ops-stage-badge font-pixel">{e.stage}</span>}
                    </div>

                    <div className="ops-md text-sm text-white/80 leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.body}</ReactMarkdown>
                    </div>

                    {e.attachmentUrls.length > 0 && (
                      <div className="ops-photo-row">
                        {e.attachmentUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="ops-photo-link">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`entry ${e.entryNumber} photo ${i + 1}`} className="ops-photo" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="ops-nextsteps">
                      <span className="ops-nextsteps__label font-pixel">
                        <ArrowRight size={9} /> Next steps
                      </span>
                      <p className="text-sm text-[#F5C518]/80 leading-relaxed mt-1">{e.nextSteps}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Failure Log Tab ───────────────────────────────────────────────────────────

function FailureLogTab() {
  const [entries, setEntries] = useState<FailureEntry[]>([])
  const [happened, setHappened] = useState('')
  const [learned, setLearned] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/failure-log')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.entries)) setEntries(d.entries) })
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
      <div className="ops-entry-card">
        <div className="ops-entry-card__head">
          <span className="ops-entry-card__badge ops-entry-card__badge--failure font-pixel">
            <AlertTriangle size={12} />
          </span>
          <div className="flex flex-col">
            <span className="font-pixel text-[9px] text-white">Log a failure</span>
            <span className="font-pixel text-[6px] text-white/35 mt-0.5">Every setback is data — document it</span>
          </div>
        </div>

        <div className="ops-entry-card__body">
          <div className="ops-field">
            <SectionLabel required>What failed or didn&apos;t go as expected?</SectionLabel>
            <textarea
              value={happened}
              onChange={(e) => setHappened(e.target.value)}
              rows={3}
              placeholder="Be specific about conditions and what you expected vs. what happened."
              className="ops-textarea"
            />
          </div>
          <div className="ops-field">
            <SectionLabel required>What did you learn from it?</SectionLabel>
            <textarea
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              rows={3}
              placeholder="What will you try differently? What does this tell you about your hypothesis or design?"
              className="ops-textarea"
            />
          </div>
          {error && (
            <div className="ops-error">
              <AlertTriangle size={11} className="shrink-0" />
              <span className="font-pixel text-[7px]">{error}</span>
            </div>
          )}
        </div>

        <div className="ops-entry-card__foot">
          <button onClick={submit} disabled={busy || !happened.trim() || !learned.trim()} className="ops-submit-btn">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
            {busy ? 'Saving…' : 'Log failure'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="ops-empty">
          <AlertTriangle size={22} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No failures logged yet — every setback is data.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e, i) => (
            <div key={e.id} className="ops-log-entry">
              <div className="ops-log-entry__rail">
                <span className="ops-log-entry__num ops-log-entry__num--failure font-pixel">
                  {entries.length - i}
                </span>
              </div>
              <div className="ops-log-entry__card">
                <div className="ops-log-entry__head">
                  <Avatar name={e.author} size={24} />
                  <span className="font-pixel text-[7px] text-white/70">{e.author}</span>
                  <span className="font-pixel text-[6px] text-white/30 ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
                <p className="font-pixel text-[6px] text-white/30 uppercase tracking-widest mb-1">What failed</p>
                <p className="text-sm text-white/80 leading-relaxed mb-3">{e.happened}</p>
                <div className="ops-nextsteps">
                  <span className="ops-nextsteps__label font-pixel">What I learned</span>
                  <p className="text-sm text-[#F5C518]/80 leading-relaxed mt-1">{e.learned}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'log' | 'failure'

export function OperationsHubFeature() {
  const [tab, setTab] = useState<Tab>('log')

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      <div className="flex border-b border-white/10 shrink-0 px-2">
        {([
          ['log', '📋', 'Project Log'],
          ['failure', '⚡', 'Failure Log'],
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`ops-tab-btn font-pixel ${tab === key ? 'ops-tab-btn--active' : ''}`}
          >
            <span className="mr-1.5">{icon}</span>{label}
          </button>
        ))}
      </div>
      {tab === 'log' ? <ProjectLogTab /> : <FailureLogTab />}
    </div>
  )
}
