'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Loader2,
  Send,
  AlertTriangle,
  BookOpen,
  Bold,
  Italic,
  List,
  ListOrdered,
  ImagePlus,
  X,
  ChevronDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="ops-avatar font-pixel"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

// ─── Markdown toolbar ──────────────────────────────────────────────────────────

type FormatType = 'bold' | 'italic' | 'bullet' | 'numbered'

function applyFormat(
  el: HTMLTextAreaElement,
  type: FormatType,
  setValue: (v: string) => void,
) {
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = el.value.slice(start, end)
  const before = el.value.slice(0, start)
  const after = el.value.slice(end)

  let replacement: string
  let cursorOffset: number

  if (type === 'bold') {
    replacement = `**${selected || 'bold text'}**`
    cursorOffset = selected ? replacement.length : 2
  } else if (type === 'italic') {
    replacement = `*${selected || 'italic text'}*`
    cursorOffset = selected ? replacement.length : 1
  } else if (type === 'bullet') {
    const lines = (selected || 'Item').split('\n')
    replacement = lines.map((l) => `- ${l}`).join('\n')
    cursorOffset = replacement.length
  } else {
    const lines = (selected || 'Item').split('\n')
    replacement = lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
    cursorOffset = replacement.length
  }

  const newValue = before + replacement + after
  setValue(newValue)
  setTimeout(() => {
    el.focus()
    const pos = start + cursorOffset
    el.setSelectionRange(pos, pos)
  }, 0)
}

