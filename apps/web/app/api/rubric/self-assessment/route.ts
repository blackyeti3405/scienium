import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
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
 * GET/PUT /api/rubric/self-assessment — team-scored ISEF rubric self-check
 * (Feature F1 — Rubric self-assessment). Rubric CONTENT (numerals, titles,
 * checklist items, max scores) is driven off the `ISEF_RUBRIC` literal
 * (lib/fairs/isef-rubric.ts) via lib/fairs/rubric-scoring.ts; only the team's
 * scores + notes persist, in `TeamRubricScore` keyed `(teamId, criterionKey)`.
 *
 * No Anthropic call anywhere in this feature (manual self-check only), so the
 * standard `read`/`mutate` rate tiers apply — no `ai` tier needed.
 */

const DEFAULT_TRACK: RubricTrackKey = 'science'

/** GET /api/rubric/self-assessment?track=science|engineering */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const trackParam = req.nextUrl.searchParams.get('track') ?? DEFAULT_TRACK
  if (!isRubricTrack(trackParam)) {
    return NextResponse.json(
      { error: "track must be 'science' or 'engineering'" },
      { status: 400 },
    )
  }
  const track = trackParam

  // Scoped to the caller's team — the IDOR guard. A criterionKey from another
  // team's rows is never reachable because the WHERE clause filters on teamId.
  // scorerRole: 'student' excludes any teacher-scored row for this team (see
  // app/api/teacher/rubric/route.ts) so this self-check never displays or is
  // conflated with a teacher's rating of the same criterion.
  const rows = await db.teamRubricScore.findMany({
    where: { teamId: ctx.teamId, track, scorerRole: SCORER_ROLES.student },
    select: {
      criterionKey: true,
      score: true,
      notes: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  })
  const rowByKey = new Map(rows.map((r) => [r.criterionKey, r]))

  const criteria = rubricCriteriaFor(track).map((c) => {
    const row = rowByKey.get(c.key)
    return {
      key: c.key,
      numeral: c.numeral,
      title: c.title,
      maxScore: c.maxScore,
      score: row?.score ?? null,
      notes: row?.notes ?? null,
      updatedByName: row?.updatedBy.name ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    }
  })

  return NextResponse.json({
    track,
    criteria,
    totalScore: sumReadiness(rows),
    totalMax: totalMaxFor(track),
  })
}

const PutBody = z
  .object({
    track: z.enum(['science', 'engineering']),
    criterionKey: z.string().trim().min(1).max(40),
    score: z.number().int().min(0),
    notes: z.string().max(1000).optional(),
  })
  .strict()

/** PUT /api/rubric/self-assessment — idempotent upsert of one criterion's score/notes. */
export async function PUT(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PutBody)
  if (bodyError) return bodyError

  // Authoritative server-side cap: criterionKey must resolve to a real
  // criterion for the given track, and score must not exceed its max.
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

  // Upsert scoped to the team — @@unique([teamId, criterionKey, scorerRole])
  // guarantees one row per team per criterion per scorer role, so a second
  // save overwrites, never duplicates. scorerRole is pinned to 'student' here
  // (Feature F10 added the discriminator so a teacher's rubric score — see
  // app/api/teacher/rubric/route.ts — coexists in the same table without ever
  // colliding with this self-check row). A criterionKey from another team's
  // context is unreachable: the composite unique includes teamId.
  const row = await db.teamRubricScore.upsert({
    where: {
      teamId_criterionKey_scorerRole: {
        teamId: ctx.teamId,
        criterionKey: data.criterionKey,
        scorerRole: SCORER_ROLES.student,
      },
    },
    create: {
      teamId: ctx.teamId,
      track: data.track,
      criterionKey: data.criterionKey,
      score: data.score,
      notes: data.notes ?? null,
      scorerRole: SCORER_ROLES.student,
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
    where: { teamId: ctx.teamId, track: data.track, scorerRole: SCORER_ROLES.student },
    _sum: { score: true },
  })

  return NextResponse.json({
    criterion: {
      key: row.criterionKey,
      score: row.score,
      notes: row.notes,
      updatedByName: row.updatedBy.name,
      updatedAt: row.updatedAt.toISOString(),
    },
    totalScore: agg._sum.score ?? 0,
    totalMax: totalMaxFor(data.track),
  })
}
