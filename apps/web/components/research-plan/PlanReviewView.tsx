'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Sparkles } from 'lucide-react'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { fmtDate } from '@/lib/format'

// ─── Types (shared by the student panel and the teacher StudentDetail view) ───

export interface PlanReviewSection {
  title: string
  score: number
  max: number
  assessment: string
}
export interface PlanReview {
  overall: { readiness: string; score: number; summary: string } | null
  sections: PlanReviewSection[]
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}
export const EMPTY_REVIEW: PlanReview = {
  overall: null,
  sections: [],
  strengths: [],
  gaps: [],
  recommendations: [],
}

/**
 * Which side is rendering: 'student' is the live lab panel (pixel chrome,
 * streaming states), 'teacher' is the read-only StudentDetail card body. The
 * two renderings had drift-duplicated (CMP-8) — the variant prop preserves
 * each side's existing appearance while keeping the markup in one place.
 */
export type PlanReviewVariant = 'student' | 'teacher'

// ─── Shared review display ─────────────────────────────────────────────────────

export function PlanReviewView({
  review,
  variant,
  streaming = false,
  reviewedAt = null,
}: {
  review: PlanReview
  variant: PlanReviewVariant
  /** Student side only: review events are still arriving. */
  streaming?: boolean
  /** Teacher side only: ISO date for the "Reviewed …" footer. */
  reviewedAt?: string | null
}) {
  const teacher = variant === 'teacher'
  const readiness = review.overall?.readiness ?? 'early'
  const sections = review.sections ?? []
  const strengths = review.strengths ?? []
  const gaps = review.gaps ?? []
  const recommendations = review.recommendations ?? []

  const overall = review.overall && (
    teacher ? (
      <div
        className={`border rounded-md px-4 py-3 space-y-1.5 ${
          readiness === 'strong'
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : readiness === 'promising'
            ? 'border-[#F5C518]/30 bg-[#F5C518]/10'
            : 'border-orange-500/30 bg-orange-500/10'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
              readiness === 'strong'
                ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                : readiness === 'promising'
                ? 'bg-[#F5C518]/10 text-[#F5C518] border-[#F5C518]/20'
                : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
            }`}
          >
            {readiness}
          </span>
          <span className="text-sm font-semibold tabular-nums text-white">
            {review.overall.score}
          </span>
        </div>
        <p className="text-sm text-white/75 leading-relaxed">{review.overall.summary}</p>
      </div>
    ) : (
      <div
        className={`px-4 py-3 rounded-sm border flex items-center gap-3 ${
          readiness === 'strong'
            ? 'text-green-300 border-green-500/30 bg-green-500/10'
            : readiness === 'promising'
              ? 'text-[#F5C518] border-[#F5C518]/30 bg-[#F5C518]/10'
              : 'text-orange-300 border-orange-500/30 bg-orange-500/10'
        }`}
      >
        <Sparkles size={18} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-pixel text-[9px] uppercase tracking-widest">{readiness}</span>
          <p className="text-[13px] text-white/75 leading-relaxed mt-1">{review.overall.summary}</p>
        </div>
        <span className="font-pixel text-[16px] shrink-0">{review.overall.score}</span>
      </div>
    )
  )

  const bulletGrid = (
    <div className={`grid grid-cols-1 ${teacher ? 'sm:grid-cols-3' : 'md:grid-cols-3'} gap-3`}>
      <BulletColumn title="Strengths" items={strengths} color={teacher ? 'text-emerald-400' : 'text-green-400'} variant={variant} streaming={streaming} />
      <BulletColumn title="Gaps" items={gaps} color="text-orange-400" variant={variant} streaming={streaming} />
      <BulletColumn
        title="Next steps"
        items={recommendations}
        color="text-[#F5C518]"
        variant={variant}
        streaming={streaming}
      />
    </div>
  )

  if (teacher) {
    return (
      <div className="space-y-4">
        {/* Overall */}
        {overall}

        {/* Section-by-section rows */}
        {sections.length > 0 && (
          <div className="space-y-2">
            {sections.map((s, i) => (
              <SectionRow key={i} section={s} variant={variant} />
            ))}
          </div>
        )}

        {/* Three-column bullet lists */}
        {(strengths.length > 0 || gaps.length > 0 || recommendations.length > 0) && bulletGrid}

        {reviewedAt && (
          <p className="text-xs text-white/40">Reviewed {fmtDate(reviewedAt)}</p>
        )}
      </div>
    )
  }

  return (
    <section className="border-t border-white/10 pt-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={12} className="text-[#F5C518]" />
        <h3 className="font-pixel text-[9px] text-white">Plan review</h3>
        {streaming && (
          <span className="font-pixel text-[7px] text-[#7ff2e3] flex items-center gap-1 ml-auto">
            <PixelSpinner size="xs" tone="vega" /> Vega is grading…
          </span>
        )}
      </div>

      {/* The plan has exactly 5 knowable sections — a segmented determinate bar
          (one cell fills per graded section) replaces the old indeterminate
          sweep, since we always know how many cells are coming. */}
      {streaming && (
        <PixelProgressBar segments={5} value={(sections.length / 5) * 100} className="-mt-2" />
      )}

      {/* Overall */}
      {overall ?? (streaming && <PixelSkeleton variant="box" h="h-14" w="w-full" />)}

      {/* Section-by-section — rows append as each is graded */}
      <div className="flex flex-col gap-2">
        {sections.map((s, i) => (
          <SectionRow key={i} section={s} variant={variant} />
        ))}
        {streaming && sections.length < 5 && <PixelSkeleton variant="box" h="h-12" w="w-full" />}
      </div>

      {/* Three columns — fill in as bullets arrive */}
      {(strengths.length > 0 || gaps.length > 0 || recommendations.length > 0 || streaming) &&
        bulletGrid}
    </section>
  )
}

function SectionRow({
  section,
  variant,
}: {
  section: PlanReviewSection
  variant: PlanReviewVariant
}) {
  const teacher = variant === 'teacher'
  const pct = section.max ? Math.min(100, (section.score / section.max) * 100) : 0
  // Student side animates the bar from 0 → score so it "fills" when the row
  // appears; the teacher view is static and renders the width directly.
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])
  const width = teacher ? pct : w

  return (
    <div
      className={
        teacher
          ? 'border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2.5'
          : 'px-3 py-2.5 bg-white/3 border border-white/10 rounded-sm'
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-white/85">{section.title}</span>
        <span
          className={
            teacher
              ? 'text-xs text-white/40 shrink-0 tabular-nums'
              : 'font-pixel text-[8px] text-white/40 shrink-0'
          }
        >
          {section.score}/{section.max}
        </span>
      </div>
      <div className={`h-1 ${teacher ? 'bg-white/10' : 'bg-white/8'} rounded-full my-1.5 overflow-hidden`}>
        <div
          className={`h-full bg-[#F5C518] rounded-full ${
            teacher ? '' : 'transition-[width] duration-700 ease-out'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className={`${teacher ? 'text-xs' : 'text-[12px]'} text-white/50 leading-relaxed`}>
        {section.assessment}
      </p>
    </div>
  )
}

function BulletColumn({
  title,
  items,
  color,
  variant,
  streaming,
}: {
  title: string
  items: string[]
  color: string
  variant: PlanReviewVariant
  streaming: boolean
}) {
  const teacher = variant === 'teacher'
  if (teacher && items.length === 0) return null
  return (
    <div>
      {teacher ? (
        <p className="font-pixel text-[9px] text-white/40 uppercase tracking-widest mb-1.5">
          {title}
        </p>
      ) : (
        <h4 className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-1.5">{title}</h4>
      )}
      <ul className={teacher ? 'space-y-1.5' : 'flex flex-col gap-1.5'}>
        {items.map((it, i) => (
          <li
            key={i}
            className={`flex gap-1.5 ${teacher ? 'text-sm' : 'text-[12px]'} text-white/65 leading-relaxed`}
          >
            <span className={`shrink-0 ${color}`}>▪</span>
            {it}
          </li>
        ))}
        {!teacher && items.length === 0 && streaming && (
          <li className="font-pixel text-[7px] text-white/40">…</li>
        )}
      </ul>
    </div>
  )
}
