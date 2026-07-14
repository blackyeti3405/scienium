import { NextRequest, NextResponse } from 'next/server'
import { differenceInCalendarDays } from 'date-fns'
import { requireTeacher } from '@/lib/teacher/auth'
import { db } from '@/lib/db'

/** Days without a progress log before a working-phase team is flagged stale. */
const STALE_LOG_DAYS = 5

/**
 * How far back the last-log/last-activity aggregates look (PERF-10). The UI only
 * distinguishes ages up to STALE_LOG_DAYS — anything older is just "stale" — so
 * scanning a term's full history per load is wasted work. 14d comfortably covers
 * every displayed distinction while keeping the groupBys bounded.
 */
const ACTIVITY_WINDOW_DAYS = 14

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
      activeTeam: {
        select: { id: true, name: true, phase: true, labType: true, classId: true },
      },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: {
          team: { select: { id: true, name: true, phase: true, labType: true, classId: true } },
        },
      },
    },
  })

  const teamIds = [
    ...new Set(
      students
        .map((s) => {
          const team = s.activeTeam ?? s.teamMemberships[0]?.team
          return team?.classId && ctx.classIds.includes(team.classId) ? team.id : undefined
        })
        .filter((x): x is string => !!x),
    ),
  ]

  // Bounded to the activity window (PERF-10): the status flag only distinguishes
  // ages up to STALE_LOG_DAYS, and `lastActivityAt` isn't rendered beyond that —
  // an unbounded scan of the term's full log/activity history buys nothing.
  const activitySince = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [lastLogs, lastActivity, readyPapers] = await Promise.all([
    db.projectLog.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds }, entryType: 'progress', createdAt: { gte: activitySince } },
      _max: { createdAt: true },
    }),
    db.activityFeed.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds }, createdAt: { gte: activitySince } },
      _max: { createdAt: true },
    }),
    db.paper.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds }, status: 'ready' },
      _count: { _all: true },
    }),
  ])

  const lastLogMap = new Map(lastLogs.map((l) => [l.teamId, l._max.createdAt]))
  const lastActivityMap = new Map(lastActivity.map((a) => [a.teamId, a._max.createdAt]))
  const paperMap = new Map(readyPapers.map((p) => [p.teamId, p._count._all]))

  const now = new Date()
  const roster = students.map((s) => {
    const candidate = s.activeTeam ?? s.teamMemberships[0]?.team ?? null
    const team =
      candidate?.classId && ctx.classIds.includes(candidate.classId) ? candidate : null
    const teamId = team?.id ?? null
    const lastLog = teamId ? (lastLogMap.get(teamId) ?? null) : null
    const lastActivity = teamId ? (lastActivityMap.get(teamId) ?? null) : null

    // Status is only meaningful for working/showcase-phase teams.
    let status: 'on_track' | 'unlogged' | 'stale' | null = null
    if (team && (team.phase === 'working' || team.phase === 'showcase')) {
      const logAge = lastLog ? differenceInCalendarDays(now, lastLog) : Infinity
      const activityAge = lastActivity ? differenceInCalendarDays(now, lastActivity) : Infinity
      const recentLog = logAge <= STALE_LOG_DAYS
      const recentActivity = activityAge <= STALE_LOG_DAYS
      if (recentLog) {
        status = 'on_track'
      } else if (recentActivity) {
        // Active (earning KP/tasks) but no recent progress log.
        status = 'unlogged'
      } else {
        status = 'stale'
      }
    }

    return {
      studentId: s.id,
      name: s.name,
      teamId,
      teamName: team?.name ?? null,
      phase: team?.phase ?? null,
      labType: team?.labType ?? null,
      readyPapers: teamId ? (paperMap.get(teamId) ?? 0) : 0,
      lastActivityAt: lastActivity,
      flags: {
        status,
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
    if (s.flags.status === 'unlogged' || s.flags.status === 'stale') {
      attentionCount++
    }
  }

  return NextResponse.json({ students: roster, hasClasses: true, phaseCounts, attentionCount })
}
