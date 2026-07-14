'use client'

import { ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PlanReviewView, type PlanReview } from '@/components/research-plan/PlanReviewView'
import { IdeaCheckView, type IdeaCheckResult } from '@/components/research-plan/IdeaCheckView'
import { Field, Empty } from '../shared'
import type { Overview } from '../types'

export function ResearchPlanSection({ overview }: { overview: Overview }) {
  const { researchPlan } = overview

  if (!researchPlan) {
    return (
      <Card>
        <Empty>No research plan yet.</Empty>
      </Card>
    )
  }

  const ideaCheck = researchPlan.lastIdeaCheckJson as IdeaCheckResult | null
  const review = researchPlan.lastReviewJson as PlanReview | null

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
          <IdeaCheckView idea={ideaCheck} variant="teacher" checkedAt={researchPlan.lastIdeaCheckAt} />
        ) : (
          <Empty>No originality check has been run yet.</Empty>
        )}
      </Card>

      {/* ── Plan review ── */}
      <Card label="Plan review">
        {review ? (
          <PlanReviewView review={review} variant="teacher" reviewedAt={researchPlan.lastReviewedAt} />
        ) : (
          <Empty>No AI review yet.</Empty>
        )}
      </Card>
    </div>
  )
}
