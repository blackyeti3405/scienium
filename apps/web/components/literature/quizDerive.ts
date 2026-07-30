/**
 * Client-safe quiz derivations, extracted from `usePaperQuiz` so the logic
 * that decides WHICH answers a retry submits is testable. (The server twin,
 * `latestFailedQuestionIds` in lib/literature/quiz.ts, is not importable
 * here — that module reads the rubric off the filesystem.)
 *
 * A wrong failed-set silently submits the wrong retry answers — the student's
 * typed answer for one question grades against another, or a passed question
 * is resubmitted. Both corrupt grades/KP without any visible error.
 */

export interface GradedResultLike {
  results: Array<{ questionId: string; score: number }>
  threshold?: number
}

export const DEFAULT_PASS_THRESHOLD = 70

/** Ids of questions scored below the pass threshold on the latest grading. */
export function deriveFailedQuestionIds(results: GradedResultLike | null): Set<string> {
  if (!results) return new Set()
  const threshold = results.threshold ?? DEFAULT_PASS_THRESHOLD
  return new Set(results.results.filter((r) => r.score < threshold).map((r) => r.questionId))
}

/**
 * The retry POST's answers array: every still-failed question (an unanswered
 * one submits '', so the grader scores the blank rather than skipping it) plus
 * the fresh extra question.
 */
export function buildRetryAnswers(
  failedQuestionIds: Set<string>,
  newQuestionId: string,
  retryAnswers: Record<string, string>,
): Array<{ questionId: string; response: string }> {
  return [
    ...Array.from(failedQuestionIds).map((questionId) => ({
      questionId,
      response: retryAnswers[questionId] ?? '',
    })),
    { questionId: newQuestionId, response: retryAnswers[newQuestionId] ?? '' },
  ]
}
