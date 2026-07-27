import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { loadTrack } from '@/lib/ops/codex/index'
import {
  gradeCheckpoint,
  computeKpAward,
  findLessonLocation,
  lessonUnlocked,
  CODEX_DAILY_LESSON_CAP,
} from '@/lib/ops/codex/engine'
import { recordActivity } from '@/lib/activity/log'
import type { CheckpointQuestion } from '@/lib/ops/codex/types'
import { todayUtc } from '@/lib/date'

/**
 * Codex lesson-completion application service (Track B P1-2, §3.2 E) — the
 * workflow behind `POST /api/ops/codex/complete`: server-authoritative
 * progression gate + checkpoint grading + once-ever per-student KP claim +
 * atomic daily-cap enforcement. The route is a thin adapter (guard, Zod
 * parse, one call, HTTP mapping).
 *
 * The client NEVER sends a score — only the chosen option ids/orderings/
 * pairs. This service loads the track's real content (the authoritative
 * answer key) via `loadTrack`, locates the lesson (404 if the lessonId
 * doesn't exist in that track — the IDOR/tamper guard), and re-derives
 * correctness with `gradeCheckpoint` server-side.
 *
 * PROGRESSION GATE (server-authoritative — the panel's own gating in
 * CodexTab.tsx is UX only, never trust-worthy on its own): before grading or
 * paying anything, load the student's completed-lesson-id set for THIS track
 * from `codexLessonProgress` and call `lessonUnlocked` (engine.ts) — the same
 * combined unit-unlock + intra-unit-sequential rule the panel renders from. A
 * locked lesson 403s immediately; a direct POST bypassing the UI (e.g.
 * completing unit 2 before unit 1, or lesson 3 of a unit before lesson 1-2)
 * can never grade, complete, or mint KP.
 *
 * PAYMENT INVARIANT (learned from the retired field-dispatch route's 25P02
 * incident): a caught unique-constraint violation inside a Prisma
 * `$transaction` still aborts the whole surrounding Postgres transaction
 * (25P02), so a bare `.create()`/`.update()` in a try/catch is NOT safe for
 * an idempotent once-ever payment. This service instead uses a raw
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` for the progress row
 * (raising the bestScore/kpAwarded high-water atomically) and a SEPARATE raw
 * `INSERT ... ON CONFLICT DO UPDATE ... WHERE lessons_completed < cap
 * RETURNING` for the daily-cap increment — the cap check and the increment
 * happen in ONE atomic statement, so two concurrent completions can never
 * both slip past the Nth-of-day limit (the WHERE clause on the UPDATE means
 * a losing concurrent request's RETURNING set is empty, not a stale read).
 * KP is only ever minted when both RETURNING sets are non-empty.
 */

export interface CodexPrincipal {
  dbUserId: string
  teamId: string
}

export interface CompleteLessonInput {
  trackSlug: string
  lessonId: string
  submission: Parameters<typeof gradeCheckpoint>[1]
}

export type CompleteLessonResult =
  | { ok: false; error: string; status: number }
  | {
      ok: true
      passed: boolean
      perQuestion: ReturnType<typeof gradeCheckpoint>['perQuestion']
      ratio: number
      kpEarned: number
      capReached: boolean
    }

