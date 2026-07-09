import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { loadTrack } from '@/lib/ops/codex/index'
import { gradeCheckpoint, computeKpAward, findLessonLocation, lessonUnlocked, CODEX_DAILY_LESSON_CAP } from '@/lib/ops/codex/engine'
import { logActivity } from '@/lib/activity/log'
import type { CheckpointQuestion } from '@/lib/ops/codex/types'

// A checkpoint has at most 5 questions, each answer a small bounded payload —
// caps the submission size regardless of question kind.
const AnswerSchema = z.union([
  z.object({ kind: z.literal('mc'), id: z.string().trim().min(1).max(64), selectedOptionId: z.string().trim().min(1).max(64) }).strict(),
  z.object({ kind: z.literal('ordering'), id: z.string().trim().min(1).max(64), order: z.array(z.string().trim().min(1).max(64)).max(10) }).strict(),
  z
    .object({
      kind: z.literal('matching'),
      id: z.string().trim().min(1).max(64),
      pairs: z.array(z.tuple([z.string().trim().min(1).max(64), z.string().trim().min(1).max(64)])).max(10),
    })
    .strict(),
])

const CompleteBody = z
  .object({
    trackSlug: z.string().trim().min(1).max(64),
    lessonId: z.string().trim().min(1).max(120),
    submission: z.object({ answers: z.array(AnswerSchema).max(5) }).strict(),
  })
  .strict()

