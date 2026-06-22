'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ChevronLeft, Send, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionTabs } from '@/components/ui/SectionTabs'
import {
  PHASE_ORDER,
  PHASE_INFO,
  LAB_TYPE_LABELS,
  type Phase,
  type LabType,
} from '@/lib/phase'
import { TEACHER_GATED_TRANSITIONS } from '@/lib/team/advance'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OverviewStudent {
  id: string
  name: string
  email: string
  createdAt: string
  class: { id: string; name: string } | null
  memberRole: 'lead' | 'member' | null
  joinedAt: string | null
}

interface OverviewTeam {
  id: string
  name: string
  phase: string
  labType: string | null
  topic: string | null
  researchIdea: string | null
  currency: { kp: number; clearanceLevel: number; lc: number } | null
  members: { user: { id: string; name: string }; role: string }[]
}

interface PendingAdvance {
  fromPhase: string
  toPhase: string
  note: string | null
  requestedBy: { name: string }
  createdAt: string
}

interface TeamBuilding {
  name: string
  currentLevel: number
  lastUpgradedAt: string | null
  lastUpgradedByName: string | null
}

interface ShopBuilding {
  buildingKey: string
  name: string
  description: string
  purchasedByName: string | null
  purchasedAt: string
}

interface LitProgress {
  sourceCount: number
  sourceTarget: number
  members: { userId: string; name: string; demonstratedCount: number; ready: boolean }[]
  canAdvance: boolean
}

interface StudentProficiency {
  demonstrated: boolean
  bestScore: number
  paper: { id: string; title: string }
}

interface PaperRow {
  id: string
  title: string
  status: string
  authors: string[]
}

interface ResearchPlan {
  projectType: string | null
  projectSubtype: string | null
  lastReviewJson: unknown
  lastReviewedAt: string | null
  lastIdeaCheckJson: unknown
  lastIdeaCheckAt: string | null
}

interface LogRow {
  id: string
  entryType: string
  stage: string | null
  body: string
  createdAt: string
  createdBy: { name: string }
  followups: { question: string; response: string | null; answeredAt: string | null }[]
}

interface ExperimentRow {
  id: string
  title: string
  _count: { measurements: number }
}

interface ShowcaseRow {
  slug: string
  privacyLevel: string
  moderationStatus: string
  _count: { assets: number; views: number }
}

interface DispatchResponse {
  response: string
  createdAt: string
  content: { publishedDate: string; reflectionQuestion: string }
}

interface FairAssoc {
  isPrimary: boolean
  fair: { id: string; name: string; level: string }
}

interface FormStatus {
  status: string
  form: { name: string }
}

interface ActivityRow {
  description: string
  userName: string
  createdAt: string
}

interface FeedbackRow {
  id: string
  targetType: string
  body: string
  resolved: boolean
  createdAt: string
}

