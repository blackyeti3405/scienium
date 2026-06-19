import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { isValidSelection } from '@/lib/research-plan/types'
import { fetchGoogleDocText, GoogleDocError } from '@/lib/research-plan/google-doc'
import { IDEA_CHECK_DAILY_LIMIT, ideaChecksUsedToday } from '@/lib/research-plan/idea-check'
import { db } from '@/lib/db'

const MAX_STORED_TEXT = 100_000

/** GET /api/research-plan — current plan config, sync state, last review, quota. */
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const plan = await db.researchPlan.findUnique({ where: { teamId: ctx.teamId } })
  const usedToday = await ideaChecksUsedToday(ctx.teamId)

  return NextResponse.json({
    plan: plan
      ? {
          googleDocUrl: plan.googleDocUrl,
          projectType: plan.projectType,
          projectSubtype: plan.projectSubtype,
          lastSyncedAt: plan.lastSyncedAt?.toISOString() ?? null,
          hasText: !!plan.lastSyncedText,
          textPreview: plan.lastSyncedText?.slice(0, 600) ?? null,
          // Only a structured object is a valid review (guards against any legacy value).
          lastReview:
            plan.lastReviewJson && typeof plan.lastReviewJson === 'object' ? plan.lastReviewJson : null,
          lastReviewedAt: plan.lastReviewedAt?.toISOString() ?? null,
          // The current idea-check result, so it persists across reloads.
          lastIdeaCheck:
            plan.lastIdeaCheckJson && typeof plan.lastIdeaCheckJson === 'object'
              ? plan.lastIdeaCheckJson
              : null,
          lastIdeaCheckAt: plan.lastIdeaCheckAt?.toISOString() ?? null,
        }
      : null,
    ideaCheck: { usedToday, limit: IDEA_CHECK_DAILY_LIMIT, remaining: Math.max(0, IDEA_CHECK_DAILY_LIMIT - usedToday) },
  })
}

/**
 * POST /api/research-plan — save the project type/subtype + Google Doc URL and
 * (re)sync the doc's published text. Doubles as the "Refresh" action.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { googleDocUrl, projectType, projectSubtype } = await req.json()
  if (!googleDocUrl?.trim()) {
    return NextResponse.json({ error: 'A Google Doc link is required' }, { status: 400 })
  }
  if (projectType && projectSubtype && !isValidSelection(projectType, projectSubtype)) {
    return NextResponse.json({ error: 'Invalid project type selection' }, { status: 400 })
  }

  // Fetch the live doc text (paste-a-link fallback). Surface sharing problems.
  let text: string
  try {
    text = await fetchGoogleDocText(googleDocUrl.trim())
  } catch (err) {
    if (err instanceof GoogleDocError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  const stored = text.slice(0, MAX_STORED_TEXT)
  const data = {
    googleDocUrl: googleDocUrl.trim(),
    projectType: projectType ?? null,
    projectSubtype: projectSubtype ?? null,
    lastSyncedText: stored,
    lastSyncedAt: new Date(),
  }

  const plan = await db.researchPlan.upsert({
    where: { teamId: ctx.teamId },
    create: { teamId: ctx.teamId, ...data },
    update: data,
  })

  return NextResponse.json({
    plan: {
      googleDocUrl: plan.googleDocUrl,
      projectType: plan.projectType,
      projectSubtype: plan.projectSubtype,
      lastSyncedAt: plan.lastSyncedAt?.toISOString() ?? null,
      hasText: true,
      textPreview: stored.slice(0, 600),
      lastReview:
        plan.lastReviewJson && typeof plan.lastReviewJson === 'object' ? plan.lastReviewJson : null,
      lastReviewedAt: plan.lastReviewedAt?.toISOString() ?? null,
    },
  })
}
