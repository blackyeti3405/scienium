import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { CODEX_DAILY_LESSON_CAP } from '@/lib/ops/codex/engine'

/**
 * GET /api/ops/codex/progress — this student's Field Codex progress, scoped
 * to the caller (`ctx.dbUserId`), plus today's daily-cap usage, plus the
 * team's cached Study Plan (scoped to `ctx.teamId`).
 *
 * No `feature` phase-gate is applied — Codex mounts as an Operations Hub tab
 * reachable in EVERY phase (mirrors the Data Terminal guides living above
 * the Experiments phase-lock). Tier `read`.
 *
 * Security: `codexLessonProgress` and `codexKpDay` are both filtered by
 * `userId: ctx.dbUserId` — no other student's rows can appear in the
 * payload, even a teammate's. `studyPlan` is filtered by `teamId: ctx.teamId`
 * — scoped to the caller's own team only (IDOR guard).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const todayUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))

  const [progressRows, kpDay, studyPlan] = await Promise.all([
    db.codexLessonProgress.findMany({
      where: { userId: ctx.dbUserId, teamId: ctx.teamId },
      select: {
        trackSlug: true,
        lessonId: true,
        completed: true,
        bestScore: true,
        kpAwarded: true,
        completedAt: true,
      },
    }),
    db.codexKpDay.findUnique({
      where: {
        userId_teamId_day: { userId: ctx.dbUserId, teamId: ctx.teamId, day: todayUtc },
      },
      select: { lessonsCompleted: true },
    }),
    db.teamStudyPlan.findUnique({
      where: { teamId: ctx.teamId },
      select: {
        tracksJson: true,
        manualTrackSlugs: true,
        generatedAt: true,
        runsToday: true,
        runsDay: true,
      },
    }),
  ])

  return NextResponse.json({
    progress: progressRows.map((r) => ({
      trackSlug: r.trackSlug,
      lessonId: r.lessonId,
      completed: r.completed,
      bestScore: r.bestScore,
      kpAwarded: r.kpAwarded,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    })),
    dailyCap: {
      limit: CODEX_DAILY_LESSON_CAP,
      completedToday: kpDay?.lessonsCompleted ?? 0,
    },
    studyPlan: studyPlan
      ? {
          tracks: studyPlan.tracksJson,
          manualTrackSlugs: studyPlan.manualTrackSlugs,
          generatedAt: studyPlan.generatedAt.toISOString(),
        }
      : null,
  })
}
