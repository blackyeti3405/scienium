import { readFile } from 'fs/promises'
import path from 'path'

/** Number of free-response questions generated per quiz. */
export const QUIZ_QUESTION_COUNT = 5

/** Aggregate score (0-100) required to demonstrate proficiency. */
export const QUIZ_PASS_THRESHOLD = 70

/** A generated question. `key` is the grading guidance — never sent to the client. */
export interface QuizQuestion {
  id: string
  prompt: string
  focus: string // e.g. "findings", "methodology", "relevance", "field knowledge"
  key: string // ideal-answer / grading notes, server-only
}

/** What the client sees — the key is stripped. */
export type ClientQuizQuestion = Omit<QuizQuestion, 'key'>

export interface GradedAnswer {
  questionId: string
  score: number // 0-100
  rationale: string
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
