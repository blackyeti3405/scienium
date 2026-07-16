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

const explainAttemptSchema = z.object({
  attemptNo: z.number(),
  text: z.string(),
  accuracy: z.number(),
  completeness: z.number(),
  overall: z.number(),
  passed: z.boolean(),
  verdict: explainVerdictSchema,
})

const explainStateSchema = z.object({
  attemptCount: z.number(),
  bestScore: z.number(),
  passed: z.boolean(),
  latestText: z.string(),
  verdict: explainVerdictSchema,
  threshold: explainThresholdSchema,
  attempts: z.array(explainAttemptSchema),
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
