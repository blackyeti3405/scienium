'use client'

import { useState } from 'react'
import { Send, AlertTriangle, X, ChevronDown, Users, Calendar, Check } from 'lucide-react'
import { RichEditor } from '../RichEditor'
import { BusyButton } from '@/components/ui/BusyButton'
import type { LabType } from '@/lib/phase'
import { formatDate, SectionLabel } from '../log-shared'
import { AttachmentUploader } from './AttachmentUploader'
import type { LogEntry, Member, SavedLogEntry } from './types'
import { saveLogEntry } from './api'

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

const ENGINEERING_LAB_TYPES: readonly LabType[] = ['volt_lab']

function getStages(labType: string | null): string[] {
  if (!labType) return [...SCIENCE_STAGES, ...ENGINEERING_STAGES]
  return ENGINEERING_LAB_TYPES.some((type) => type === labType)
    ? ENGINEERING_STAGES
    : SCIENCE_STAGES
}

// ─── Project log entry form (create + edit) ─────────────────────────────────────

export function ProjectLogForm({
  members,
  labType,
  headerNumber,
  entry,
  onSaved,
  onCancel,
}: {
  members: Member[]
  labType: string | null
  headerNumber: number
  entry?: LogEntry
  onSaved: (entry: SavedLogEntry, mode: 'create' | 'edit') => void
  onCancel?: () => void
}) {
  const isEdit = !!entry
  const [body, setBody] = useState(entry?.body ?? '')
  const [nextSteps, setNextSteps] = useState(entry?.nextSteps ?? '')
  const [stage, setStage] = useState(entry?.stage ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>(entry?.attendeeIds ?? [])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>(entry?.attachmentUrls ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stages = getStages(labType)

  function toggleAttendee(userId: string) {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function submit() {
    setError(null)
    if (members.length > 1 && attendeeIds.length === 0) { setError('Select who was present.'); return }
    if (!stage) { setError('Select a project stage.'); return }
    const plainBody = body.replace(/[*_#>\-\s]/g, '')
    if (!plainBody) { setError('Session notes are required.'); return }
    if (!nextSteps.trim()) { setError('Next steps are required.'); return }
    if (attachmentUrls.length === 0) { setError('At least one photo is required.'); return }
    setBusy(true)
    try {
      const data = await saveLogEntry(
        {
          body: body.trim(),
          nextSteps: nextSteps.trim(),
          stage: stage || undefined,
          attendeeIds,
          attachmentUrls,
        },
        isEdit ? entry!.id : undefined,
      )
      onSaved(data.entry, isEdit ? 'edit' : 'create')
      if (!isEdit) {
        setBody(''); setNextSteps(''); setStage(''); setAttendeeIds([]); setAttachmentUrls([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ops-entry-card">
      <div className="ops-entry-card__head">
        <span className="ops-entry-card__badge font-pixel">#{isEdit ? entry!.entryNumber : headerNumber}</span>
        <div className="flex flex-col">
          <span className="font-pixel text-[9px] text-white">{isEdit ? 'Editing entry' : 'New session entry'}</span>
          <span className="font-pixel text-[6px] text-white/40 mt-0.5 flex items-center gap-1">
            <Calendar size={8} />
            {formatDate(entry?.createdAt ?? new Date().toISOString())}
          </span>
        </div>
        {isEdit && onCancel && (
          <button onClick={onCancel} className="ops-entry-card__cancel font-pixel" title="Cancel edit">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="ops-entry-card__body">
        {members.length > 1 && (
          <div className="ops-field">
            <SectionLabel required><Users size={9} className="inline mr-1 -mt-0.5" />Who was present?</SectionLabel>
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

        <div className="ops-field">
          <SectionLabel required>Project stage</SectionLabel>
          <div className="ops-select-wrap">
            <select value={stage} onChange={(e) => setStage(e.target.value)} className="ops-select">
              <option value="">— Select stage —</option>
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="ops-select-icon" />
          </div>
        </div>

        <div className="ops-field">
          <SectionLabel required>Session notes</SectionLabel>
          <RichEditor
            value={body}
            onChange={setBody}
            placeholder="What did you do? What did you observe? What worked, what didn't?"
          />
        </div>

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

      <div className="ops-entry-card__foot">
        {isEdit && onCancel && (
          <button onClick={onCancel} className="ops-ghost-btn font-pixel">Cancel</button>
        )}
        <BusyButton
          busy={busy}
          busyLabel="Saving…"
          icon={isEdit ? <Check size={11} /> : <Send size={11} />}
          onClick={submit}
          className="ops-submit-btn"
        >
          {isEdit ? 'Save changes' : 'Save entry'}
        </BusyButton>
      </div>
    </div>
  )
}
