import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import {
  criterionMaxScore,
  isRubricTrack,
  rubricCriteriaFor,
  SCORER_ROLES,
  sumReadiness,
  totalMaxFor,
  type RubricTrackKey,
} from '@/lib/fairs/rubric-scoring'
import { db } from '@/lib/db'

/**
 * GET/PUT /api/teacher/rubric — teacher-scored ISEF rubric, shown side-by-side
 * with the team's own self-check (Feature F10 — teacher rubric scoring). New
 * route, distinct from the student `/api/rubric/self-assessment` (which this
 * feature never writes to). Both persist into the same `TeamRubricScore` table,
 * discriminated by `scorerRole` ('student' vs 'teacher') so a teacher save can
 * never overwrite the team's self-check row — see prisma/schema.prisma.
 *
 * No Anthropic call anywhere in this feature, so only the standard
 * `read`/`mutate` rate tiers apply — no `ai` tier needed. Anchors and talking
 * points are static curated content (lib/fairs/rubric-anchors.ts) rendered by
 * the client from its own bundle — they are deliberately NOT on the wire here.
 */

const DEFAULT_TRACK: RubricTrackKey = 'science'

/** GET /api/teacher/rubric?teamId=<id>&track=science|engineering */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  const teamId = req.nextUrl.searchParams.get('teamId')?.trim()
  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }

  const trackParam = req.nextUrl.searchParams.get('track') ?? DEFAULT_TRACK
  if (!isRubricTrack(trackParam)) {
    return NextResponse.json(
      { error: "track must be 'science' or 'engineering'" },
      { status: 400 },
    )
  }
  const track = trackParam

  // IDOR guard — the team must contain a student in one of THIS teacher's
  // classes. A foreign team id gets 403 and NO data below.
  if (!(await teacherOwnsTeam(ctx.classIds, teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  // Scoped to this team + track; split by scorerRole below.
  const rows = await db.teamRubricScore.findMany({
    where: { teamId, track },
    select: {
      criterionKey: true,
      score: true,
      notes: true,
      scorerRole: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  })
  const teacherRows = rows.filter((r) => r.scorerRole === SCORER_ROLES.teacher)
  const studentRows = rows.filter((r) => r.scorerRole === SCORER_ROLES.student)
  const teacherByKey = new Map(teacherRows.map((r) => [r.criterionKey, r]))
  const studentByKey = new Map(studentRows.map((r) => [r.criterionKey, r]))

  const criteria = rubricCriteriaFor(track).map((c) => {
    const teacherRow = teacherByKey.get(c.key)
    const studentRow = studentByKey.get(c.key)
    return {
      key: c.key,
      numeral: c.numeral,
      title: c.title,
      maxScore: c.maxScore,
      teacherScore: teacherRow?.score ?? null,
      teacherNotes: teacherRow?.notes ?? null,
      updatedByName: teacherRow?.updatedBy.name ?? null,
      updatedAt: teacherRow?.updatedAt.toISOString() ?? null,
      studentScore: studentRow?.score ?? null,
      studentNotes: studentRow?.notes ?? null,
    }
  })

  return NextResponse.json({
    track,
    criteria,
    teacherTotal: sumReadiness(teacherRows),
    studentTotal: sumReadiness(studentRows),
    totalMax: totalMaxFor(track),
  })
}

const PutBody = z
  .object({
    teamId: z.string().trim().min(1).max(40),
    track: z.enum(['science', 'engineering']),
    criterionKey: z.string().trim().min(1).max(40),
    score: z.number().int().min(0),
    notes: z.string().max(1000).optional(),
  })
  .strict()

/** PUT /api/teacher/rubric — idempotent upsert of the TEACHER's score/notes for one criterion. */
export async function PUT(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PutBody)
  if (bodyError) return bodyError

  // IDOR guard — a teacher may only write scores for teams in their own classes.
  if (!(await teacherOwnsTeam(ctx.classIds, data.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  // Authoritative server-side cap: criterionKey must resolve to a real
  // criterion for the given track, and score must not exceed its max — never
  // trust a client-sent max.
  const maxScore = criterionMaxScore(data.track, data.criterionKey)
  if (maxScore === null) {
    return NextResponse.json({ error: 'Unknown criterionKey for that track' }, { status: 400 })
  }
  if (data.score > maxScore) {
    return NextResponse.json(
      { error: `score cannot exceed ${maxScore} for this criterion` },
      { status: 400 },
    )
  }

  // Upsert the TEACHER row only. scorerRole is pinned to 'teacher' in the
  // where-clause's composite unique, so this can never touch the 'student'
  // self-check row for the same (teamId, criterionKey).
  const row = await db.teamRubricScore.upsert({
    where: {
      teamId_criterionKey_scorerRole: {
        teamId: data.teamId,
        criterionKey: data.criterionKey,
        scorerRole: SCORER_ROLES.teacher,
      },
    },
    create: {
      teamId: data.teamId,
      track: data.track,
      criterionKey: data.criterionKey,
      score: data.score,
      notes: data.notes ?? null,
      scorerRole: SCORER_ROLES.teacher,
      updatedByUserId: ctx.dbUserId,
    },
    update: {
      score: data.score,
      notes: data.notes ?? null,
      updatedByUserId: ctx.dbUserId,
    },
    select: {
      criterionKey: true,
      score: true,
      notes: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  })

  // Sum in Postgres — this runs on every save, no need to pull rows back.
  const agg = await db.teamRubricScore.aggregate({
    where: { teamId: data.teamId, track: data.track, scorerRole: SCORER_ROLES.teacher },
    _sum: { score: true },
  })

  return NextResponse.json({
    criterion: {
      key: row.criterionKey,
      teacherScore: row.score,
      teacherNotes: row.notes,
      updatedByName: row.updatedBy.name,
      updatedAt: row.updatedAt.toISOString(),
    },
    teacherTotal: agg._sum.score ?? 0,
    totalMax: totalMaxFor(data.track),
  })
}
