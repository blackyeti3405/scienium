import { readFile } from 'fs/promises'
import path from 'path'

/** Number of free-response questions generated per quiz. */
export const QUIZ_QUESTION_COUNT = 5

/** Aggregate score (0-100) required to demonstrate proficiency. */
export const QUIZ_PASS_THRESHOLD = 70

/**
 * Flat ceiling on the aggregate once a session has gone through the retry
 * (targeted re-answer) loop. A first-try 100 stays strictly more valuable than
 * any retried pass, which removes the incentive to deliberately tank the first
 * attempt — no per-round bookkeeping required.
 */
export const RETRY_SCORE_CAP = 95

/** A generated question. `key` is the grading guidance — never sent to the client. */
export interface QuizQuestion {
  id: string
  prompt: string
  focus: string // e.g. "findings", "methodology", "relevance", "field knowledge"
  key: string // ideal-answer / grading notes, server-only
  /**
   * A 1-sentence teaching note on what a strong answer covers, emitted by the
   * grader only for questions that were scored below the pass threshold. It is
   * NEVER derived from `key` and never leaks the grading key verbatim — it is
   * safe to surface to the client (unlike `key`, which `stripKeys` removes).
   * Present only once a question has been graded and failed at least once.
   */
  strongAnswer?: string
}

/** What the client sees — the key is stripped. */
export type ClientQuizQuestion = Omit<QuizQuestion, 'key'>

export interface GradedAnswer {
  questionId: string
  score: number // 0-100
  rationale: string
  /** Present only when the answer scored below the pass threshold. */
  strongAnswer?: string
}

let cachedRubric: string | null = null

/** Loads the pedagogy/grading rubric markdown. Cached after first read. */
export async function loadRubric(): Promise<string> {
  if (cachedRubric) return cachedRubric
  const filePath = path.join(process.cwd(), 'lib', 'literature', 'quiz-rubric.md')
  cachedRubric = await readFile(filePath, 'utf-8')
  return cachedRubric
}

export function stripKeys(questions: QuizQuestion[]): ClientQuizQuestion[] {
  return questions.map(({ key: _key, ...rest }) => rest)
}

/** Extracts the first JSON value (object or array) from a model response. */
export function extractJson<T>(raw: string): T | null {
  const match = raw.match(/[[{][\s\S]*[\]}]/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

/**
 * Given the session's full question set and the latest per-question results,
 * returns the ids of questions whose latest score is below `threshold` — the
 * ones a retry must re-ask. Pure; a question with no result yet (shouldn't
 * happen for a graded session) is treated as failed so it's never silently
 * skipped.
 */
export function latestFailedQuestionIds(
  questions: Pick<QuizQuestion, 'id'>[],
  results: { questionId: string; score: number }[],
  threshold: number,
): string[] {
  const scoreById = new Map(results.map((r) => [r.questionId, r.score]))
  return questions
    .filter((q) => (scoreById.get(q.id) ?? -1) < threshold)
    .map((q) => q.id)
}

/**
 * Prompt builder for generating exactly ONE fresh question during a retry —
 * distinct from the existing prompts (passed in the user message so the model
 * avoids repeating them). Mirrors the shape/rigor of the full-quiz generation
 * prompt but asks for a single question object, not an array.
 */
export function NEW_QUESTION_INSTRUCTIONS(rubric: string): string {
  return `You are Vega, generating ONE additional free-response comprehension question for a research paper, as part of a targeted retry after a student missed some questions on their first attempt. Follow this rubric exactly:

${rubric}

You will be given the EXISTING question prompts already asked in this quiz (in the user message) — your new question must probe a DIFFERENT aspect of the paper and must not repeat or closely paraphrase any of them.

OUTPUT FORMAT:
Return ONLY a single JSON object (not an array):
- "prompt": the question text shown to the student (free-response)
- "focus": one short tag — one of "findings", "relevance", "methodology", or "field knowledge"
- "key": concise grading notes — the ideal answer and the specific points a correct response must hit. This is used later for grading and is never shown to the student.

No prose, no markdown fences — just the JSON object.`
}
