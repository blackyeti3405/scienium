'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Copy,
  Check,
  X,
  Clock,
  Activity,
  Users,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Bell,
  RefreshCw,
} from 'lucide-react'
import { PHASE_INFO, PHASE_ORDER, type Phase } from '@/lib/phase'
import { StatTile } from '@/components/ui/Card'
import { BusyButton } from '@/components/ui/BusyButton'
import { useCopyToClipboard } from '@/components/ops/guide-chrome'
import { TeacherPanelState } from './TeacherPanelState'
import { TruncationNotice } from './TruncationNotice'

interface RosterStudent {
  studentId: string
  name: string
  teamId: string | null
  teamName: string | null
  phase: string | null
  labType: string | null
  readyPapers: number
  lastActivityAt: string | null
  flags: { status: 'on_track' | 'unlogged' | 'stale' | null }
}

interface PendingRequest {
  id: string
  studentName: string
  requestedAt: string
}

interface ClassRow {
  id: string
  name: string
  joinCode: string | null
  school?: { name: string }
  _count?: { users: number }
  pendingRequests?: PendingRequest[]
}

interface RosterResponse {
  students: RosterStudent[]
  hasClasses: boolean
  phaseCounts?: Record<string, number>
  attentionCount?: number
  truncated?: boolean
  limit?: number
}