interface Overview {
  student: OverviewStudent
  team: OverviewTeam | null
  pendingAdvance: PendingAdvance | null
  studentKp: number
  teamBuildings: TeamBuilding[]
  shopBuildings: ShopBuilding[]
  litProgress: LitProgress
  studentProficiencies: StudentProficiency[]
  papers: PaperRow[]
  researchPlan: ResearchPlan | null
  logs: LogRow[]
  experiments: ExperimentRow[]
  showcase: ShowcaseRow | null
  fieldDispatch: { streak: number; responses: DispatchResponse[] }
  fairAssociations: FairAssoc[]
  formStatuses: FormStatus[]
  activity: ActivityRow[]
  feedback: FeedbackRow[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Field({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="font-pixel text-[7px] text-white/35 uppercase w-28 shrink-0 pt-0.5 tracking-wider">
        {label}
      </span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-pixel text-[8px] text-white/30 py-2">{children}</p>
}

function PhaseBadge({ phase }: { phase: string }) {
  const info = PHASE_INFO[phase as Phase]
  if (!info) return <span className="text-white/50 text-sm">{phase}</span>
  return (
    <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/70">
      {info.label}
    </span>
  )
}

// ─── Section renderers ─────────────────────────────────────────────────────────

function IdentitySection({ overview }: { overview: Overview }) {
  const { student, team } = overview
  const phase = team?.phase as Phase | undefined
  const labTypeLabel = team?.labType ? (LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType) : null

  return (
    <Card>
      <div className="space-y-2">
        <Field label="Name" value={student.name} />
        <Field label="Email" value={student.email} />
        {student.class && <Field label="Class" value={student.class.name} />}
        {student.memberRole && <Field label="Role" value={student.memberRole} />}
        <Field label="Joined" value={fmtDate(student.joinedAt ?? student.createdAt)} />
        {team && <Field label="Team" value={team.name} />}
        {labTypeLabel && <Field label="Lab type" value={labTypeLabel} />}
        {phase && (
          <Field label="Phase" value={<PhaseBadge phase={phase} />} />
        )}
      </div>
    </Card>
  )
}

function PhaseSection({ overview }: { overview: Overview }) {
  const { team, pendingAdvance } = overview
  if (!team) return <Empty>No team yet.</Empty>

  const currentPhase = team.phase as Phase
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)

  return (
    <Card>
      <div className="space-y-3">
        {/* Phase ladder */}
        <div className="flex flex-wrap gap-2">
          {PHASE_ORDER.map((p, idx) => {
            const info = PHASE_INFO[p]
            const isCurrent = p === currentPhase
            const isPast = idx < currentIdx
            const isGated = p in TEACHER_GATED_TRANSITIONS
            return (
              <div
                key={p}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 border text-xs ${
                  isCurrent
                    ? 'border-[#F5C518]/60 bg-[#F5C518]/5 text-white'
                    : isPast
                    ? 'border-white/10 bg-white/[0.02] text-white/40'
                    : 'border-white/5 text-white/25'
                }`}
              >
                <span>{info.label}</span>
                {isGated && (
                  <span className="font-pixel text-[6px] text-amber-400/70 uppercase">teacher</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Pending advance */}
        {pendingAdvance && (
          <div className="border border-amber-400/30 bg-amber-400/5 px-3 py-2 space-y-1">
            <p className="font-pixel text-[8px] text-amber-300 uppercase tracking-widest">
              Pending advance request
            </p>
            <p className="text-sm text-white/80">
              {PHASE_INFO[pendingAdvance.fromPhase as Phase]?.label ?? pendingAdvance.fromPhase}
              {' → '}
              {PHASE_INFO[pendingAdvance.toPhase as Phase]?.label ?? pendingAdvance.toPhase}
            </p>
            <p className="text-xs text-white/50">
              Requested by {pendingAdvance.requestedBy.name} on {fmtDate(pendingAdvance.createdAt)}
            </p>
            {pendingAdvance.note && (
              <p className="text-sm text-white/70 italic">&ldquo;{pendingAdvance.note}&rdquo;</p>
            )}
            <Link
              href="/teacher/validations"
              className="inline-block font-pixel text-[8px] text-amber-300 underline mt-1"
            >
              Review in Validations →
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}

function EconomySection({ overview }: { overview: Overview }) {
  const { team, studentKp } = overview
  const currency = team?.currency

  return (
    <Card>
      {currency ? (
        <div className="space-y-2">
          <Field label="Team KP" value={currency.kp.toLocaleString()} />
          <Field label="Clearance" value={`Level ${currency.clearanceLevel}`} />
          <Field label="Lab Credits" value={currency.lc.toLocaleString()} />
          <div className="border-t border-white/10 pt-2 mt-2">
            <Field
              label="Student KP"
              value={
                <span data-testid="student-kp" className="text-[#F5C518]">
                  {studentKp.toLocaleString()}
                </span>
              }
            />
          </div>
        </div>
      ) : (
        <Empty>No economy data yet.</Empty>
      )}
    </Card>
  )
}

function BuildingsSection({ overview }: { overview: Overview }) {
  const { teamBuildings, shopBuildings } = overview
  const hasBuildings = teamBuildings.length > 0 || shopBuildings.length > 0

  if (!hasBuildings) {
    return (
      <Card>
        <Empty>No buildings yet.</Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {teamBuildings.length > 0 && (
        <Card label="Gateway buildings">
          <ul className="space-y-2">
            {teamBuildings.map((b, i) => (
              <li key={i} className="text-sm text-white/75 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="font-medium text-white">{b.name}</span>
                <span className="text-white/50">Lv {b.currentLevel}</span>
                {b.lastUpgradedByName && (
                  <span className="text-white/40 text-xs">
                    upgraded by {b.lastUpgradedByName}
                    {b.lastUpgradedAt ? ` · ${fmtDate(b.lastUpgradedAt)}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shopBuildings.length > 0 && (
        <Card label="Shop buildings">
          <ul className="space-y-2">
            {shopBuildings.map((b, i) => (
              <li key={i} className="text-sm space-y-0.5">
                <div className="flex flex-wrap gap-x-3 items-baseline">
                  <span className="font-medium text-white">{b.name}</span>
                  {b.purchasedByName && (
                    <span className="text-white/40 text-xs">
                      by {b.purchasedByName} · {fmtDate(b.purchasedAt)}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs">{b.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function LiteratureSection({ overview }: { overview: Overview }) {
  const { papers, litProgress, studentProficiencies } = overview
  const demonstratedCount = studentProficiencies.filter((p) => p.demonstrated).length

  return (
    <div className="space-y-4">
      {/* Source gate progress */}
      <Card label="Source gate">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium text-white" data-testid="source-count">
              {litProgress.sourceCount}
              <span className="text-white/40 text-base"> / {litProgress.sourceTarget}</span>
            </span>
            <span className="text-sm text-white/50">sources ready</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F5C518] rounded-full transition-all"
              style={{ width: `${Math.min(100, (litProgress.sourceCount / litProgress.sourceTarget) * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      {/* This student's proficiency */}
      <Card label="Student proficiency">
        <p className="text-sm text-white/70">
          <span className="text-white font-medium" data-testid="proficiency-count">
            {demonstratedCount}
          </span>{' '}
          of {litProgress.sourceTarget} sources demonstrated
        </p>
        {studentProficiencies.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {studentProficiencies.map((prof, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-white/65">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${prof.demonstrated ? 'bg-emerald-400' : 'bg-white/20'}`}
                />
                <span className="truncate flex-1">{prof.paper.title}</span>
                <span className="shrink-0 text-white/40">{prof.bestScore}%</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Paper list */}
      {papers.length > 0 && (
        <Card label={`All papers · ${papers.length}`}>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {papers.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1 w-2 h-2 shrink-0 rounded-full ${
                    p.status === 'ready'
                      ? 'bg-emerald-400'
                      : p.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-white/30'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 truncate">{p.title}</p>
                  <p className="text-white/40 text-xs">
                    {p.authors.length > 0 ? p.authors.slice(0, 2).join(', ') : 'No authors'} · {p.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ResearchPlanSection({ overview }: { overview: Overview }) {
  const { researchPlan } = overview

  if (!researchPlan) {
    return (
      <Card>
        <Empty>No research plan yet.</Empty>
      </Card>
    )
  }

  const review = researchPlan.lastReviewJson as Record<string, unknown> | null
  const ideaCheck = researchPlan.lastIdeaCheckJson as Record<string, unknown> | null

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-2">
          {researchPlan.projectType && (
            <Field label="Type" value={researchPlan.projectType} />
          )}
          {researchPlan.projectSubtype && (
            <Field label="Subtype" value={researchPlan.projectSubtype} />
          )}
          {!researchPlan.projectType && !researchPlan.projectSubtype && (
            <Empty>Project type not set yet.</Empty>
          )}
        </div>
      </Card>

      {review && (
        <Card label="Last AI review">
          <p className="text-xs text-white/40">{fmtDate(researchPlan.lastReviewedAt)}</p>
          {typeof review.summary === 'string' && (
            <p className="text-sm text-white/75 mt-1">{review.summary}</p>
          )}
          {typeof review.verdict === 'string' && (
            <p className="text-sm text-white/75 mt-1">Verdict: {review.verdict}</p>
          )}
        </Card>
      )}

      {ideaCheck && (
        <Card label="Idea originality check">
          <p className="text-xs text-white/40">{fmtDate(researchPlan.lastIdeaCheckAt)}</p>
          {typeof ideaCheck.verdict === 'string' && (
            <p
              className={`text-sm font-medium mt-1 ${
                ideaCheck.verdict === 'novel'
                  ? 'text-emerald-400'
                  : ideaCheck.verdict === 'reject'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {ideaCheck.verdict}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

function LogsSection({ overview }: { overview: Overview }) {
  const { logs } = overview

  if (logs.length === 0) {
    return (
      <Card>
        <Empty>No project logs yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="space-y-4">
        {logs.map((log) => (
          <li key={log.id} className="space-y-1.5 border-l-2 border-white/10 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-pixel text-[7px] uppercase tracking-widest ${
                  log.entryType === 'failure' ? 'text-orange-400' : 'text-emerald-400'
                }`}
              >
                {log.entryType}
              </span>
              {log.stage && (
                <span className="text-xs text-white/40">{log.stage}</span>
              )}
              <span className="text-xs text-white/35">{fmtDate(log.createdAt)}</span>
              <span className="text-xs text-white/35">by {log.createdBy.name}</span>
            </div>
            <p className="text-sm text-white/75">{log.body}</p>

            {log.followups.length > 0 && (
              <ul className="mt-2 space-y-2 pl-2">
                {log.followups.map((fu, i) => (
                  <li key={i} className="space-y-0.5">
                    <p className="text-xs text-white/50 italic">{fu.question}</p>
                    {fu.response ? (
                      <p className="text-sm text-white/70">{fu.response}</p>
                    ) : (
                      <p className="font-pixel text-[7px] text-white/25">Awaiting response…</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ExperimentsSection({ overview }: { overview: Overview }) {
  const { experiments } = overview

  if (experiments.length === 0) {
    return (
      <Card>
        <Empty>No experiments yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="space-y-2">
        {experiments.map((exp) => (
          <li key={exp.id} className="flex items-center justify-between text-sm">
            <span className="text-white/80">{exp.title}</span>
            <span className="text-white/40 text-xs">
              {exp._count.measurements} measurement{exp._count.measurements !== 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ShowcaseSection({ overview }: { overview: Overview }) {
  const { showcase } = overview

  if (!showcase) {
    return (
      <Card>
        <Empty>No showcase published yet.</Empty>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-2">
        <Field label="Privacy" value={showcase.privacyLevel.replace(/_/g, ' ')} />
        <Field
          label="Status"
          value={
            <span
              className={
                showcase.moderationStatus === 'approved'
                  ? 'text-emerald-400'
                  : showcase.moderationStatus === 'rejected'
                  ? 'text-red-400'
                  : 'text-white/70'
              }
            >
              {showcase.moderationStatus.replace(/_/g, ' ')}
            </span>
          }
        />
        <Field label="Assets" value={String(showcase._count.assets)} />
        <Field label="Views" value={String(showcase._count.views)} />
        <div className="pt-2">
          <Link
            href={`/showcase/${showcase.slug}`}
            className="inline-flex items-center gap-1 font-pixel text-[8px] text-[#F5C518] hover:brightness-110"
            target="_blank"
            rel="noopener noreferrer"
          >
            View showcase <ExternalLink size={10} />
          </Link>
        </div>
      </div>
    </Card>
  )
}

function FieldDispatchSection({ overview }: { overview: Overview }) {
  const { fieldDispatch } = overview

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-medium text-[#F5C518]">{fieldDispatch.streak}</span>
          <span className="text-sm text-white/50">day streak</span>
        </div>

        {fieldDispatch.responses.length > 0 ? (
          <ul className="space-y-3 mt-2">
            {fieldDispatch.responses.map((r, i) => (
              <li key={i} className="space-y-1 border-l-2 border-white/10 pl-3">
                <p className="text-xs text-white/40">{fmtDate(r.createdAt)}</p>
                <p className="text-xs text-white/50 italic">{r.content.reflectionQuestion}</p>
                <p className="text-sm text-white/75">{r.response}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No field dispatch responses yet.</Empty>
        )}
      </div>
    </Card>
  )
}

function ScienceFairSection({ overview }: { overview: Overview }) {
  const { fairAssociations, formStatuses } = overview

  return (
    <div className="space-y-4">
      {fairAssociations.length > 0 ? (
        <Card label="Registered fairs">
          <ul className="space-y-1.5">
            {fairAssociations.map((fa, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-white/80">{fa.fair.name}</span>
                <span className="text-white/40 text-xs">{fa.fair.level}</span>
                {fa.isPrimary && (
                  <span className="font-pixel text-[7px] text-[#F5C518] uppercase">primary</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card label="Registered fairs">
          <Empty>No fairs registered.</Empty>
        </Card>
      )}

      {formStatuses.length > 0 && (
        <Card label="Form statuses">
          <ul className="space-y-1.5">
            {formStatuses.map((fs, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{fs.form.name}</span>
                <span
                  className={`font-pixel text-[7px] uppercase ${
                    fs.status === 'complete'
                      ? 'text-emerald-400'
                      : fs.status === 'in_progress'
                      ? 'text-amber-400'
                      : 'text-white/30'
                  }`}
                >
                  {fs.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ActivitySection({ overview }: { overview: Overview }) {
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
      <ul className="space-y-2">
        {activity.map((a, i) => (
          <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
            <span className="text-white/70">{a.description}</span>
            <span className="text-white/40 text-xs">— {a.userName}</span>
            <span className="text-white/30 text-xs">{fmtDate(a.createdAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function FeedbackSection({
  teamId,
  initial,
}: {
  teamId: string
  initial: FeedbackRow[]
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
    <Card>
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave feedback the team will see…"
          maxLength={2000}
          className="flex-1 bg-[#0d1b2e] border border-white/15 text-white text-sm px-2.5 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
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

// ─── Main component ────────────────────────────────────────────────────────────

export function StudentDetail({ studentId }: { studentId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/teacher/student/${studentId}/overview`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true)
          return null
        }
        if (!r.ok) {
          setNotFound(true)
          return null
        }
        return r.json() as Promise<Overview>
      })
      .then((d) => d && setOverview(d))
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

  if (notFound || !overview) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="font-pixel text-[9px] text-white/40">
          This student isn&apos;t in your classes.
        </p>
      </div>
    )
  }

  const { student, team, pendingAdvance } = overview

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">{student.name}</h1>
        {team && (
          <p className="text-sm text-white/50 mt-0.5">
            {team.name}
            {team.labType ? ` · ${LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType}` : ''}
            {team.phase ? ` · ${PHASE_INFO[team.phase as Phase]?.label ?? team.phase}` : ''}
          </p>
        )}
      </div>

      {/* Pending advance banner */}
      {pendingAdvance && (
        <div className="border border-amber-400/40 bg-amber-400/5 px-4 py-2.5">
          <span className="font-pixel text-[8px] text-amber-300">
            Awaiting validation:{' '}
            {PHASE_INFO[pendingAdvance.fromPhase as Phase]?.label ?? pendingAdvance.fromPhase}
            {' → '}
            {PHASE_INFO[pendingAdvance.toPhase as Phase]?.label ?? pendingAdvance.toPhase}
            {' · '}
            <Link href="/teacher/validations" className="underline">
              review
            </Link>
          </span>
        </div>
      )}

      {!team ? (
        <div className="border border-white/10 bg-[#0a1628] px-4 py-8 text-center">
          <p className="font-pixel text-[9px] text-white/40">
            This student hasn&apos;t joined a lab yet.
          </p>
          <div className="mt-4 space-y-2">
            <Field label="Email" value={student.email} />
            {student.class && <Field label="Class" value={student.class.name} />}
          </div>
        </div>
      ) : (
        <SectionTabs
          tabs={[
            {
              key: 'identity',
              label: 'Identity',
              content: <IdentitySection overview={overview} />,
            },
            {
              key: 'phase',
              label: 'Phase',
              content: <PhaseSection overview={overview} />,
            },
            {
              key: 'economy',
              label: 'Economy',
              content: <EconomySection overview={overview} />,
            },
            {
              key: 'buildings',
              label: 'Buildings',
              content: <BuildingsSection overview={overview} />,
            },
            {
              key: 'literature',
              label: 'Literature',
              content: <LiteratureSection overview={overview} />,
            },
            {
              key: 'research',
              label: 'Research',
              content: <ResearchPlanSection overview={overview} />,
            },
            {
              key: 'logs',
              label: 'Logs',
              content: <LogsSection overview={overview} />,
            },
            {
              key: 'experiments',
              label: 'Experiments',
              content: <ExperimentsSection overview={overview} />,
            },
            {
              key: 'showcase',
              label: 'Showcase',
              content: <ShowcaseSection overview={overview} />,
            },
            {
              key: 'dispatch',
              label: 'Dispatch',
              content: <FieldDispatchSection overview={overview} />,
            },
            {
              key: 'fairs',
              label: 'Fairs',
              content: <ScienceFairSection overview={overview} />,
            },
            {
              key: 'activity',
              label: 'Activity',
              content: <ActivitySection overview={overview} />,
            },
            {
              key: 'feedback',
              label: 'Feedback',
              content: <FeedbackSection teamId={team.id} initial={overview.feedback} />,
            },
          ]}
        />
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
