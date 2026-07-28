import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import { createSaveQueue, type SaveQueue } from '@/lib/save-queue'

/** One PATCH-able snapshot of an in-progress clearance exam. */
export interface ExamProgress {
  examId: string
  answers: Record<string, string>
  progressIndex: number
}

export type ProgressSaver = SaveQueue<ExamProgress>

/**
 * The clearance exam's progress saver.
 *
 * The panel used to write progress with `fetch(...).catch(() => {})` — the
 * response status was never read and every failure was swallowed. On a GRADED
 * surface that means a student answers a question, sees it in the chat, presses
 * a button labelled "Save & exit — resume anytime", and resumes to find the
 * answer gone, with no message at any point. That button also fired the status
 * GET in the same tick as the still-in-flight PATCH, so the GET could read the
 * pre-save row and hand the student back a *shorter* exam even when the write
 * did land.
 *
 * The ordering rules live in `lib/save-queue.ts` — DOM-free, so the fix is
 * testable without a browser, which is why it is not four lines inside the panel.
 */
export function createProgressSaver(
  patch: (progress: ExamProgress) => Promise<void>,
): ProgressSaver {
  return createSaveQueue(patch)
}

const PatchAck = z.object({ ok: z.boolean() })

/** The real transport: PATCH /api/expertise, throwing `ApiError` on non-2xx. */
export async function patchExamProgress(progress: ExamProgress): Promise<void> {
  await requestJson('/api/expertise', PatchAck, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress),
  })
}

// ─── The rest of the clearance-exam client (REFACTOR2 P2-3) ──────────────────
//
// The panel used to hand-declare `Status`/`StartResponse`/`GradeResult` and cast
// `await res.json()` to them. The HANDOFF's rule is "provider AND own-API output
// gets a safeParse, never a cast", and this surface is where a cast costs
// something: the grade response is not just displayed, it is ARITHMETIC on the
// lab's currency —
//
//     addCurrency({ clearanceLevel: data.newClearance - prevClearance, kp: data.kpEarned })
//
// A body missing `newClearance` makes that `NaN`, and `labCurrency` has no
// guard: the status strip's clearance reads NaN for the rest of the session and
// the KP tick-up lands as `undefined`. Parsing turns that into the same visible
// "Failed to grade exam" every other failure produces, with the exam kept and
// retryable.

const examLevelSchema = z.object({
  title: z.string(),
  theme: z.string(),
  blurb: z.string(),
  kpBonus: z.number(),
})

/** An ungraded exam as the route shapes it (fresh or resumed). */
export const examSchema = z.object({
  examId: z.string(),
  targetLevel: z.number(),
  level: examLevelSchema,
  questions: z.array(z.object({ id: z.string(), prompt: z.string(), focus: z.string() })),
  /** Previously-saved answers (resume) — {} for a fresh exam. */
  answers: z.record(z.string(), z.string()),
  /** Index of the question to resume on — 0 for a fresh exam. */
  progressIndex: z.number(),
})

export const expertiseStatusSchema = z.object({
  clearanceLevel: z.number(),
  maxClearance: z.number(),
  threshold: z.number(),
  nextLevel: examLevelSchema.extend({ level: z.number() }).nullable(),
  /** The current user's in-progress exam, if any (for resume). */
  activeExam: examSchema.nullable(),
  levels: z.array(examLevelSchema.extend({ level: z.number(), cleared: z.boolean() })),
  history: z.array(
    z.object({
      id: z.string(),
      targetLevel: z.number(),
      score: z.number(),
      passed: z.boolean(),
      gradedAt: z.string(),
      by: z.string(),
    }),
  ),
})

export const gradeResultSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  threshold: z.number(),
  targetLevel: z.number(),
  raised: z.boolean(),
  // The two fields the currency write is computed from. Not optional, not
  // coerced: if they are absent the response is not a grade result.
  newClearance: z.number(),
  kpEarned: z.number(),
  results: z.array(
    z.object({ questionId: z.string(), score: z.number(), rationale: z.string() }),
  ),
})

export type ExpertiseStatus = z.infer<typeof expertiseStatusSchema>
export type ExamView = z.infer<typeof examSchema>
export type GradeResult = z.infer<typeof gradeResultSchema>

export function getExpertiseStatus(): Promise<ExpertiseStatus> {
  return requestJson('/api/expertise', expertiseStatusSchema)
}

/** Begin (or resume) an exam. PAID — one Claude call per fresh exam. */
export function startExam(): Promise<ExamView> {
  return requestJson('/api/expertise', examSchema, { method: 'POST' })
}

export function gradeExam(
  examId: string,
  answers: { questionId: string; response: string }[],
): Promise<GradeResult> {
  return requestJson('/api/expertise/grade', gradeResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, answers }),
  })
}