export function TeacherRoster() {
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [phaseCounts, setPhaseCounts] = useState<Record<string, number>>({})
  const [attentionCount, setAttentionCount] = useState(0)
  // P2-1: the roster read is bounded, so it may be partial — never silently.
  const [truncated, setTruncated] = useState<{ limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attentionOnly, setAttentionOnly] = useState(false)
  // Keyed by teamId (not studentId) — nudging one row marks every row that
  // shares the team as "Nudged" for the rest of the session.
  const [nudged, setNudged] = useState<Record<string, 'idle' | 'sending' | 'done'>>({})
  const [nudgeError, setNudgeError] = useState<Record<string, string | undefined>>({})
  // A class-join approval enrols the student server-side, but that student
  // still won't appear in `students` below until the roster is re-fetched —
  // ClassManager only ever patched its OWN `classes` state (the count/pending
  // list), never this component's roster. Surfaced separately from the
  // full-page `loadError` so one failed background refresh after an approval
  // doesn't blank the whole panel that was just successfully used.
  const [rosterRefreshError, setRosterRefreshError] = useState<string | null>(null)

  async function fetchRoster(): Promise<RosterResponse> {
    const r = await fetch('/api/teacher/roster')
    if (!r.ok) throw new Error('roster fetch failed')
    return r.json()
  }

  // Extracted so a failed initial load has a real retry (not just a dead-end
  // message), same shape as LiteratureFeature's (v0.59.0) and CodexTab's
  // (v0.58.0) load failures.
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    return Promise.all([
      fetchRoster(),
      fetch('/api/teacher/class').then((r) => {
        if (!r.ok) throw new Error('class fetch failed')
        return r.json()
      }),
    ])
      .then(([roster, cls]) => {
        setStudents(roster.students ?? [])
        setPhaseCounts(roster.phaseCounts ?? {})
        setAttentionCount(roster.attentionCount ?? 0)
        setTruncated(roster.truncated ? { limit: roster.limit ?? roster.students.length } : null)
        setClasses(cls.classes ?? [])
      })
      .catch(() => setLoadError('Could not load your roster. Try refreshing the page.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refreshRosterAfterApproval = useCallback(() => {
    setRosterRefreshError(null)
    return fetchRoster()
      .then((roster) => {
        setStudents(roster.students ?? [])
        setPhaseCounts(roster.phaseCounts ?? {})
        setAttentionCount(roster.attentionCount ?? 0)
        setTruncated(roster.truncated ? { limit: roster.limit ?? roster.students.length } : null)
      })
      .catch(() =>
        setRosterRefreshError(
          'Approved — but the roster below may be out of date. Try again to see the new student.',
        ),
      )
  }, [])

  const hasAttention = (s: RosterStudent) =>
    s.flags.status === 'unlogged' || s.flags.status === 'stale'
  const visible = attentionOnly ? students.filter(hasAttention) : students

  async function nudge(teamId: string) {
    if (!teamId || nudged[teamId] === 'sending' || nudged[teamId] === 'done') return
    setNudged((m) => ({ ...m, [teamId]: 'sending' })) // optimistic
    setNudgeError((m) => ({ ...m, [teamId]: undefined }))
    try {
      const res = await fetch('/api/teacher/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      if (!res.ok) throw new Error('nudge failed')
      setNudged((m) => ({ ...m, [teamId]: 'done' }))
    } catch {
      setNudged((m) => ({ ...m, [teamId]: 'idle' })) // revert on failure so it can be retried
      setNudgeError((m) => ({ ...m, [teamId]: 'Could not send — try again.' }))
    }
  }

  if (loading || loadError) {
    return <TeacherPanelState loading={loading} error={loadError} skeletonRows={5} onRetry={load} />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {truncated && <TruncationNotice limit={truncated.limit} noun="students" />}

      {rosterRefreshError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2.5">
          <span className="text-sm text-amber-300">{rosterRefreshError}</span>
          <button
            type="button"
            onClick={() => void refreshRosterAfterApproval()}
            className="shrink-0 text-sm text-white/60 border border-white/20 rounded-md px-3 py-1 hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Classes manager */}
      <ClassManager classes={classes} setClasses={setClasses} onApproved={refreshRosterAfterApproval} />

      {/* Overview stat tiles */}
      {students.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatTile
              label="Total students"
              value={students.length}
              icon={<Users size={16} />}
            />
            <StatTile
              label="Need attention"
              value={attentionCount}
              accent={attentionCount > 0}
              icon={<AlertTriangle size={16} />}
            />
            {PHASE_ORDER.filter((p) => (phaseCounts[p] ?? 0) > 0).map((p) => (
              <StatTile
                key={p}
                label={PHASE_INFO[p].label}
                value={phaseCounts[p] ?? 0}
                icon={<GraduationCap size={16} />}
              />
            ))}
          </div>
        </section>
      )}

      {/* Roster table */}
      <section className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
            Roster · {students.length}
          </h2>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(e) => setAttentionOnly(e.target.checked)}
              className="accent-[#F5C518]"
            />
            <span className="text-xs text-white/50">Needs my attention</span>
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-lg py-12 text-center">
            <p className="text-sm text-white/40">
              {students.length === 0
                ? 'No students yet — share a class code so students can join.'
                : 'No students need attention right now.'}
            </p>
          </div>
        ) : (
          <div className="border border-white/10 bg-[#0a1628] rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_8rem_9rem_5rem_9rem] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/10">
              <span className="font-pixel text-[10px] text-white/40 uppercase tracking-wider">
                Student
              </span>
              <span className="font-pixel text-[10px] text-white/40 uppercase tracking-wider">
                Team
              </span>
              <span className="font-pixel text-[10px] text-white/40 uppercase tracking-wider">
                Phase
              </span>
              <span className="font-pixel text-[10px] text-white/40 uppercase tracking-wider text-right">
                Papers
              </span>
              <span className="font-pixel text-[10px] text-white/40 uppercase tracking-wider text-right">
                Flags
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.05]">
              {visible.map((s) => {
                const phaseInfo = s.phase ? PHASE_INFO[s.phase as Phase] : null
                return (
                  <Link
                    key={s.studentId}
                    href={`/teacher/student/${s.studentId}`}
                    className="flex flex-wrap sm:grid sm:grid-cols-[1fr_8rem_9rem_5rem_9rem] sm:items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex-1 sm:flex-none text-sm text-white font-medium min-w-[120px]">
                      {s.name}
                    </span>
                    <span className="w-32 sm:w-auto text-sm text-white/50 truncate">
                      {s.teamName ?? (
                        <span className="text-white/40 italic text-xs">No team</span>
                      )}
                    </span>
                    <span className="w-28 sm:w-auto">
                      {phaseInfo ? (
                        <span className="text-sm text-white/70">{phaseInfo.label}</span>
                      ) : (
                        <span className="text-sm text-white/40 italic">—</span>
                      )}
                    </span>
                    <span className="text-sm tabular-nums text-white/40 sm:text-right">
                      {s.readyPapers > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={12} className="text-white/40" />
                          {s.readyPapers}
                        </span>
                      ) : (
                        '—'
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 sm:justify-end flex-wrap">
                      {s.flags.status === 'unlogged' && (
                        <span
                          title="Team is actively earning KP or completing tasks but hasn't written a progress log in the last 5 days."
                          className="inline-flex items-center gap-1 text-xs text-sky-400 bg-sky-400/10 border border-sky-400/20 rounded-full px-2 py-0.5 whitespace-nowrap"
                        >
                          <Activity size={11} /> not logged
                        </span>
                      )}
                      {s.flags.status === 'stale' && (
                        <span
                          title="No progress log and no activity in the last 5 days — team may be stuck."
                          className="inline-flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5 whitespace-nowrap"
                        >
                          <Clock size={11} /> stale
                        </span>
                      )}
                      {(s.flags.status === 'unlogged' || s.flags.status === 'stale') &&
                        s.teamId &&
                        (nudged[s.teamId] === 'done' ? (
                          <span
                            data-testid="nudge-done"
                            title="This team was notified — check in again tomorrow."
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5 whitespace-nowrap"
                          >
                            <Check size={11} /> Nudged
                          </span>
                        ) : (
                          <span className="flex flex-col items-end gap-0.5">
                            <BusyButton
                              data-testid="nudge-button"
                              busy={nudged[s.teamId] === 'sending'}
                              busyLabel="Nudging…"
                              icon={<Bell size={11} />}
                              spinnerTone="gold"
                              title="Send a friendly check-in notification to this team."
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                nudge(s.teamId!)
                              }}
                              className="inline-flex items-center gap-1 font-pixel text-[9px] text-[#F5C518] uppercase tracking-wider bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-full px-2 py-0.5 whitespace-nowrap hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              Nudge
                            </BusyButton>
                            {nudgeError[s.teamId] && (
                              <span className="text-[10px] text-red-400 whitespace-nowrap">
                                {nudgeError[s.teamId]}
                              </span>
                            )}
                          </span>
                        ))}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function ClassManager({
  classes,
  setClasses,
  onApproved,
}: {
  classes: ClassRow[]
  setClasses: React.Dispatch<React.SetStateAction<ClassRow[]>>
  /** Called after a join request is APPROVED — the roster (owned by the
   *  parent) needs its own re-fetch, since approval only enrols the student
   *  server-side and this component only ever patches its own `classes`. */
  onApproved: () => void
}) {
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy, error: clipboardError } = useCopyToClipboard()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  // Requests currently being decided, so their buttons disable individually.
  const [deciding, setDeciding] = useState<Set<string>>(new Set())

  async function create() {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, schoolName: schoolName.trim() || undefined }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not create class')
      setClasses((list) => [out.class, ...list])
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  // `copied`/`clipboardError` are shared across every code button in this list
  // (one hook instance), so `copiedCode` tracks WHICH code was last attempted —
  // otherwise every card's checkmark/error would light up together.
  function handleCopy(code: string) {
    setCopiedCode(code)
    void copy(code)
  }

  // Regenerate a class's join code — instantly revokes the old (leaked) code.
  async function regenerate(classId: string) {
    if (regenerating) return
    setRegenerating(classId)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/class/${classId}/code`, { method: 'POST' })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not regenerate code')
      setClasses((list) => list.map((c) => (c.id === classId ? { ...c, joinCode: out.joinCode } : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate code')
    } finally {
      setRegenerating(null)
    }
  }

  // Approve or deny a pending join request. On approve the student count bumps
  // and the row is removed; on deny the row is just removed.
  async function decide(classId: string, requestId: string, decision: 'approve' | 'deny') {
    if (deciding.has(requestId)) return
    setDeciding((s) => new Set(s).add(requestId))
    setError(null)
    try {
      const res = await fetch(`/api/teacher/class/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not update request')
      setClasses((list) =>
        list.map((c) =>
          c.id === classId
            ? {
                ...c,
                pendingRequests: (c.pendingRequests ?? []).filter((r) => r.id !== requestId),
                _count:
                  decision === 'approve'
                    ? { users: (c._count?.users ?? 0) + 1 }
                    : c._count,
              }
            : c,
        ),
      )
      // Approval enrols the student server-side, but this component only just
      // patched ITS OWN `classes` state above — the parent's roster (the
      // actual student list/table) is a separate fetch and would otherwise
      // stay stale until a page reload.
      if (decision === 'approve') onApproved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update request')
    } finally {
      setDeciding((s) => {
        const next = new Set(s)
        next.delete(requestId)
        return next
      })
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
        Classes
      </h2>

      {classes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 border border-white/10 bg-[#0a1628] rounded-lg px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white block">{c.name}</span>
                  <span className="text-xs text-white/40">
                    {c._count?.users ?? 0} students
                    {c.school?.name ? ` · ${c.school.name}` : ''}
                  </span>
                </div>
                {c.joinCode && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(c.joinCode!)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F5C518] tracking-widest hover:brightness-110 transition-all cursor-pointer"
                        title="Copy class code"
                      >
                        {c.joinCode}
                        {copied && copiedCode === c.joinCode ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => regenerate(c.id)}
                        disabled={regenerating === c.id}
                        className="text-white/40 hover:text-[#F5C518] disabled:opacity-40 transition-colors cursor-pointer"
                        title="Regenerate code (revokes the current one)"
                      >
                        <RefreshCw size={13} className={regenerating === c.id ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    {clipboardError && copiedCode === c.joinCode && (
                      <span className="text-[11px] text-red-400">{clipboardError}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Pending join requests — the teacher-approval gate. */}
              {(c.pendingRequests?.length ?? 0) > 0 && (
                <div className="border-t border-white/10 pt-2 space-y-1.5">
                  <span className="text-[11px] font-medium text-amber-300/80 flex items-center gap-1.5">
                    <Clock size={11} /> {c.pendingRequests!.length} awaiting approval
                  </span>
                  {c.pendingRequests!.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white/80 truncate">{r.studentName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => decide(c.id, r.id, 'approve')}
                          disabled={deciding.has(r.id)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-300 border border-emerald-400/30 rounded px-2 py-1 hover:bg-emerald-400/10 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(c.id, r.id, 'deny')}
                          disabled={deciding.has(r.id)}
                          className="inline-flex items-center gap-1 text-xs text-white/50 border border-white/15 rounded px-2 py-1 hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Deny"
                        >
                          <X size={12} /> Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create class form */}
      <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New class name (e.g. Period 3 Biology)"
            maxLength={80}
            className="flex-1 min-w-[180px] bg-[#0d1b2e] border border-white/15 rounded-md text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 transition-colors"
          />
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="School (optional)"
            maxLength={120}
            className="min-w-[140px] bg-[#0d1b2e] border border-white/15 rounded-md text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 transition-colors"
          />
          <BusyButton
            busy={busy}
            busyLabel="Creating…"
            disabled={!name.trim()}
            icon={<Plus size={14} />}
            onClick={create}
            className="inline-flex items-center gap-1.5 bg-[#F5C518] text-[#0d1b2e] text-sm font-medium px-4 py-2 rounded-md hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
          >
            Create class
          </BusyButton>
        </div>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>
    </section>
  )
}
