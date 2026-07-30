import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

const paperStatus = z.enum(['processing', 'ready', 'error'])
const credibilityTier = z.enum(['peer_reviewed', 'preprint', 'open_access'])

export const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  status: paperStatus,
  proficiencyDemonstrated: z.boolean().default(false),
  fileUrl: z.string().nullable().optional(),
  createdAt: z.coerce.string(),
  credibilityTier: credibilityTier.nullable().optional(),
  doi: z.string().optional(),
})

const paperListSchema = z.object({ papers: z.array(paperSchema) })

export function listPapers() {
  return requestJson('/api/papers', paperListSchema)
}

export function getPaper(paperId: string) {
  return requestJson(`/api/papers/${paperId}`, paperSchema)
}

export async function deletePaper(paperId: string): Promise<void> {
  await requestJson(
    `/api/papers/${paperId}`,
    z.object({ ok: z.literal(true) }),
    { method: 'DELETE' },
  )
}

// ─── Explain it back ────────────────────────────────────────────────────────

// NOTE: fields are required (not `.default()`) here — the server's
// `normalizeVerdict` (lib/literature/explain.ts) guarantees every field is
// always present, and a `.default()` on the client schema makes zod's
// inferred Output/Input types diverge (defaulted fields become optional in
// the schema's Input type), which trips a TS generic-inference quirk in
// `requestJson<T>` and makes the destructured result fail to typecheck
// against the hand-written `ExplainState`/`ExplainVerdict` view types even
// though the runtime shape is identical. Required fields keep Input===Output.
export const explainVerdictSchema = z.object({
  accuracy: z.number(),
  completeness: z.number(),
  correctPoints: z.array(z.string()),
  missedPoints: z.array(z.string()),
  misconceptions: z.array(z.string()),
  followUpQuestion: z.string(),
})

const explainThresholdSchema = z.object({ accuracy: z.number(), completeness: z.number() })

const explainStateSchema = z.object({
  attemptCount: z.number(),
  bestScore: z.number(),
  passed: z.boolean(),
  latestText: z.string(),
  verdict: explainVerdictSchema,
  threshold: explainThresholdSchema,
})

const getExplanationSchema = z.object({ explanation: explainStateSchema.nullable() })

/** GET /api/papers/[id]/explain — this student's current explanation state. */
export function getExplanation(paperId: string) {
  return requestJson(`/api/papers/${paperId}/explain`, getExplanationSchema)
}

const submitExplanationSchema = z.object({
  attemptNo: z.number(),
  accuracy: z.number(),
  completeness: z.number(),
  overall: z.number(),
  passed: z.boolean(),
  kpEarned: z.number(),
  verdict: explainVerdictSchema,
  threshold: explainThresholdSchema,
})

/** POST /api/papers/[id]/explain — grade one submission (or revision). */
export function submitExplanation(paperId: string, text: string) {
  return requestJson(`/api/papers/${paperId}/explain`, submitExplanationSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

/**
 * The slice of `/api/team` the Literature Review needs to decide whether to
 * offer the literature_review → research_planning gate.
 *
 * ## Why this is parsed and not cast
 *
 * The effect was `fetch('/api/team').then(r => r.json()).then(d => …)` with no
 * `r.ok` and a `.catch` commenting "degrade gracefully — leave both null and
 * fall through to first-time path". There is no first-time path here. On any
 * non-2xx the route's `{ error: "…" }` body was read, `d.phase` came back
 * `undefined`, and the gate condition
 * `locked && (phase === 'literature_review' || !!researchIdea || !!ideaResult)`
 * evaluated **false** — so a team with 25/25 sources, sitting in
 * `literature_review` with no idea submitted yet, saw **no way to advance at
 * all**. The effect has `[]` deps, so nothing retried; only a full page reload
 * recovered. Reproduced against the original with a 429 body.
 *
 * Extra keys (members, invite, myClass…) are ignored rather than declared —
 * this is a read of one part of a larger response, and re-declaring the rest
 * would be a second contract to keep in step for no defect.
 */
export const teamPhaseSchema = z.object({
  phase: z.string(),
  researchIdea: z.string().nullish(),
  labType: z.string().nullish(),
})

export function getTeamPhase() {
  return requestJson('/api/team', teamPhaseSchema)
}

// ─── Comprehension quiz history ─────────────────────────────────────────────

const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  focus: z.string(),
})

const quizSessionSchema = z.object({
  sessionId: z.string(),
  questions: z.array(quizQuestionSchema),
  answers: z.record(z.string()).optional(),
  score: z.number(),
  passed: z.boolean(),
  threshold: z.number(),
  results: z.array(
    z.object({
      questionId: z.string(),
      score: z.number(),
      rationale: z.string(),
      strongAnswer: z.string().optional(),
    }),
  ),
})

/** Exported so the parse itself is testable over a real socket. */
export const quizHistorySchema = z.object({ session: quizSessionSchema.nullable() })

/**
 * The graded quiz session for this paper, or null when there is none.
 *
 * PARSED, not cast, and that is the whole point (REFACTOR2, the usePaperQuiz
 * row). The panel's mount effect read `data.session` off an unvalidated body and
 * treated anything falsy as "this student has never taken the quiz" — so a
 * 200 with a malformed or truncated body was indistinguishable from a fresh
 * paper, and the panel used to answer that by POSTing a PAID Anthropic quiz
 * generation nobody asked for. A schema failure now throws, and the caller
 * surfaces it as a retryable error instead of spending money on it.
 */
export function getQuizHistory(paperId: string) {
  return requestJson(`/api/papers/${paperId}/quiz`, quizHistorySchema)
}
