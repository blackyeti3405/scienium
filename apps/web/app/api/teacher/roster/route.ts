import { NextRequest, NextResponse } from 'next/server'
import { differenceInCalendarDays } from 'date-fns'
import { requireTeacher } from '@/lib/teacher/auth'
import { db } from '@/lib/db'

/** Days without a progress log before a working-phase team is flagged stale. */
const STALE_LOG_DAYS = 5

/**
 * GET /api/teacher/roster — the class-wide overview (spec §15.3). One row per
 * student (teachers think in individuals), with phase, last activity, and
 * attention flags. Built from a handful of `groupBy` aggregates rather than
 * per-student queries, so it stays one cheap pass even as the class grows.
 *
 * Strictly scoped: only students in classes THIS teacher owns are returned.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  if (ctx.classIds.length === 0) {
    return NextResponse.json({ students: [], hasClasses: false })
  }

  const students = await db.user.findMany({
    where: { classId: { in: ctx.classIds }, role: 'student' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: { team: { select: { id: true, name: true, phase: true, labType: true } } },
      },
    },
  })

  const teamIds = [
    ...new Set(students.map((s) => s.teamMemberships[0]?.team.id).filter((x): x is string => !!x)),
  ]

  const [pending, lastLogs, lastActivity, readyPapers] = await Promise.all([
    db.phaseAdvanceRequest.findMany({
      where: { teamId: { in: teamIds }, status: 'pending' },
      select: { teamId: true, toPhase: true },
    }),
    db.projectLog.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds }, entryType: 'progress' },
      _max: { createdAt: true },
    }),
    db.activityFeed.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds } },
      _max: { createdAt: true },
    }),
    db.paper.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds }, status: 'ready' },
      _count: { _all: true },
    }),
  ])

  const pendingMap = new Map(pending.map((p) => [p.teamId, p.toPhase]))
  const lastLogMap = new Map(lastLogs.map((l) => [l.teamId, l._max.createdAt]))
  const lastActivityMap = new Map(lastActivity.map((a) => [a.teamId, a._max.createdAt]))
  const paperMap = new Map(readyPapers.map((p) => [p.teamId, p._count._all]))

  const now = new Date()
  const roster = students.map((s) => {
    const team = s.teamMemberships[0]?.team ?? null
    const teamId = team?.id ?? null
    const lastLog = teamId ? (lastLogMap.get(teamId) ?? null) : null
    const pendingTo = teamId ? (pendingMap.get(teamId) ?? null) : null
    const staleLog =
      !!team &&
      (team.phase === 'working' || team.phase === 'showcase') &&
      (!lastLog || differenceInCalendarDays(now, lastLog) > STALE_LOG_DAYS)

    return {
      studentId: s.id,
      name: s.name,
      teamId,
      teamName: team?.name ?? null,
      phase: team?.phase ?? null,
      labType: team?.labType ?? null,
      readyPapers: teamId ? (paperMap.get(teamId) ?? 0) : 0,
      lastActivityAt: teamId ? (lastActivityMap.get(teamId) ?? null) : null,
      flags: {
        pendingValidation: pendingTo, // null | target phase
        staleLog,
      },
    }
  })

  // Summary fields for the roster header — derived from the already-fetched data.
  const phaseCounts: Record<string, number> = {}
  let attentionCount = 0
  for (const s of roster) {
    if (s.phase) {
      phaseCounts[s.phase] = (phaseCounts[s.phase] ?? 0) + 1
    }
    if (s.flags.pendingValidation || s.flags.staleLog) {
      attentionCount++
    }
  }

  return NextResponse.json({ students: roster, hasClasses: true, phaseCounts, attentionCount })
}