export async function completeLesson(
  principal: CodexPrincipal,
  input: CompleteLessonInput,
): Promise<CompleteLessonResult> {
  const { trackSlug, lessonId, submission } = input

  let trackModule: Awaited<ReturnType<typeof loadTrack>>
  try {
    trackModule = await loadTrack(trackSlug)
  } catch {
    return { ok: false, error: 'Unknown track', status: 404 }
  }

  const location = findLessonLocation(trackModule, lessonId)
  if (!location) {
    return { ok: false, error: 'Lesson not found in this track', status: 404 }
  }
  const { lesson } = location

  // Server-authoritative progression gate — see the PROGRESSION GATE doc
  // comment above. Scoped to THIS track's own completed lesson ids only
  // (codexLessonProgress rows are per-student globally, so filter by
  // trackSlug — a completed lesson in a DIFFERENT track must never count
  // toward unlocking gates in this one).
  const completedRows = await db.codexLessonProgress.findMany({
    where: { userId: principal.dbUserId, teamId: principal.teamId, trackSlug, completed: true },
    select: { lessonId: true },
  })
  const completedLessonIds = new Set(completedRows.map((r) => r.lessonId))
  if (!lessonUnlocked(trackModule, lessonId, completedLessonIds)) {
    return {
      ok: false,
      error: 'This lesson is locked — complete its prerequisites first.',
      status: 403,
    }
  }

  // Server-authoritative grade — the client's submission is only option ids/
  // orderings/pairs, never a score.
  const grade = gradeCheckpoint(lesson.checkpoint.questions as CheckpointQuestion[], submission)

  const existing = await db.codexLessonProgress.findUnique({
    where: {
      userId_teamId_trackSlug_lessonId: {
        userId: principal.dbUserId,
        teamId: principal.teamId,
        trackSlug,
        lessonId,
      },
    },
    select: { kpAwarded: true },
  })
  const alreadyClaimed = (existing?.kpAwarded ?? 0) > 0
  const scorePct = Math.round(grade.ratio * 100)

  if (!grade.passed) {
    // Persist a non-completing bestScore high-water only — no KP, no cap
    // consumption, completion status unchanged.
    //
    // MONOTONIC (v0.68.0 fix — REFACTOR2 §0.7/§0.9). This used to be a plain
    // `findUnique` + app-computed `Math.max` + an absolute-value `upsert`: two
    // concurrent failed attempts could interleave so the LOWER score's write
    // landed last, silently overwriting a higher one (reproduced: two
    // concurrent 60%/20% submissions left 20% stored). A raw `GREATEST`-gated
    // `ON CONFLICT` makes the comparison atomic in Postgres instead of in
    // application code — the same pattern the first-time-completion path
    // below already uses (v0.37.0/P1-R11). `completed`/`kp_awarded` are only
    // set on INSERT (a genuinely new row); ON CONFLICT never touches them, so
    // a failed retry after an earlier pass can never un-complete the lesson.
    await db.$executeRaw(Prisma.sql`
      INSERT INTO "codex_lesson_progress" (user_id, team_id, track_slug, lesson_id, completed, best_score, kp_awarded, updated_at)
      VALUES (${principal.dbUserId}, ${principal.teamId}, ${trackSlug}, ${lessonId}, false, ${scorePct}, 0, now())
      ON CONFLICT (user_id, team_id, track_slug, lesson_id) DO UPDATE
        SET best_score = GREATEST("codex_lesson_progress".best_score, ${scorePct}),
            updated_at = now()
    `)
    return {
      ok: true,
      passed: false,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: false,
    }
  }

  // Passed. A re-pass of an already-completed lesson never pays and never
  // consumes a daily-cap slot — only a first-time completion (!alreadyClaimed)
  // does either.
  if (alreadyClaimed) {
    // MONOTONIC (v0.68.0 fix). This used to unconditionally set
    // `completedAt: new Date()` on every re-pass, silently overwriting the
    // student's genuine first-completion time with "now" (reproduced: a
    // single re-pass moved a fixed timestamp). The first completion time is
    // never touched again once set — completed/completedAt are simply
    // omitted here — and bestScore is raised via a conditional `updateMany`
    // whose WHERE clause carries the monotonic predicate (only write when
    // the new score is strictly greater), matching this codebase's
    // conditional-predicate convention (v0.43.0/v0.37.0) rather than a
    // read-then-write.
    await db.codexLessonProgress.updateMany({
      where: {
        userId: principal.dbUserId,
        teamId: principal.teamId,
        trackSlug,
        lessonId,
        bestScore: { lt: scorePct },
      },
      data: { bestScore: scorePct },
    })
    return {
      ok: true,
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: false,
    }
  }

  // First-time completion: daily-cap gate BEFORE attempting to mint KP. This
  // pre-check is a fast, friendly rejection; the atomic guarantee against a
  // concurrent double-slip is the WHERE-gated UPDATE inside the transaction
  // below, not this pre-check alone.
  const today = todayUtc()
  const kpDay = await db.codexKpDay.findUnique({
    where: {
      userId_teamId_day: { userId: principal.dbUserId, teamId: principal.teamId, day: today },
    },
    select: { lessonsCompleted: true },
  })
  if ((kpDay?.lessonsCompleted ?? 0) >= CODEX_DAILY_LESSON_CAP) {
    return {
      ok: true,
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: true,
    }
  }

  const award = computeKpAward({ passed: true, alreadyClaimed: false })

  // The `alreadyClaimed` read above is outside this transaction, so two
  // concurrent FIRST-time completions of the same lesson would both reach here
  // and both mint KP (BLK-4). The KP claim is therefore re-run in-transaction
  // as a genuine 0 → award transition: the WHERE-gated ON CONFLICT UPDATE lets
  // exactly one request through — the loser's RETURNING set is empty, not a
  // stale read. (This mirrors the daily-cap claim below; per the 25P02 lesson
  // in the doc comment, races are resolved by RETURNING-set emptiness, never
  // by catching a unique violation inside the transaction.)
  class CapSlotUnavailable extends Error {}
  let outcome: 'paid' | 'duplicate' | 'cap' = 'paid'
  try {
    await db.$transaction(async (tx) => {
      // Claim the once-ever lesson payment.
      const claimRows = await tx.$queryRaw<{ kp_awarded: number }[]>(Prisma.sql`
        INSERT INTO "codex_lesson_progress" (user_id, team_id, track_slug, lesson_id, completed, best_score, kp_awarded, completed_at, updated_at)
        VALUES (${principal.dbUserId}, ${principal.teamId}, ${trackSlug}, ${lessonId}, true, ${scorePct}, ${award.kpEarned}, now(), now())
        ON CONFLICT (user_id, team_id, track_slug, lesson_id) DO UPDATE
          SET completed = true,
              best_score = GREATEST("codex_lesson_progress".best_score, ${scorePct}),
              kp_awarded = ${award.kpEarned},
              completed_at = now(),
              updated_at = now()
          WHERE "codex_lesson_progress".kp_awarded = 0
        RETURNING kp_awarded
      `)
      if (claimRows.length === 0) {
        // A concurrent request already claimed this lesson's KP. Nothing has
        // been written in this transaction — just report the duplicate.
        outcome = 'duplicate'
        return
      }

      // Atomically claim ONE daily-cap slot: insert-or-increment the day's
      // counter, but only when doing so keeps it under the cap. The WHERE
      // clause is evaluated as part of the same atomic UPDATE, so two
      // concurrent transactions racing for the last slot can never both
      // succeed — exactly one RETURNING set will be non-empty.
      const capRows = await tx.$queryRaw<{ lessons_completed: number }[]>(Prisma.sql`
        INSERT INTO "codex_kp_days" (id, user_id, team_id, day, lessons_completed, updated_at)
        VALUES (gen_random_uuid()::text, ${principal.dbUserId}, ${principal.teamId}, ${today}, 1, now())
        ON CONFLICT (user_id, team_id, day) DO UPDATE
          SET lessons_completed = "codex_kp_days".lessons_completed + 1, updated_at = now()
          WHERE "codex_kp_days".lessons_completed < ${CODEX_DAILY_LESSON_CAP}
        RETURNING lessons_completed
      `)
      if (capRows.length === 0) {
        // Lost the race for the last cap slot — abort so the lesson claim
        // above rolls back too (no completion, no KP, no consumed slot).
        throw new CapSlotUnavailable()
      }

      // Both claims secured — mint the flat per-lesson KP onto the team.
      await tx.teamCurrency.upsert({
        where: { teamId: principal.teamId },
        create: { teamId: principal.teamId, kp: award.kpEarned },
        update: { kp: { increment: award.kpEarned } },
      })
      // Progression evidence commits with the KP that proves it (P1-R5).
      await recordActivity(tx, principal.teamId, principal.dbUserId, 'codex_lesson_completed', {
        trackSlug,
        lessonId,
      })
    })
  } catch (err) {
    if (!(err instanceof CapSlotUnavailable)) throw err
    outcome = 'cap'
  }

  if (outcome !== 'paid') {
    return {
      ok: true,
      passed: true,
      perQuestion: grade.perQuestion,
      ratio: grade.ratio,
      kpEarned: 0,
      capReached: outcome === 'cap',
    }
  }

  return {
    ok: true,
    passed: true,
    perQuestion: grade.perQuestion,
    ratio: grade.ratio,
    kpEarned: award.kpEarned,
    capReached: false,
  }
}
