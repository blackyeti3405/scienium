import { NextRequest, NextResponse } from 'next/server'
import { differenceInCalendarDays } from 'date-fns'
import { requireTeacher } from '@/lib/teacher/auth'
import { db } from '@/lib/db'
import type { Phase } from '@/lib/phase'

/** KP distribution bucket boundaries — first cut, tuned for early-game economy scale. */
const KP_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '0', min: 0, max: 0 },
  { label: '1-100', min: 1, max: 100 },
  { label: '101-300', min: 101, max: 300 },
  { label: '301-600', min: 301, max: 600 },
  { label: '601-1000', min: 601, max: 1000 },
  { label: '1000+', min: 1001, max: Infinity },
]

function bucketFor(kp: number): string {
  const bucket = KP_BUCKETS.find((b) => kp >= b.min && kp <= b.max)
  return bucket?.label ?? KP_BUCKETS[KP_BUCKETS.length - 1].label
}

/**
 * GET /api/teacher/reports — class-wide analytics (phase distribution,
 * per-team proficiency heat-map, KP distribution, phase-pacing) from one
 * aggregate call. Pure local computation — no LLM, no schema changes.
 *
 * Mirrors the roster route's shape: derive the scoped `teamIds` set from the
 * scoped student set, then run team-keyed `Promise.all` aggregates — never a
 * per-student query fan-out.
 *
 * IDOR scope: every query below filters by `teamIds`, which is derived
 * exclusively from students in `ctx.classIds` (the classes THIS teacher
 * owns). No query may touch a team outside that set.
 *
 * Read-only — no POST/PUT/DELETE handler.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  if (ctx.classIds.length === 0) {
    return NextResponse.json({
      hasClasses: false,
      classCount: 0,
      studentCount: 0,
      teamCount: 0,
      phaseCounts: {},
      kpDistribution: KP_BUCKETS.map((b) => ({ label: b.label, count: 0 })),
      proficiency: [],
      pacing: [],
      generatedAt: new Date().toISOString(),
    })
  }

  const students = await db.user.findMany({
    where: { classId: { in: ctx.classIds }, role: 'student' },
    select: {
      id: true,
      activeTeam: {
        select: { id: true, name: true, phase: true, createdAt: true, classId: true },
      },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: {
          team: {
            select: { id: true, name: true, phase: true, createdAt: true, classId: true },
          },
        },
      },
    },
  })

  // De-duped teams from the scoped student set — the ONLY teams any aggregate below may touch.
  const teamMap = new Map<string, { id: string; name: string; phase: Phase; createdAt: Date }>()
  for (const s of students) {
    const team = s.activeTeam ?? s.teamMemberships[0]?.team
    if (team?.classId && ctx.classIds.includes(team.classId)) {
      teamMap.set(team.id, {
        id: team.id,
        name: team.name,
        phase: team.phase as Phase,
        createdAt: team.createdAt,
      })
    }
  }
  const teams = [...teamMap.values()]
  const teamIds = teams.map((t) => t.id)

  const [kpRows, proficiencyRows, approvedAdvances] = await Promise.all([
    db.teamCurrency.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, kp: true },
    }),
    db.paperProficiency.findMany({
      where: { paper: { teamId: { in: teamIds } } },
      select: {
        paperId: true,
        demonstrated: true,
        bestScore: true,
        paper: { select: { teamId: true, title: true } },
      },
    }),
    db.phaseAdvanceRequest.findMany({
      where: { teamId: { in: teamIds }, status: 'approved' },
      select: { teamId: true, toPhase: true, reviewedAt: true },
      orderBy: { reviewedAt: 'desc' },
    }),
  ])

  // ── Phase distribution ──────────────────────────────────────────────────
  const phaseCounts: Record<string, number> = {}
  for (const t of teams) {
    phaseCounts[t.phase] = (phaseCounts[t.phase] ?? 0) + 1
  }

  // ── KP distribution (bucketed histogram) ────────────────────────────────
  const kpBucketCounts = new Map<string, number>(KP_BUCKETS.map((b) => [b.label, 0]))
  for (const row of kpRows) {
    const label = bucketFor(row.kp)
    kpBucketCounts.set(label, (kpBucketCounts.get(label) ?? 0) + 1)
  }
  const kpDistribution = KP_BUCKETS.map((b) => ({ label: b.label, count: kpBucketCounts.get(b.label) ?? 0 }))

  // ── Per-team proficiency heat-map summary ───────────────────────────────
  // PaperProficiency has one row per (paper, student) — @@id([paperId, userId]) —
  // so counting rows directly would inflate papersMastered/papersInProgress by
  // team size. Instead, first roll every member's row up to one entry PER
  // DISTINCT PAPER per team (demonstrated = true if ANY member demonstrated it;
  // bestScore = the max across members), then bucket that per-paper rollup into
  // mastered / in-progress. avgBestScore stays a per-row mean (unaffected).
  const paperRollupByTeam = new Map<string, Map<string, { demonstrated: boolean; bestScore: number }>>()
  const scoreStatsByTeam = new Map<string, { scoreSum: number; scoreCount: number }>()
  for (const row of proficiencyRows) {
    const teamId = row.paper.teamId

    const papers = paperRollupByTeam.get(teamId) ?? new Map<string, { demonstrated: boolean; bestScore: number }>()
    const paper = papers.get(row.paperId) ?? { demonstrated: false, bestScore: 0 }
    paper.demonstrated = paper.demonstrated || row.demonstrated
    paper.bestScore = Math.max(paper.bestScore, row.bestScore)
    papers.set(row.paperId, paper)
    paperRollupByTeam.set(teamId, papers)

    if (row.bestScore > 0) {
      const stats = scoreStatsByTeam.get(teamId) ?? { scoreSum: 0, scoreCount: 0 }
      stats.scoreSum += row.bestScore
      stats.scoreCount += 1
      scoreStatsByTeam.set(teamId, stats)
    }
  }
  const proficiency = teams.map((t) => {
    const papers = [...(paperRollupByTeam.get(t.id)?.values() ?? [])]
    const papersMastered = papers.filter((p) => p.demonstrated).length
    const papersInProgress = papers.filter((p) => !p.demonstrated && p.bestScore > 0).length
    const stats = scoreStatsByTeam.get(t.id)
    return {
      teamId: t.id,
      teamName: t.name,
      papersMastered,
      papersInProgress,
      avgBestScore: stats && stats.scoreCount > 0 ? Math.round(stats.scoreSum / stats.scoreCount) : 0,
    }
  })

  // ── Phase pacing: days since the latest approved advance INTO the team's
  // current phase, falling back to Team.createdAt when no such advance exists. ──
  const latestAdvanceToCurrentPhase = new Map<string, Date>()
  for (const adv of approvedAdvances) {
    if (latestAdvanceToCurrentPhase.has(adv.teamId) || !adv.reviewedAt) continue
    const team = teamMap.get(adv.teamId)
    if (team && adv.toPhase === team.phase) {
      latestAdvanceToCurrentPhase.set(adv.teamId, adv.reviewedAt)
    }
  }
  const now = new Date()
  const pacing = teams
    .map((t) => {
      const since = latestAdvanceToCurrentPhase.get(t.id) ?? t.createdAt
      return {
        teamId: t.id,
        teamName: t.name,
        phase: t.phase,
        daysInPhase: differenceInCalendarDays(now, since),
      }
    })
    .sort((a, b) => b.daysInPhase - a.daysInPhase)

  return NextResponse.json({
    hasClasses: true,
    classCount: ctx.classIds.length,
    studentCount: students.length,
    teamCount: teamIds.length,
    phaseCounts,
    kpDistribution,
    proficiency,
    pacing,
    generatedAt: new Date().toISOString(),
  })
}
