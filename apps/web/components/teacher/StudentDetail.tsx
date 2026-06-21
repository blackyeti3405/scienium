'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ChevronLeft, Send } from 'lucide-react'

interface Detail {
  student: { id: string; name: string }
  team: {
    id: string
    name: string
    phase: string
    labType: string | null
    topic: string | null
    researchIdea: string | null
    currency: { kp: number; clearanceLevel: number; lc: number } | null
    members: { user: { id: string; name: string } }[]
  } | null
  papers?: { id: string; title: string }[]
  logs?: { id: string; entryType: string; stage: string | null; body: string; createdAt: string }[]
  pendingRequest?: { id: string; fromPhase: string; toPhase: string } | null
  feedback?: { id: string; targetType: string; body: string; resolved: boolean; createdAt: string }[]
}

const PHASE_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  lab_selection: 'Lab Selection',
  literature_review: 'Literature Review',
  research_planning: 'Research Planning',
  working: 'Working',
  showcase: 'Showcase',
}

export function StudentDetail({ studentId }: { studentId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/teacher/student/${studentId}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true)
          return null
        }
        return r.json()
      })
      .then((d) => d && setDetail(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/30" size={24} />
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="font-pixel text-[9px] text-white/40">
          This student isn’t in your classes.
        </p>
      </div>
    )
  }

  const { team } = detail

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <h1 className="text-lg text-white font-medium">{detail.student.name}</h1>
        {team && (
          <p className="font-pixel text-[8px] text-white/45 mt-1">
            {team.name} · {PHASE_LABEL[team.phase] ?? team.phase}
            {team.labType ? ` · ${team.labType}` : ''}
          </p>
        )}
      </div>

      {!team ? (
        <p className="font-pixel text-[9px] text-white/40">
          This student hasn’t joined a lab yet.
        </p>
      ) : (
        <>
          {detail.pendingRequest && (
            <div className="border border-amber-400/40 bg-amber-400/5 px-4 py-2.5">
              <span className="font-pixel text-[8px] text-amber-300">
                Awaiting validation: {PHASE_LABEL[detail.pendingRequest.fromPhase]} →{' '}
                {PHASE_LABEL[detail.pendingRequest.toPhase]} ·{' '}
                <Link href="/teacher/validations" className="underline">
                  review
                </Link>
              </span>
            </div>
          )}

          <Section title="Project">
            {team.topic && <Field label="Topic" value={team.topic} />}
            {team.researchIdea && <Field label="Research idea" value={team.researchIdea} />}
            <Field
              label="Team"
              value={team.members.map((m) => m.user.name).join(', ')}
            />
            {team.currency && (
              <Field
                label="Currency"
                value={`${team.currency.kp} KP · CLR ${team.currency.clearanceLevel} · ${team.currency.lc} LC`}
              />
            )}
          </Section>

          <Section title={`Papers · ${detail.papers?.length ?? 0}`}>
            {detail.papers && detail.papers.length > 0 ? (
              <ul className="space-y-1">
                {detail.papers.map((p) => (
                  <li key={p.id} className="text-xs text-white/70 truncate">
                    • {p.title}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No papers reviewed yet.</Empty>
            )}
          </Section>

          <Section title="Recent logs">
            {detail.logs && detail.logs.length > 0 ? (
              <ul className="space-y-2">
                {detail.logs.map((l) => (
                  <li key={l.id} className="text-xs text-white/70">
                    <span
                      className={`font-pixel text-[7px] uppercase mr-2 ${
                        l.entryType === 'failure' ? 'text-orange-400' : 'text-emerald-400'
                      }`}
                    >
                      {l.entryType}
                    </span>
                    {l.stage ? `${l.stage}: ` : ''}
                    {l.body.slice(0, 120)}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No project logs yet.</Empty>
            )}
          </Section>

          <FeedbackPanel teamId={team.id} initial={detail.feedback ?? []} />
        </>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/teacher"
      className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70"
    >
      <ChevronLeft size={12} /> Roster
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">{title}</h2>
      <div className="border border-white/10 bg-[#0a1628] p-3 space-y-1.5">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-pixel text-[7px] text-white/35 uppercase w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="font-pixel text-[8px] text-white/30">{children}</span>
}

function FeedbackPanel({
  teamId,
  initial,
}: {
  teamId: string
  initial: { id: string; targetType: string; body: string; resolved: boolean; createdAt: string }[]
}) {
  const [items, setItems] = useState(initial)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/teacher/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, targetType: 'team', body }),
      })
      const out = await res.json()
      if (res.ok) {
        setItems((list) => [out.feedback, ...list])
        setBody('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Feedback">
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave feedback the team will see…"
          maxLength={2000}
          className="flex-1 bg-[#0d1b2e] border border-white/15 text-white text-xs px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !body.trim()}
          className="inline-flex items-center gap-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
        >
          <Send size={11} /> Send
        </button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {items.map((f) => (
            <li key={f.id} className="text-xs text-white/65 border-l-2 border-[#F5C518]/30 pl-2">
              {f.body}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
