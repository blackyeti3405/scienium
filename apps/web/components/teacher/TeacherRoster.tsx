'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Copy, Check, AlertCircle, Clock } from 'lucide-react'

interface RosterStudent {
  studentId: string
  name: string
  teamId: string | null
  teamName: string | null
  phase: string | null
  labType: string | null
  readyPapers: number
  lastActivityAt: string | null
  flags: { pendingValidation: string | null; staleLog: boolean }
}
interface ClassRow {
  id: string
  name: string
  joinCode: string | null
  school?: { name: string }
  _count?: { users: number }
}

const PHASE_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  lab_selection: 'Lab Selection',
  literature_review: 'Lit Review',
  research_planning: 'Research Plan',
  working: 'Working',
  showcase: 'Showcase',
}

export function TeacherRoster() {
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [attentionOnly, setAttentionOnly] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/teacher/roster').then((r) => r.json()),
      fetch('/api/teacher/class').then((r) => r.json()),
    ])
      .then(([roster, cls]) => {
        setStudents(roster.students ?? [])
        setClasses(cls.classes ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasAttention = (s: RosterStudent) => !!s.flags.pendingValidation || s.flags.staleLog
  const visible = attentionOnly ? students.filter(hasAttention) : students

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/30" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ClassManager classes={classes} onCreated={(c) => setClasses((list) => [c, ...list])} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-xs text-[#F5C518] uppercase tracking-widest">
            Roster · {students.length}
          </h2>
          <label className="flex items-center gap-2 font-pixel text-[8px] text-white/50 cursor-pointer">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(e) => setAttentionOnly(e.target.checked)}
            />
            Needs my attention
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="font-pixel text-[9px] text-white/30 py-8 text-center border border-dashed border-white/10">
            {students.length === 0
              ? 'No students yet — share a class code so students can join.'
              : 'No students need attention right now.'}
          </p>
        ) : (
          <div className="border border-white/10 divide-y divide-white/5">
            {visible.map((s) => (
              <Link
                key={s.studentId}
                href={`/teacher/student/${s.studentId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <span className="flex-1 text-sm text-white">{s.name}</span>
                {s.phase && (
                  <span className="font-pixel text-[7px] text-white/45 uppercase tracking-wider">
                    {PHASE_LABEL[s.phase] ?? s.phase}
                  </span>
                )}
                <span className="font-pixel text-[7px] text-white/35 w-20 text-right">
                  {s.readyPapers} papers
                </span>
                <span className="flex items-center gap-1.5 w-28 justify-end">
                  {s.flags.pendingValidation && (
                    <span
                      title="Awaiting validation"
                      className="inline-flex items-center gap-1 font-pixel text-[7px] text-amber-400"
                    >
                      <AlertCircle size={11} /> validate
                    </span>
                  )}
                  {s.flags.staleLog && (
                    <span
                      title="No recent project log"
                      className="inline-flex items-center gap-1 font-pixel text-[7px] text-orange-400"
                    >
                      <Clock size={11} /> stale
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ClassManager({
  classes,
  onCreated,
}: {
  classes: ClassRow[]
  onCreated: (c: ClassRow) => void
}) {
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

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
      onCreated(out.class)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <section className="space-y-3">
      <h2 className="font-pixel text-xs text-[#F5C518] uppercase tracking-widest">Classes</h2>

      {classes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {classes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-white/10 bg-[#0a1628] px-3 py-2.5"
            >
              <div>
                <span className="text-sm text-white block">{c.name}</span>
                <span className="font-pixel text-[7px] text-white/35">
                  {c._count?.users ?? 0} students
                </span>
              </div>
              {c.joinCode && (
                <button
                  type="button"
                  onClick={() => copy(c.joinCode!)}
                  className="inline-flex items-center gap-1.5 font-pixel text-[9px] text-[#F5C518] tracking-widest hover:brightness-110"
                  title="Copy class code"
                >
                  {c.joinCode}
                  {copied === c.joinCode ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border border-white/10 bg-[#0a1628] p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New class name (e.g. Period 3 Biology)"
          maxLength={80}
          className="flex-1 min-w-[180px] bg-[#0d1b2e] border border-white/15 text-white text-sm px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
        <input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="School (optional)"
          maxLength={120}
          className="min-w-[140px] bg-[#0d1b2e] border border-white/15 text-white text-sm px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2.5 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          <Plus size={11} /> Create class
        </button>
      </div>
      {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}
    </section>
  )
}