function Toolbar({
  textareaRef,
  setValue,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  setValue: (v: string) => void
}) {
  const fmt = (type: FormatType) => {
    if (textareaRef.current) applyFormat(textareaRef.current, type, setValue)
  }
  return (
    <div className="ops-toolbar">
      {([
        ['bold', <Bold size={11} />, 'Bold'],
        ['italic', <Italic size={11} />, 'Italic'],
        ['bullet', <List size={11} />, 'Bullet list'],
        ['numbered', <ListOrdered size={11} />, 'Numbered list'],
      ] as [FormatType, React.ReactNode, string][]).map(([type, icon, label]) => (
        <button
          key={type}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); fmt(type) }}
          className="ops-toolbar__btn"
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

// ─── Attachment uploader ───────────────────────────────────────────────────────

function AttachmentUploader({
  urls,
  onChange,
}: {
  urls: string[]
  onChange: (urls: string[]) => void
}) {
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
      <div className="flex items-center gap-2 flex-wrap">
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
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
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

  // Form state
  const [body, setBody] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [stage, setStage] = useState('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const nextStepsRef = useRef<HTMLTextAreaElement>(null)

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

  const setBodyCb = useCallback((v: string) => setBody(v), [])

  async function submit() {
    setError(null)
    if (!body.trim()) { setError('Notes are required.'); return }
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
      <div className="ops-tab-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={18} className="animate-spin text-white/25" />
      </div>
    )
  }

  return (
    <div className="ops-tab-body">
      {/* ── Entry form ── */}
      <div className="ops-card flex flex-col gap-4">
        <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
          Session Entry #{entries.length + 1} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Attendance — only shown for multi-member teams */}
        {members.length > 1 && (
          <div>
            <p className="font-pixel text-[7px] text-white/35 mb-2">Who was present?</p>
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
                    <span className="ops-attendee-chip__dot" />
                    <span className="font-pixel text-[7px]">{m.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stage dropdown */}
        <div>
          <p className="font-pixel text-[7px] text-white/35 mb-2">Stage</p>
          <div className="ops-select-wrap">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="ops-select"
            >
              <option value="">— Select stage —</option>
              {stages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={12} className="ops-select-icon" />
          </div>
        </div>

        {/* Notes with markdown toolbar */}
        <div>
          <p className="font-pixel text-[7px] text-white/35 mb-2">
            Session notes <span className="text-red-400">*</span>
          </p>
          <Toolbar textareaRef={bodyRef} setValue={setBodyCb} />
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="What did you do? What observations did you make? What worked?"
            className="ops-textarea"
          />
        </div>

        {/* Next steps — required */}
        <div>
          <p className="font-pixel text-[7px] text-white/35 mb-2">
            Next steps <span className="text-red-400">*</span>
          </p>
          <textarea
            ref={nextStepsRef}
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            rows={2}
            placeholder="What will you do in the next session?"
            className="ops-textarea"
          />
        </div>

        {/* Attachments — required */}
        <div>
          <p className="font-pixel text-[7px] text-white/35 mb-2">
            Photos <span className="text-red-400">*</span>{' '}
            <span className="text-white/25">(at least 1 required)</span>
          </p>
          <AttachmentUploader urls={attachmentUrls} onChange={setAttachmentUrls} />
        </div>

        {error && <p className="font-pixel text-[7px] text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={busy}
            className="ops-submit-btn"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      {entries.length === 0 ? (
        <div className="ops-empty">
          <BookOpen size={20} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No entries yet — log your first session above.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e) => {
            const attendeeNames = members
              .filter((m) => e.attendeeIds.includes(m.userId))
              .map((m) => m.name)
            return (
              <div key={e.id} className="ops-entry">
                {/* Entry number badge */}
                <div className="ops-entry__num font-pixel">#{e.entryNumber}</div>
                <div className="ops-entry__body">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Avatar name={e.createdBy.name} size={22} />
                    <span className="font-pixel text-[7px] text-white/55">{e.createdBy.name}</span>
                    {attendeeNames.length > 0 && (
                      <span className="font-pixel text-[6px] text-white/30">
                        + {attendeeNames.filter((n) => n !== e.createdBy.name).join(', ')}
                      </span>
                    )}
                    {e.stage && (
                      <span className="ops-stage-badge font-pixel">{e.stage}</span>
                    )}
                    <span className="font-pixel text-[6px] text-white/25 ml-auto">
                      {formatDate(e.createdAt)} · {timeAgo(e.createdAt)}
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="ops-md text-sm text-white/75 leading-relaxed mb-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.body}</ReactMarkdown>
                  </div>

                  {/* Next steps */}
                  <div className="ops-nextsteps">
                    <p className="font-pixel text-[6px] text-[#F5C518]/50 uppercase tracking-widest mb-1">
                      Next steps
                    </p>
                    <p className="text-sm text-[#F5C518]/70 leading-relaxed">{e.nextSteps}</p>
                  </div>

                  {/* Photos */}
                  {e.attachmentUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.attachmentUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`entry ${e.entryNumber} photo ${i + 1}`}
                            className="ops-thumb ops-thumb--timeline"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
      <div className="ops-card">
        <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-4">
          Log a failure — every setback is data
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="font-pixel text-[7px] text-white/35 block mb-2">
              What failed or didn&apos;t go as expected? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={happened}
              onChange={(e) => setHappened(e.target.value)}
              rows={3}
              placeholder="Describe what went wrong — be specific about conditions and what you expected vs. what happened."
              className="ops-textarea"
            />
          </div>
          <div>
            <label className="font-pixel text-[7px] text-white/35 block mb-2">
              What did you learn from it? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              rows={3}
              placeholder="What will you try differently? What does this tell you about your hypothesis or design?"
              className="ops-textarea"
            />
          </div>
        </div>
        {error && <p className="font-pixel text-[7px] text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end mt-3">
          <button
            onClick={submit}
            disabled={busy || !happened.trim() || !learned.trim()}
            className="ops-submit-btn"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
            {busy ? 'Saving…' : 'Log failure'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="ops-empty">
          <AlertTriangle size={20} className="text-white/15 mb-2" />
          <span className="font-pixel text-[8px] text-white/30">No failures logged yet — every setback is data.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e, i) => (
            <div key={e.id} className="ops-entry">
              <div className="ops-entry__num ops-entry__num--failure font-pixel">#{entries.length - i}</div>
              <div className="ops-entry__body">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={e.author} size={22} />
                  <span className="font-pixel text-[7px] text-white/55">{e.author}</span>
                  <span className="font-pixel text-[6px] text-white/25 ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
                <p className="font-pixel text-[6px] text-white/30 uppercase tracking-widest mb-1">What failed</p>
                <p className="text-sm text-white/75 leading-relaxed mb-3">{e.happened}</p>
                <p className="font-pixel text-[6px] text-[#F5C518]/50 uppercase tracking-widest mb-1">What I learned</p>
                <p className="text-sm text-[#F5C518]/70 leading-relaxed">{e.learned}</p>
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
