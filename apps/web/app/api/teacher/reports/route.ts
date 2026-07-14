import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/teacher/auth'
import { db } from '@/lib/db'
import {
  dedupeScopedTeams,
  computePhaseCounts,
  computeKpDistribution,
  computeTeamProficiency,
  computePhasePacing,
} from '@/lib/teacher/analytics'

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
      kpDistribution: computeKpDistribution([]),
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
  const teams = dedupeScopedTeams(students, ctx.classIds)
  const teamIds = teams.map((t) => t.id)

  const [kpRows, proficiencyRows] = await Promise.all([
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
  ])

  const phaseCounts = computePhaseCounts(teams)
  const kpDistribution = computeKpDistribution(kpRows)
  const proficiency = computeTeamProficiency(teams, proficiencyRows)
  const pacing = computePhasePacing(teams)

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
