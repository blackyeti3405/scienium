'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Send,
  ExternalLink,
  MessageSquare,
  FileText,
  User,
  TrendingUp,
  BookOpen,
  FlaskConical,
  ClipboardList,
  Zap,
  Building2,
  Trophy,
  ClipboardCheck,
  Flag,
  Activity,
  MessageCircle,
  Coins,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionTabs } from '@/components/ui/SectionTabs'
import { BusyButton } from '@/components/ui/BusyButton'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { TeacherRubricScoring } from '@/components/teacher/TeacherRubricScoring'
import {
  PHASE_ORDER,
  PHASE_INFO,
  LAB_TYPE_LABELS,
  type Phase,
  type LabType,
} from '@/lib/phase'
import { PaperQAPanel } from './student-detail/PaperQAPanel'

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
  googleDocUrl: string | null
  projectType: string | null
  projectSubtype: string | null
  lastReviewJson: unknown
  lastReviewedAt: string | null
  lastIdeaCheckJson: unknown
  lastIdeaCheckAt: string | null
}

// Typed shapes for researchPlan JSON fields
interface IdeaPriorWork {
  title?: string
  url?: string
  note?: string
}
interface IdeaFindings {
  summary: string
  priorWork: IdeaPriorWork[]
  differentiation: string
  recommendation: string
  citations: { title: string; url: string }[]
}
interface IdeaCheckResult {
  verdict: 'novel' | 'refine' | 'reject'
  findings: IdeaFindings
}
interface PlanReviewSectionRow {
  title: string
  score: number
  max: number
  assessment: string
}
interface PlanReviewResult {
  overall: { readiness: 'early' | 'promising' | 'strong'; score: number; summary: string } | null
  sections: PlanReviewSectionRow[]
  strengths: string[]
  gaps: string[]
  recommendations: string[]
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

interface CodexRecentLesson {
  trackLabel: string
  lessonLabel: string
  bestScore: number
  kpAwarded: number
  completedAt: string | null
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
  codex: { lessonsCompleted: number; kp: number; recent: CodexRecentLesson[] }
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
      <span className="text-white/40 w-28 shrink-0 text-xs">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/30 py-2">{children}</p>
}

// ─── Student Identity Header ───────────────────────────────────────────────────

function StudentHeader({ overview }: { overview: Overview }) {
  const { student, team, studentKp } = overview
  const phase = team?.phase as Phase | undefined
  const labTypeLabel = team?.labType
    ? (LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType)
    : null
  const currentIdx = phase ? PHASE_ORDER.indexOf(phase) : -1

  // Initials avatar
  const initials = student.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="border border-white/10 bg-[#0a1628] rounded-lg p-5 space-y-5">
      {/* Top row: avatar + name + meta */}
      <div className="flex items-start gap-4">
        {/* Circular initials avatar */}
        <div className="shrink-0 w-12 h-12 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/30 flex items-center justify-center">
          <span className="text-[#F5C518] text-sm font-semibold tabular-nums select-none">
            {initials || '?'}
          </span>
        </div>

        {/* Name + role + meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-white leading-none">{student.name}</h1>
            {student.memberRole && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  student.memberRole === 'lead'
                    ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]'
                    : 'bg-white/5 border-white/15 text-white/60'
                }`}
              >
                {student.memberRole}
              </span>
            )}
          </div>
          {/* Meta row */}
          <p className="text-sm text-white/45 flex flex-wrap gap-x-2 gap-y-0.5">
            {team && <span>{team.name}</span>}
            {labTypeLabel && (
              <>
                <span className="text-white/20">·</span>
                <span>{labTypeLabel}</span>
              </>
            )}
            {student.class && (
              <>
                <span className="text-white/20">·</span>
                <span>{student.class.name}</span>
              </>
            )}
            <span className="text-white/20">·</span>
            <span>Joined {fmtDate(student.joinedAt ?? student.createdAt)}</span>
          </p>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
              <Coins size={12} className="text-[#F5C518]" />
              <span className="tabular-nums text-white/80">
                {studentKp.toLocaleString()} KP
              </span>
            </span>
            {team?.currency && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                <Zap size={12} className="text-white/50" />
                <span className="tabular-nums text-white/80">
                  Clearance {team.currency.clearanceLevel}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phase stepper */}
      {team && (
        <div className="space-y-2">
          <p className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
            Phase
          </p>
          <div className="flex items-center gap-0">
            {PHASE_ORDER.map((p, idx) => {
              const info = PHASE_INFO[p]
              const isCurrent = p === phase
              const isPast = idx < currentIdx
              const isLast = idx === PHASE_ORDER.length - 1
              return (
                <div key={p} className="flex items-center flex-1 min-w-0">
                  {/* Step node */}
                  <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCurrent
                          ? 'bg-[#F5C518] ring-2 ring-[#F5C518]/30'
                          : isPast
                          ? 'bg-[#F5C518]/50'
                          : 'bg-white/15'
                      }`}
                    />
                    <span
                      className={`text-[10px] text-center leading-tight hidden sm:block truncate px-0.5 w-full ${
                        isCurrent
                          ? 'text-[#F5C518] font-medium'
                          : isPast
                          ? 'text-white/40'
                          : 'text-white/20'
                      }`}
                    >
                      {info.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`h-px flex-1 shrink-0 mx-1 ${
                        idx < currentIdx ? 'bg-[#F5C518]/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section renderers ─────────────────────────────────────────────────────────

function IdentitySection({ overview }: { overview: Overview }) {
  const { student, team } = overview
  const labTypeLabel = team?.labType
    ? (LAB_TYPE_LABELS[team.labType as LabType] ?? team.labType)
    : null

  return (
    <Card>
      <div className="space-y-2.5">
        <Field label="Name" value={student.name} />
        <Field label="Email" value={student.email} />
        {student.class && <Field label="Class" value={student.class.name} />}
        {student.memberRole && <Field label="Role" value={student.memberRole} />}
        <Field label="Joined" value={fmtDate(student.joinedAt ?? student.createdAt)} />
        {team && <Field label="Team" value={team.name} />}
        {labTypeLabel && <Field label="Lab type" value={labTypeLabel} />}
        {team?.topic && <Field label="Topic" value={team.topic} />}
        {team?.members && (
          <Field
            label="Team members"
            value={
              <span className="flex flex-wrap gap-1.5">
                {team.members.map((m) => (
                  <span
                    key={m.user.id}
                    className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-white/70"
                  >
                    {m.user.name}
                    {m.role === 'lead' && (
                      <span className="ml-1 text-[#F5C518]/70">★</span>
                    )}
                  </span>
                ))}
              </span>
            }
          />
        )}
      </div>
    </Card>
  )
}

function PhaseSection({ overview }: { overview: Overview }) {
  const { team } = overview
  if (!team) return <Empty>No team yet.</Empty>

  const currentPhase = team.phase as Phase
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          {/* Phase cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PHASE_ORDER.map((p, idx) => {
              const info = PHASE_INFO[p]
              const isCurrent = p === currentPhase
              const isPast = idx < currentIdx
              return (
                <div
                  key={p}
                  className={`rounded-md px-3 py-2.5 border text-sm ${
                    isCurrent
                      ? 'border-[#F5C518]/50 bg-[#F5C518]/[0.06] text-white'
                      : isPast
                      ? 'border-white/10 bg-white/[0.02] text-white/40'
                      : 'border-white/5 text-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium">{info.label}</span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] shrink-0" />
                    )}
                    {isPast && (
                      <span className="text-[#F5C518]/50 text-xs">✓</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

    </div>
  )
}

function EconomySection({ overview }: { overview: Overview }) {
  const { team, studentKp } = overview
  const currency = team?.currency

  if (!currency) {
    return (
      <Card>
        <Empty>No economy data yet.</Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Coins size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-[#F5C518]" data-testid="student-kp">
            {studentKp.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Student KP</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Coins size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.kp.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Team KP</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Zap size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.clearanceLevel}
          </span>
          <span className="text-xs text-white/50">Clearance Level</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Activity size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {currency.lc.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Lab Credits</span>
        </div>
      </div>
    </div>
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
          <ul className="space-y-2.5">
            {teamBuildings.map((b, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-white">{b.name}</span>
                  <span className="ml-2 text-white/50 text-xs">Lv {b.currentLevel}</span>
                </div>
                {b.lastUpgradedByName && (
                  <span className="text-white/35 text-xs">
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
          <ul className="space-y-3">
            {shopBuildings.map((b, i) => (
              <li key={i} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{b.name}</span>
                  {b.purchasedByName && (
                    <span className="text-white/35 text-xs">
                      {b.purchasedByName} · {fmtDate(b.purchasedAt)}
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

// ─── Literature section ─────────────────────────────────────────────────────────

function LiteratureSection({ overview }: { overview: Overview }) {
  const { papers, litProgress, studentProficiencies } = overview
  const studentId = overview.student.id
  const demonstratedCount = studentProficiencies.filter((p) => p.demonstrated).length

  const [openPaperId, setOpenPaperId] = useState<string | null>(null)
  const profMap = new Map(studentProficiencies.map((sp) => [sp.paper.id, sp]))

  const pct = Math.min(100, (litProgress.sourceCount / litProgress.sourceTarget) * 100)

  return (
    <div className="space-y-4">
      {/* Source gate progress */}
      <Card label="Source gate">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white" data-testid="source-count">
              {litProgress.sourceCount}
            </span>
            <span className="text-white/40 text-sm">/ {litProgress.sourceTarget} sources ready</span>
          </div>
          <PixelProgressBar value={pct} />
          <p className="text-sm text-white/50">
            <span className="text-white font-medium" data-testid="proficiency-count">
              {demonstratedCount}
            </span>{' '}
            of {litProgress.sourceTarget} demonstrated by this student
          </p>
        </div>
      </Card>

      {/* Per-source list */}
      {papers.length > 0 && (
        <Card label={`Sources · ${papers.length}`}>
          <ul className="space-y-2">
            {papers.map((p) => {
              const prof = profMap.get(p.id) ?? null
              const authorStr =
                p.authors.length === 0
                  ? 'No authors'
                  : p.authors.length <= 2
                  ? p.authors.join(', ')
                  : `${p.authors.slice(0, 2).join(', ')} et al.`

              return (
                <li
                  key={p.id}
                  className="flex items-start gap-3 border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2.5"
                >
                  {/* Status dot */}
                  <span
                    className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${
                      p.status === 'ready'
                        ? 'bg-emerald-400'
                        : p.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-white/30'
                    }`}
                  />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm text-white/85 leading-snug">{p.title}</p>
                    <p className="text-xs text-white/40">{authorStr}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {/* Proficiency badge */}
                    {prof ? (
                      prof.demonstrated ? (
                        <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Proficient · {prof.bestScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-white/35 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Not demonstrated
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-white/25 whitespace-nowrap">
                        No attempt
                      </span>
                    )}

                    {/* Q&A button */}
                    <button
                      type="button"
                      onClick={() => setOpenPaperId(p.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#F5C518] hover:brightness-110 transition-all cursor-pointer"
                      title="View quiz results and chat transcript"
                    >
                      <MessageSquare size={12} /> Q&amp;A
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {papers.length === 0 && (
        <Card>
          <Empty>No sources added yet.</Empty>
        </Card>
      )}

      {/* Q&A modal */}
      {openPaperId && (
        <PaperQAPanel
          studentId={studentId}
          paperId={openPaperId}
          onClose={() => setOpenPaperId(null)}
        />
      )}
    </div>
  )
}

// ─── Research plan helpers ─────────────────────────────────────────────────────

function OriginalityCheckDisplay({
  check,
  checkedAt,
}: {
  check: IdeaCheckResult
  checkedAt: string | null
}) {
  const v = check.verdict
  const verdictStyle =
    v === 'novel'
      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
      : v === 'reject'
      ? 'bg-red-400/10 text-red-400 border-red-400/20'
      : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
  const verdictLabel = v === 'novel' ? 'Novel' : v === 'reject' ? 'Reject' : 'Refine'
  const priorWork = check.findings?.priorWork ?? []
  const citations = check.findings?.citations ?? []

  return (
    <div className="space-y-4">
      {/* Verdict pill + summary */}
      <div className="flex items-start gap-3 flex-wrap">
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border ${verdictStyle}`}
        >
          {verdictLabel}
        </span>
        {check.findings?.summary && (
          <p className="text-sm text-white/75 leading-relaxed flex-1 min-w-0">
            {check.findings.summary}
          </p>
        )}
      </div>

      {/* Prior work */}
      {priorWork.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-pixel text-[9px] text-white/40 uppercase tracking-widest">
            Prior work
          </p>
          <ul className="space-y-2">
            {priorWork.map((pw, i) => (
              <li
                key={i}
                className="border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2 space-y-0.5"
              >
                {pw.url ? (
                  <a
                    href={pw.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-300 hover:text-blue-200 transition-colors inline-flex items-center gap-1"
                  >
                    {pw.title ?? pw.url}
                    <ExternalLink size={10} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm text-white/80">{pw.title}</span>
                )}
                {pw.note && (
                  <p className="text-xs text-white/45 leading-relaxed">{pw.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it could differ */}
      {check.findings?.differentiation && (
        <div className="space-y-1">
          <p className="font-pixel text-[9px] text-white/40 uppercase tracking-widest">
            How it could differ
          </p>
          <p className="text-sm text-white/65 leading-relaxed">
            {check.findings.differentiation}
          </p>
        </div>
      )}

      {/* Recommendation */}
      {check.findings?.recommendation && (
        <div className="border border-[#F5C518]/25 bg-[#F5C518]/5 rounded-md px-3 py-2.5 space-y-1">
          <p className="font-pixel text-[9px] text-[#F5C518]/70 uppercase tracking-widest">
            Recommendation
          </p>
          <p className="text-sm text-white/75 leading-relaxed">
            {check.findings.recommendation}
          </p>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-pixel text-[9px] text-white/40 uppercase tracking-widest">
            Sources
          </p>
          <ul className="space-y-1">
            {citations.map((c, i) => (
              <li key={i}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <ExternalLink size={9} className="shrink-0" />
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkedAt && (
        <p className="text-xs text-white/30">Checked {fmtDate(checkedAt)}</p>
      )}
    </div>
  )
}

function ReviewBulletColumn({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="font-pixel text-[9px] text-white/40 uppercase tracking-widest mb-1.5">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-sm text-white/65 leading-relaxed">
            <span className={`shrink-0 ${color}`}>▪</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlanReviewDisplay({
  review,
  reviewedAt,
}: {
  review: PlanReviewResult
  reviewedAt: string | null
}) {
  const readiness = review.overall?.readiness ?? 'early'
  const overallStyle =
    readiness === 'strong'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : readiness === 'promising'
      ? 'border-[#F5C518]/30 bg-[#F5C518]/10'
      : 'border-orange-500/30 bg-orange-500/10'
  const badgeStyle =
    readiness === 'strong'
      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
      : readiness === 'promising'
      ? 'bg-[#F5C518]/10 text-[#F5C518] border-[#F5C518]/20'
      : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
  const sections = review.sections ?? []
  const strengths = review.strengths ?? []
  const gaps = review.gaps ?? []
  const recommendations = review.recommendations ?? []

  return (
    <div className="space-y-4">
      {/* Overall */}
      {review.overall && (
        <div className={`border rounded-md px-4 py-3 space-y-1.5 ${overallStyle}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${badgeStyle}`}
            >
              {readiness}
            </span>
            <span className="text-sm font-semibold tabular-nums text-white">
              {review.overall.score}
            </span>
          </div>
          <p className="text-sm text-white/75 leading-relaxed">{review.overall.summary}</p>
        </div>
      )}

      {/* Section-by-section rows */}
      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map((s, i) => {
            const pct = s.max ? Math.min(100, (s.score / s.max) * 100) : 0
            return (
              <div
                key={i}
                className="border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-white/85">{s.title}</span>
                  <span className="text-xs text-white/40 shrink-0 tabular-nums">
                    {s.score}/{s.max}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full my-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#F5C518] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{s.assessment}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Three-column bullet lists */}
      {(strengths.length > 0 || gaps.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReviewBulletColumn title="Strengths" items={strengths} color="text-emerald-400" />
          <ReviewBulletColumn title="Gaps" items={gaps} color="text-orange-400" />
          <ReviewBulletColumn title="Next steps" items={recommendations} color="text-[#F5C518]" />
        </div>
      )}

      {reviewedAt && (
        <p className="text-xs text-white/30">Reviewed {fmtDate(reviewedAt)}</p>
      )}
    </div>
  )
}

// ─── Research plan section ─────────────────────────────────────────────────────

function ResearchPlanSection({ overview }: { overview: Overview }) {
  const { researchPlan } = overview

  if (!researchPlan) {
    return (
      <Card>
        <Empty>No research plan yet.</Empty>
      </Card>
    )
  }

  const ideaCheck = researchPlan.lastIdeaCheckJson as IdeaCheckResult | null
  const review = researchPlan.lastReviewJson as PlanReviewResult | null

  return (
    <div className="space-y-4">
      {/* ── Header: type/subtype + doc link ── */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
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
          {researchPlan.googleDocUrl ? (
            <a
              href={researchPlan.googleDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#F5C518] hover:brightness-110 transition-all shrink-0"
            >
              <ExternalLink size={13} /> Open research plan
            </a>
          ) : (
            <span className="text-xs text-white/30 shrink-0">No plan linked yet</span>
          )}
        </div>
      </Card>

      {/* ── Originality check ── */}
      <Card label="Originality check">
        {ideaCheck ? (
          <OriginalityCheckDisplay check={ideaCheck} checkedAt={researchPlan.lastIdeaCheckAt} />
        ) : (
          <Empty>No originality check has been run yet.</Empty>
        )}
      </Card>

      {/* ── Plan review ── */}
      <Card label="Plan review">
        {review ? (
          <PlanReviewDisplay review={review} reviewedAt={researchPlan.lastReviewedAt} />
        ) : (
          <Empty>No AI review yet.</Empty>
        )}
      </Card>
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
      <ul className="space-y-5">
        {logs.map((log) => (
          <li key={log.id} className="space-y-1.5 border-l-2 border-white/10 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  log.entryType === 'failure'
                    ? 'bg-orange-400/10 text-orange-400'
                    : 'bg-emerald-400/10 text-emerald-400'
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
                      <p className="text-xs text-white/25">Awaiting response…</p>
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
            <span className="text-white/40 tabular-nums text-xs">
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><Trophy size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {showcase._count.views.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">Views</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><FileText size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {showcase._count.assets}
          </span>
          <span className="text-xs text-white/50">Assets</span>
        </div>
      </div>

      <Card>
        <div className="space-y-2.5">
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
          <div className="pt-1">
            <Link
              href={`/showcase/${showcase.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#F5C518] hover:brightness-110 transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              View showcase <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

function CodexSection({ overview }: { overview: Overview }) {
  const { codex } = overview

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><BookOpen size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-[#F5C518]">
            {codex.lessonsCompleted}
          </span>
          <span className="text-xs text-white/50">Lessons completed</span>
        </div>
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-white/40"><BookOpen size={16} /></span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            {codex.kp.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">KP from lessons</span>
        </div>
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

function ScienceFairSection({ overview }: { overview: Overview }) {
  const { fairAssociations, formStatuses } = overview

  return (
    <div className="space-y-4">
      <Card label="Registered fairs">
        {fairAssociations.length > 0 ? (
          <ul className="space-y-2">
            {fairAssociations.map((fa, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-white/80">{fa.fair.name}</span>
                <span className="text-white/40 text-xs">{fa.fair.level}</span>
                {fa.isPrimary && (
                  <span className="text-xs text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-full px-1.5 py-0.5">
                    primary
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No fairs registered.</Empty>
        )}
      </Card>

      {formStatuses.length > 0 && (
        <Card label="Form statuses">
          <ul className="space-y-2">
            {formStatuses.map((fs, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{fs.form.name}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    fs.status === 'complete'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : fs.status === 'in_progress'
                      ? 'bg-amber-400/10 text-amber-400'
                      : 'bg-white/5 text-white/30'
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
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    setError(null)
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
      } else {
        setError(out.error ?? 'Could not send feedback.')
      }
    } catch {
      setError('Could not send feedback. Try again.')
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

// ─── Main component ────────────────────────────────────────────────────────────

export function StudentDetail({ studentId }: { studentId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Stale-response guard: without it, a slow response for a previous
    // studentId would overwrite the student currently on screen.
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setLoadError(null)
    fetch(`/api/teacher/student/${studentId}/overview`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true)
          return null
        }
        if (!r.ok) {
          throw new Error(`overview fetch failed: ${r.status}`)
        }
        return r.json() as Promise<Overview>
      })
      .then((d) => {
        if (d && !cancelled) setOverview(d)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this student. Try refreshing the page.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="space-y-6">
        <PixelSkeleton variant="line" h="h-3" w="w-16" />
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-5 space-y-5">
          <div className="flex items-start gap-4">
            <PixelSkeleton variant="pill" h="h-12" w="w-12" className="shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <PixelSkeleton variant="line" h="h-5" w="w-48" />
              <PixelSkeleton variant="line" h="h-3" w="w-64" />
              <PixelSkeleton variant="pill" h="h-6" w="w-32" />
            </div>
          </div>
          <PixelSkeleton variant="box" h="h-10" w="w-full" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <PixelSkeleton key={i} variant="pill" h="h-7" w="w-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-24" w="w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-white/40">
          This student isn&apos;t in your classes.
        </p>
      </div>
    )
  }

  if (loadError || !overview) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-red-400">{loadError ?? 'Something went wrong loading this student.'}</p>
      </div>
    )
  }

  const { student, team } = overview

  return (
    <div className="space-y-6">
      <BackLink />

      {!team ? (
        <div className="border border-white/10 bg-[#0a1628] rounded-lg px-4 py-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <User size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">
            This student hasn&apos;t joined a lab yet.
          </p>
          <div className="text-left max-w-xs mx-auto space-y-2">
            <Field label="Name" value={student.name} />
            <Field label="Email" value={student.email} />
            {student.class && <Field label="Class" value={student.class.name} />}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity header block */}
          <StudentHeader overview={overview} />

          {/* Section tabs with sidebar nav */}
          <SectionTabs
            tabs={[
              {
                key: 'identity',
                label: 'Identity',
                group: 'Profile',
                icon: <User size={14} />,
                content: <IdentitySection overview={overview} />,
              },
              {
                key: 'phase',
                label: 'Progress',
                group: 'Profile',
                icon: <TrendingUp size={14} />,
                content: <PhaseSection overview={overview} />,
              },
              {
                key: 'literature',
                label: 'Literature',
                group: 'Work',
                icon: <BookOpen size={14} />,
                content: <LiteratureSection overview={overview} />,
              },
              {
                key: 'research',
                label: 'Research Plan',
                group: 'Work',
                icon: <ClipboardList size={14} />,
                content: <ResearchPlanSection overview={overview} />,
              },
              {
                key: 'experiments',
                label: 'Experiments',
                group: 'Work',
                icon: <FlaskConical size={14} />,
                content: <ExperimentsSection overview={overview} />,
              },
              {
                key: 'logs',
                label: 'Logs',
                group: 'Work',
                icon: <FileText size={14} />,
                content: <LogsSection overview={overview} />,
              },
              {
                key: 'economy',
                label: 'Economy',
                group: 'Lab',
                icon: <Coins size={14} />,
                content: <EconomySection overview={overview} />,
              },
              {
                key: 'buildings',
                label: 'Buildings',
                group: 'Lab',
                icon: <Building2 size={14} />,
                content: <BuildingsSection overview={overview} />,
              },
              {
                key: 'showcase',
                label: 'Showcase',
                group: 'Showcase',
                icon: <Trophy size={14} />,
                content: <ShowcaseSection overview={overview} />,
              },
              {
                key: 'fairs',
                label: 'Fairs',
                group: 'Showcase',
                icon: <Flag size={14} />,
                content: <ScienceFairSection overview={overview} />,
              },
              {
                key: 'rubric',
                label: 'Rubric',
                group: 'Showcase',
                icon: <ClipboardCheck size={14} />,
                content: <TeacherRubricScoring teamId={team.id} />,
              },
              {
                key: 'activity',
                label: 'Activity',
                group: 'Activity',
                icon: <Activity size={14} />,
                content: <ActivitySection overview={overview} />,
              },
              {
                key: 'codex',
                label: 'Field Codex',
                group: 'Activity',
                icon: <BookOpen size={14} />,
                content: <CodexSection overview={overview} />,
              },
              {
                key: 'feedback',
                label: 'Feedback',
                group: 'Activity',
                icon: <MessageCircle size={14} />,
                content: (
                  <FeedbackSection teamId={team.id} initial={overview.feedback} />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/teacher"
      className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
    >
      <ChevronLeft size={14} /> Roster
    </Link>
  )
}
