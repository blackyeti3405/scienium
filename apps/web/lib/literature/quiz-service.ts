import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { computeQuizAward } from '@/lib/economy'
import { recordActivity } from '@/lib/activity/log'
import { maybeGrantLiteratureBonus } from '@/lib/team/advance'
import { lockAggregate } from '@/lib/db-lock'
import type { QuizQuestion } from '@/lib/literature/quiz'

/**
 * Paper-quiz reward minting — the ONE owner of the money write behind both the
 * initial grade (`app/api/papers/[id]/quiz/grade`) and the targeted retry
 * (`lib/literature/quiz-retry.ts`). SVC-1: the two callers held near-identical
 * 60-line transactions, so the high-water award, the `teamCurrency` upsert and
 * the durable `quiz_passed` record were free to drift apart.
 *
 * Shape copied from `lib/economy/lab-credit.ts` (A6): one module owning the
 * transaction and an explicit outcome the caller maps to HTTP — never a
 * `NextResponse`.
 *
 * The single behavioural difference between the two callers is kept as one
 * flag, because it is a real difference and not a knob:
 *
 *  - INITIAL grade: first writer wins. A concurrent request that already
 *    stamped `gradedAt` means we grade nothing and mint nothing (`graded:
 *    false`), so a race loser can never double-award or double-record.
 *  - RETRY: the session is already graded by definition, so the write is
 *    MONOTONIC (`score` max, `passed` OR) against an in-lock re-read, and it
 *    clears the grading claim in the same statement (P1-R11). A late low retry
 *    may never lower a verdict `PaperProficiency.demonstrated` still asserts.
 */

/** One row of per-question attempt history; the ids are supplied by the service. */
export interface QuizAttemptRow {
  question: string
  response: string
  evaluation: string
  score: number
}

export interface QuizGradeCommit {
  sessionId: string
  paperId: string
  paperTitle: string
  teamId: string
  dbUserId: string
  /** Server-computed aggregate over the questions WE asked (never the model's own number). */
  aggregate: number
  passed: boolean
  /** Full question set to persist, including any grader teaching notes. */
  questions: QuizQuestion[]
  attempts: QuizAttemptRow[]
  /** True for a retry submission — see the monotonic rule above. */
  retry: boolean
}

/** `graded: false` means a concurrent request owned this grade; nothing was written. */
export type QuizGradeOutcome = {
  graded: boolean
  kpEarned: number
  /** Set only on the submission that tips the team over the 25-source bonus. */
  bonusKp?: number
}

export async function commitQuizGrade(input: QuizGradeCommit): Promise<QuizGradeOutcome> {
  const outcome = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `paper-quiz:${input.paperId}:${input.dbUserId}`)
    const [fresh, existing] = await Promise.all([
      tx.paperQuizSession.findUnique({
        where: { id: input.sessionId },
        select: { gradedAt: true, score: true, passed: true },
      }),
      tx.paperProficiency.findUnique({
        where: { paperId_userId: { paperId: input.paperId, userId: input.dbUserId } },
        select: { kpAwarded: true, bestScore: true },
      }),
    ])
    if (!input.retry && fresh?.gradedAt) return { graded: false, kpEarned: 0 }

    // Proficiency + KP are tracked PER STUDENT, so every member earns
    // independently from the same sources. A source grants at most 100 KP to
    // each student — their quiz score on a passing attempt — and `kpAwarded` is
    // that student's high-water mark, so we top up only by the improvement. A
    // failing quiz, or a passing retake that doesn't beat this student's prior
    // best, grants nothing.
    const award = computeQuizAward({
      passed: input.passed,
      aggregate: input.aggregate,
      priorKp: existing?.kpAwarded ?? 0,
      priorBest: existing?.bestScore ?? 0,
    })

    await tx.paperQuizAttempt.createMany({
      data: input.attempts.map((a) => ({
        sessionId: input.sessionId,
        paperId: input.paperId,
        userId: input.dbUserId,
        ...a,
      })),
    })

    const questionsJson = input.questions as unknown as Prisma.InputJsonValue
    await tx.paperQuizSession.update({
      where: { id: input.sessionId },
      data: input.retry
        ? {
            score: Math.max(input.aggregate, fresh?.score ?? 0),
            passed: input.passed || (fresh?.passed ?? false),
            gradedAt: new Date(),
            questionsJson,
            retryGradeClaimedAt: null,
          }
        : {
            score: input.aggregate,
            passed: input.passed,
            gradedAt: new Date(),
            questionsJson,
          },
    })

    if (input.passed) {
      await tx.paperProficiency.upsert({
        where: { paperId_userId: { paperId: input.paperId, userId: input.dbUserId } },
        create: {
          paperId: input.paperId,
          userId: input.dbUserId,
          demonstrated: true,
          bestScore: award.newBestScore,
          kpAwarded: award.newKpAwarded,
        },
        update: {
          demonstrated: true,
          bestScore: award.newBestScore,
          kpAwarded: award.newKpAwarded,
        },
      })
    }
    if (award.kpEarned > 0) {
      await tx.teamCurrency.upsert({
        where: { teamId: input.teamId },
        create: { teamId: input.teamId, kp: award.kpEarned },
        update: { kp: { increment: award.kpEarned } },
      })
    }
    // Durable (REFACTOR2 P1-R5): the grade commit and its record land together,
    // gated on THIS call being the one that graded the session — a race loser
    // returned above and never double-records a pass.
    if (input.passed) {
      await recordActivity(tx, input.teamId, input.dbUserId, 'quiz_passed', {
        paperTitle: input.paperTitle,
        score: input.aggregate,
      })
    }
    return { graded: true, kpEarned: award.kpEarned }
  })

  // The 25-source bonus is checked AFTER the grading transaction commits, not
  // inside it: it reads the team's whole proficiency set, and doing that in the
  // same transaction would hold row locks across a much wider query for every
  // quiz submission. Its own conditional update makes it safe to call here, and
  // safe to call repeatedly — it pays at most once per team.
  if (outcome.graded && input.passed) {
    const bonusKp = await maybeGrantLiteratureBonus(input.teamId, input.dbUserId)
    if (bonusKp > 0) return { ...outcome, bonusKp }
  }
  return outcome
}