/** UTC-midnight Date for "today" — the stable per-day key. */
function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * POST /api/ops/codex/complete — server-authoritative progression gate +
 * checkpoint grading + once-ever per-student KP claim + atomic daily-cap
 * enforcement.
 *
 * The client NEVER sends a score — only the chosen option ids/orderings/
 * pairs. This route loads the track's real content (the authoritative answer
 * key) via `loadTrack`, locates the lesson (404 if the lessonId doesn't
 * exist in that track — the IDOR/tamper guard), and re-derives correctness
 * with `gradeCheckpoint` server-side.
 *
 * PROGRESSION GATE (server-authoritative — the panel's own gating in
 * CodexTab.tsx is UX only, never trust-worthy on its own): before grading or
 * paying anything, this route loads the student's completed-lesson-id set
 * for THIS track from `codexLessonProgress` and calls `lessonUnlocked`
 * (engine.ts) — the same combined unit-unlock + intra-unit-sequential rule
 * the panel renders from. A locked lesson 403s immediately; a direct POST
 * bypassing the UI (e.g. completing unit 2 before unit 1, or lesson 3 of a
 * unit before lesson 1-2) can never grade, complete, or mint KP.
 *
 * PAYMENT INVARIANT (learned from the retired field-dispatch route's 25P02
 * incident): a caught unique-constraint violation inside a Prisma
 * `$transaction` still aborts the whole surrounding Postgres transaction
 * (25P02), so a bare `.create()`/`.update()` in a try/catch is NOT safe for
 * an idempotent once-ever payment. This route instead uses a raw
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` for the progress row
 * (raising the bestScore/kpAwarded high-water atomically) and a SEPARATE raw
 * `INSERT ... ON CONFLICT DO UPDATE ... WHERE lessons_completed < cap
 * RETURNING` for the daily-cap increment — the cap check and the increment
 * happen in ONE atomic statement, so two concurrent completions can never
 * both slip past the Nth-of-day limit (the WHERE clause on the UPDATE means
 * a losing concurrent request's RETURNING set is empty, not a stale read).
 * KP is only ever minted when both RETURNING sets are non-empty.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CompleteBody)
  if (bodyError) return bodyError
  const { trackSlug, lessonId, submission } = data

  let trackModule: Awaited<ReturnType<typeof loadTrack>>
  try {
    trackModule = await loadTrack(trackSlug)
  } catch {
    return NextResponse.json({ error: 'Unknown track' }, { status: 404 })
  }

  const location = findLessonLocation(trackModule, lessonId)
  if (!location) {
    return NextResponse.json({ error: 'Lesson not found in this track' }, { status: 404 })
  }
  const { lesson } = location

  // Server-authoritative progression gate — see the PROGRESSION GATE doc
  // comment above. Scoped to THIS track's own completed lesson ids only
  // (codexLessonProgress rows are per-student globally, so filter by
  // trackSlug — a completed lesson in a DIFFERENT track must never count
  // toward unlocking gates in this one).
  const completedRows = await db.codexLessonProgress.findMany({
    where: { userId: ctx.dbUserId, teamId: ctx.teamId, trackSlug, completed: true },
    select: { lessonId: true },
  })
  const completedLessonIds = new Set(completedRows.map((r) => r.lessonId))
  if (!lessonUnlocked(trackModule, lessonId, completedLessonIds)) {
    return NextResponse.json({ error: 'This lesson is locked — complete its prerequisites first.' }, { status: 403 })
  }

  // Server-authoritative grade — the client's submission is only option ids/
  // orderings/pairs, never a score.
  const grade = gradeCheckpoint(lesson.checkpoint.questions as CheckpointQuestion[], submission)

  const existing = await db.codexLessonProgress.findUnique({
    where: {
      userId_teamId_trackSlug_lessonId: {
        userId: ctx.dbUserId,
        teamId: ctx.teamId,
        trackSlug,
        lessonId,
      },
    },
    select: { bestScore: true, kpAwarded: true, completed: true },
  })
  const priorBest = existing?.bestScore ?? 0
  const priorKp = existing?.kpAwarded ?? 0
  const alreadyClaimed = priorKp > 0
  const scorePct = Math.round(grade.ratio * 100)
  const newBestScore = Math.max(priorBest, scorePct)

  if (!grade.passed) {
    // Persist a non-completing bestScore high-water only — no KP, no cap
    // consumption, completion status unchanged.
    await db.codexLessonProgress.upsert({
      where: {
        userId_teamId_trackSlug_lessonId: {
          userId: ctx.dbUserId,
          teamId: ctx.teamId,
          trackSlug,
          lessonId,
        },
      },
      create: {
        userId: ctx.dbUserId,
        teamId: ctx.teamId,
        trackSlug,
        lessonId,
        completed: existing?.completed ?? false,
        bestScore: newBestScore,
        kpAwarded: priorKp,
      },
      update: {
        bestScore: newBestScore,
      },
    })
    return NextResponse.json({
      passed: false,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: false,
    })
  }

  // Passed. A re-pass of an already-completed lesson never pays and never
  // consumes a daily-cap slot — only a first-time completion (!alreadyClaimed)
  // does either.
  if (alreadyClaimed) {
    await db.codexLessonProgress.update({
      where: {
        userId_teamId_trackSlug_lessonId: {
          userId: ctx.dbUserId,
          teamId: ctx.teamId,
          trackSlug,
          lessonId,
        },
      },
      data: { bestScore: newBestScore, completed: true, completedAt: new Date() },
    })
    return NextResponse.json({
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: false,
    })
  }

  // First-time completion: daily-cap gate BEFORE attempting to mint KP. This
  // pre-check is a fast, friendly rejection; the atomic guarantee against a
  // concurrent double-slip is the WHERE-gated UPDATE inside the transaction
  // below, not this pre-check alone.
  const today = todayUtc()
  const kpDay = await db.codexKpDay.findUnique({
    where: {
      userId_teamId_day: { userId: ctx.dbUserId, teamId: ctx.teamId, day: today },
    },
    select: { lessonsCompleted: true },
  })
  if ((kpDay?.lessonsCompleted ?? 0) >= CODEX_DAILY_LESSON_CAP) {
    return NextResponse.json({
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: true,
    })
  }

  const award = computeKpAward({ passed: true, alreadyClaimed: false })

  let capReached = false
  await db.$transaction(async (tx) => {
    // Atomically claim ONE daily-cap slot: insert-or-increment the day's
    // counter, but only when doing so keeps it under the cap. The WHERE
    // clause is evaluated as part of the same atomic UPDATE, so two
    // concurrent transactions racing for the last slot can never both
    // succeed — exactly one RETURNING set will be non-empty. This adapts the
    // once-ever `INSERT ... ON CONFLICT DO NOTHING RETURNING` claim pattern
    // to a counter that must stay under a cap.
    const capRows = await tx.$queryRaw<{ lessons_completed: number }[]>(Prisma.sql`
      INSERT INTO "codex_kp_days" (id, user_id, team_id, day, lessons_completed, updated_at)
      VALUES (gen_random_uuid()::text, ${ctx.dbUserId}, ${ctx.teamId}, ${today}, 1, now())
      ON CONFLICT (user_id, team_id, day) DO UPDATE
        SET lessons_completed = "codex_kp_days".lessons_completed + 1, updated_at = now()
        WHERE "codex_kp_days".lessons_completed < ${CODEX_DAILY_LESSON_CAP}
      RETURNING lessons_completed
    `)

    if (capRows.length === 0) {
      // Lost the race for the last cap slot (or the cap was already reached
      // by a concurrent request) — do NOT mark complete, do NOT mint KP.
      capReached = true
      return
    }

    // Cap slot secured — raise the progress row's high-water marks (upsert
    // via ON CONFLICT so this is safe even on a genuinely first-ever row)
    // and mint the flat per-lesson KP onto the team's currency.
    await tx.$queryRaw(Prisma.sql`
      INSERT INTO "codex_lesson_progress" (user_id, team_id, track_slug, lesson_id, completed, best_score, kp_awarded, completed_at, updated_at)
      VALUES (${ctx.dbUserId}, ${ctx.teamId}, ${trackSlug}, ${lessonId}, true, ${newBestScore}, ${award.kpEarned}, now(), now())
      ON CONFLICT (user_id, team_id, track_slug, lesson_id) DO UPDATE
        SET completed = true,
            best_score = GREATEST("codex_lesson_progress".best_score, ${newBestScore}),
            kp_awarded = GREATEST("codex_lesson_progress".kp_awarded, ${award.kpEarned}),
            completed_at = now(),
            updated_at = now()
    `)

    await tx.teamCurrency.upsert({
      where: { teamId: ctx.teamId },
      create: { teamId: ctx.teamId, kp: award.kpEarned },
      update: { kp: { increment: award.kpEarned } },
    })
  })

  if (capReached) {
    return NextResponse.json({
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: true,
    })
  }

  logActivity(ctx.teamId, ctx.dbUserId, 'codex_lesson_completed', { trackSlug, lessonId }).catch(console.error)

  return NextResponse.json({
    passed: true,
    perQuestion: grade.perQuestion,
    ratio: grade.ratio,
    kpEarned: award.kpEarned,
    capReached: false,
  })
}
