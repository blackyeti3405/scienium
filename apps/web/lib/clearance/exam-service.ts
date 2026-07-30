import 'server-only'
import { db } from '@/lib/db'
import { recordActivity } from '@/lib/activity/log'
import { levelInfo } from '@/lib/clearance/expertise'

/**
 * Clearance-exam reward minting — the ONE owner of the money write behind
 * `app/api/expertise/grade`. SVC-1's third site: unlike the two quiz paths this
 * one has a single caller, so extracting it removes no duplication; what it
 * removes is a 60-line money transaction sitting inside a route handler,
 * beside the paid Claude call, where it could only be exercised through HTTP.
 *
 * Shape copied from `lib/economy/lab-credit.ts` (A6): the transaction lives
 * here, and the caller gets an explicit outcome it maps to HTTP — never a
 * `NextResponse`.
 *
 * The property this module exists to protect: the high-water `lt` guard and the
 * `kp: { increment }` ride in the SAME `updateMany`. Splitting them reads
 * harmless and pays a team twice for one level — `test/expertise-grade.test.ts`
 * pins it, including two concurrent passing submissions.
 */

export interface ExamAttemptRow {
  question: string
  response: string
  evaluation: string
  score: number
}

export interface ExamGradeCommit {
  examId: string
  teamId: string
  dbUserId: string
  targetLevel: number
  /** Our own grading claim — the commit is conditional on still holding it. */
  gradingRequestId: string
  aggregate: number
  passed: boolean
  attempts: ExamAttemptRow[]
}

export type ExamGradeOutcome =
  /** `raised` is the row count of the conditional raise: did THIS pass advance the team? */
  | { ok: true; raised: boolean; newClearance: number }
  /** A stale-recovered request took our claim mid-call; nothing was written. */
  | { ok: false; reason: 'claim_lost' }

export async function commitExamGrade(input: ExamGradeCommit): Promise<ExamGradeOutcome> {
  // The clearance bonus is a fixed property of the target level; whether it is
  // actually awarded is decided by the conditional raise below, not here.
  const kpBonus = levelInfo(input.targetLevel)?.kpBonus ?? 0

  // Commit everything in one interactive transaction and DERIVE the result from
  // the committed writes — never from a pre-read guess.
  try {
    return await db.$transaction(async (tx) => {
      // Mark graded from OUR claim. If another (stale-recovered) request took over,
      // this affects 0 rows — bail out so we never double-award or lie about state.
      const mark = await tx.expertiseExam.updateMany({
        where: { id: input.examId, status: 'grading', gradingRequestId: input.gradingRequestId },
        data: {
          status: 'graded',
          score: input.aggregate,
          passed: input.passed,
          gradedAt: new Date(),
          gradingClaimedAt: null,
          gradingRequestId: null,
        },
      })
      if (mark.count === 0) throw new ClaimLost()

      await tx.expertiseAttempt.createMany({
        data: input.attempts.map((a) => ({
          examId: input.examId,
          userId: input.dbUserId,
          ...a,
        })),
      })

      // Ensure a currency row exists (legacy teams), then raise atomically. The
      // `lt` guard makes the raise idempotent and safe against concurrent passes —
      // its row count is the authoritative answer to "did this pass raise us?".
      await tx.teamCurrency.upsert({
        where: { teamId: input.teamId },
        create: { teamId: input.teamId },
        update: {},
      })
      const raise = input.passed
        ? await tx.teamCurrency.updateMany({
            where: { teamId: input.teamId, clearanceLevel: { lt: input.targetLevel } },
            data: { clearanceLevel: input.targetLevel, kp: { increment: kpBonus } },
          })
        : { count: 0 }
      const cur = await tx.teamCurrency.findUnique({
        where: { teamId: input.teamId },
        select: { clearanceLevel: true },
      })
      // Durable (REFACTOR2 P1-R5): the clearance raise and its record commit
      // together — this `raise.count > 0` guard is the same one that decides
      // whether the KP bonus itself landed.
      if (raise.count > 0) {
        await recordActivity(tx, input.teamId, input.dbUserId, 'clearance_raised', {
          level: input.targetLevel,
          title: levelInfo(input.targetLevel)?.title,
          score: input.aggregate,
        })
      }
      return { ok: true as const, raised: raise.count > 0, newClearance: cur?.clearanceLevel ?? 0 }
    })
  } catch (err) {
    if (err instanceof ClaimLost) return { ok: false, reason: 'claim_lost' }
    throw err
  }
}

/** Thrown inside the commit tx when our grading claim was superseded (stale recovery). */
class ClaimLost extends Error {}

/** KP a passing exam at this level is worth — the caller reports it only when `raised`. */
export function clearanceBonus(targetLevel: number): number {
  return levelInfo(targetLevel)?.kpBonus ?? 0
}
