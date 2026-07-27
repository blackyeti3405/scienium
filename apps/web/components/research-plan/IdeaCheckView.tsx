'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Search,
  XCircle,
} from 'lucide-react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { fmtDate } from '@/lib/format'
import { isSafeHttpUrl } from '@/lib/showcase'

/**
 * Renders `href` only for a plain http(s) URL (`isSafeHttpUrl` — the same gate
 * `lib/validation.ts` points every generic link consumer at). `priorWork`/
 * `citations`/live-search sources all ultimately come from an LLM's own JSON
 * output (§0.7): the model is not a trusted caller, and a scheme like
 * `javascript:` landing directly in an `<a href>` is a live XSS, not a
 * hypothetical one. The service layer already filters these before they are
 * stored (idea-check-service.ts); this is the second, independent gate at the
 * render boundary — a legacy row saved before that filter existed must not
 * get a free pass.
 */
function SafeExternalLink({
  href,
  className,
  children,
}: {
  href?: string
  className: string
  children: ReactNode
}) {
  if (href && isSafeHttpUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return <span className={className}>{children}</span>
}

/**
 * The student/teacher heading pair repeated once per section (prior work,
 * differentiation, recommendation, citations) — same text, same two variant
 * styles, only the colour tone and student-side bottom margin ever changed.
 */
function ResultHeading({
  teacher,
  tone = 'text-white/40',
  marginBottom = 'mb-1.5',
  children,
}: {
  teacher: boolean
  tone?: string
  marginBottom?: string
  children: string
}) {
  return teacher ? (
    <p className={`font-pixel text-[9px] ${tone} uppercase tracking-widest`}>{children}</p>
  ) : (
    <h4 className={`font-pixel text-[7px] ${tone} uppercase tracking-widest ${marginBottom}`}>{children}</h4>
  )
}

// ─── Types (shared by the student panel and the teacher StudentDetail view) ───

export interface IdeaCheckPriorWork {
  title?: string
  url?: string
  note?: string
}
export interface IdeaCheckFindings {
  summary: string
  priorWork: IdeaCheckPriorWork[]
  differentiation: string
  recommendation: string
  citations: { title: string; url: string }[]
}
export interface IdeaCheckResult {
  verdict: 'novel' | 'refine' | 'reject'
  findings: IdeaCheckFindings
}

/**
 * Which side is rendering: 'student' is the live lab panel (pixel chrome),
 * 'teacher' is the read-only StudentDetail card body. The two renderings had
 * drift-duplicated (CMP-8) — the variant prop preserves each side's existing
 * appearance while keeping the markup in one place.
 */
export type IdeaCheckVariant = 'student' | 'teacher'

// ─── Shared idea-check verdict display ─────────────────────────────────────────

export function IdeaCheckView({
  idea,
  variant,
  checkedAt = null,
}: {
  idea: IdeaCheckResult
  variant: IdeaCheckVariant
  /** Teacher side only: ISO date for the "Checked …" footer. */
  checkedAt?: string | null
}) {
  const teacher = variant === 'teacher'
  const v = idea.verdict
  const priorWork = idea.findings?.priorWork ?? []
  const citations = idea.findings?.citations ?? []

  const verdictHeader = teacher ? (
    <div className="flex items-start gap-3 flex-wrap">
      <span
        className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
          v === 'novel'
            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
            : v === 'reject'
            ? 'bg-red-400/10 text-red-400 border-red-400/20'
            : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
        }`}
      >
        {v === 'novel' ? 'Novel' : v === 'reject' ? 'Reject' : 'Refine'}
      </span>
      {idea.findings?.summary && (
        <p className="text-sm text-white/75 leading-relaxed flex-1 min-w-0">
          {idea.findings.summary}
        </p>
      )}
    </div>
  ) : (
    (() => {
      const meta =
        v === 'novel'
          ? { icon: <CheckCircle2 size={18} />, label: 'Looks novel', tone: 'text-green-300 border-green-500/30 bg-green-500/10' }
          : v === 'reject'
            ? { icon: <XCircle size={18} />, label: 'Likely done — consider pivoting', tone: 'text-red-300 border-red-500/30 bg-red-500/10' }
            : { icon: <AlertTriangle size={18} />, label: 'Refine your angle', tone: 'text-amber-300 border-amber-500/30 bg-amber-500/10' }
      return (
        <div className={`px-4 py-3 rounded-sm border flex items-center gap-3 ${meta.tone}`}>
          <span className="shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="font-pixel text-[9px] uppercase tracking-widest">{meta.label}</span>
            <p className="text-[13px] text-white/75 leading-relaxed mt-1">{idea.findings.summary}</p>
          </div>
        </div>
      )
    })()
  )

  const body = (
    <>
      {verdictHeader}

      {/* Prior work */}
      {priorWork.length > 0 && (
        <div className={teacher ? 'space-y-1.5' : undefined}>
          <ResultHeading teacher={teacher} marginBottom="mb-2">Prior work</ResultHeading>
          <ul className={teacher ? 'space-y-2' : 'flex flex-col gap-2'}>
            {priorWork.map((pw, i) => (
              <li
                key={i}
                className={
                  teacher
                    ? 'border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2 space-y-0.5'
                    : 'px-3 py-2 bg-white/3 border border-white/10 rounded-sm'
                }
              >
                {pw.url ? (
                  <SafeExternalLink
                    href={pw.url}
                    className={
                      teacher
                        ? 'text-sm text-blue-300 hover:text-blue-200 transition-colors inline-flex items-center gap-1'
                        : 'text-[13px] text-blue-300 hover:text-blue-200 underline flex items-center gap-1'
                    }
                  >
                    {pw.title ?? pw.url}
                    <ExternalLink size={teacher ? 10 : 9} className="shrink-0" />
                  </SafeExternalLink>
                ) : (
                  <span className={teacher ? 'text-sm text-white/80' : 'text-[13px] text-white/80'}>
                    {pw.title}
                  </span>
                )}
                {pw.note && (
                  <p
                    className={
                      teacher
                        ? 'text-xs text-white/45 leading-relaxed'
                        : 'text-[12px] text-white/45 leading-relaxed mt-0.5'
                    }
                  >
                    {pw.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it could differ */}
      {idea.findings?.differentiation && (
        <div className={teacher ? 'space-y-1' : undefined}>
          <ResultHeading teacher={teacher}>
            {teacher ? 'How it could differ' : 'How you could differ'}
          </ResultHeading>
          <p className={`${teacher ? 'text-sm' : 'text-[13px]'} text-white/65 leading-relaxed`}>
            {idea.findings.differentiation}
          </p>
        </div>
      )}

      {/* Recommendation */}
      {idea.findings?.recommendation && (
        <div
          className={
            teacher
              ? 'border border-[#F5C518]/25 bg-[#F5C518]/5 rounded-md px-3 py-2.5 space-y-1'
              : 'px-3 py-2.5 bg-[#F5C518]/5 border border-[#F5C518]/25 rounded-sm'
          }
        >
          <ResultHeading teacher={teacher} tone="text-[#F5C518]/70" marginBottom="mb-1">
            Recommendation
          </ResultHeading>
          <p className={`${teacher ? 'text-sm' : 'text-[13px]'} text-white/75 leading-relaxed`}>
            {idea.findings.recommendation}
          </p>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className={teacher ? 'space-y-1.5' : undefined}>
          <ResultHeading teacher={teacher}>Sources</ResultHeading>
          {teacher ? (
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i}>
                  <SafeExternalLink
                    href={c.url}
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ExternalLink size={9} className="shrink-0" />
                    {c.title}
                  </SafeExternalLink>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-1">
              {citations.map((c, i) => (
                <SafeExternalLink
                  key={i}
                  href={c.url}
                  className="text-[12px] text-white/40 hover:text-white/70 truncate flex items-center gap-1"
                >
                  <ExternalLink size={8} className="shrink-0" /> {c.title}
                </SafeExternalLink>
              ))}
            </div>
          )}
        </div>
      )}

      {teacher && checkedAt && (
        <p className="text-xs text-white/40">Checked {fmtDate(checkedAt)}</p>
      )}
    </>
  )

  return teacher ? (
    <div className="space-y-4">{body}</div>
  ) : (
    <section className="border-t border-white/10 pt-5 flex flex-col gap-4">{body}</section>
  )
}

// ─── Idea-check live activity (student side only) ─────────────────────────────

export interface IdeaCheckActivity {
  status: string
  searches: string[]
  sources: { title: string; url: string }[]
}

export function IdeaActivity({ activity }: { activity: IdeaCheckActivity }) {
  return (
    <section className="border-t border-white/10 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <PixelSpinner size="sm" tone="gold" />
        <h3 className="font-pixel text-[9px] text-white">Checking the web…</h3>
        <span className="font-pixel text-[7px] text-white/40">{activity.status}</span>
      </div>

      {activity.searches.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-3">
          {activity.searches.map((q, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] text-white/75">
              <Search size={11} className="text-blue-300 shrink-0" />
              <span className="truncate">{q}</span>
            </li>
          ))}
        </ul>
      )}

      {activity.sources.length > 0 && (
        <div>
          <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest">
            {activity.sources.length} sources found
          </span>
          <ul className="flex flex-col gap-1 mt-1.5">
            {activity.sources.slice(-8).map((s, i) => (
              <li key={i}>
                <SafeExternalLink
                  href={s.url}
                  className="text-[12px] text-white/45 hover:text-white/70 truncate flex items-center gap-1"
                >
                  <ExternalLink size={8} className="shrink-0" /> {s.title}
                </SafeExternalLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
