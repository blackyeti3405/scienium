import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/**
 * Synthesis Matrix client API — zod response schemas + `requestJson`
 * wrappers, mirroring `components/literature/api.ts`. Runtime-validates every
 * server response so a shape drift fails loudly in dev instead of silently
 * rendering `undefined`.
 */

const columnSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
})

const paperRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
})

const cellSchema = z.object({
  paperId: z.string(),
  columnId: z.string(),
  text: z.string(),
})

const findingSchema = z.object({
  columnId: z.string(),
  paperIds: z.array(z.string()),
  claim: z.string(),
  studentNoticed: z.boolean(),
})

const verdictSchema = z.object({
  agreements: z.array(findingSchema),
  contradictions: z.array(findingSchema),
  gaps: z.array(z.object({ text: z.string(), columnId: z.string().optional() })),
  cellIssues: z.array(z.object({ paperId: z.string(), columnId: z.string(), note: z.string() })),
  suggestedColumns: z.array(z.object({ label: z.string(), hint: z.string() })),
  summary: z.string(),
})

const matrixSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string(),
  columns: z.array(columnSchema),
  papers: z.array(paperRefSchema),
  cells: z.array(cellSchema),
  /** Server-issued digest of the grid this response describes (P1-R13). */
  inputHash: z.string(),
  lastCheck: verdictSchema.nullable(),
  lastCheckedAt: z.string().nullable(),
  kpAwarded: z.number(),
  updatedAt: z.string(),
})

const matrixListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string(),
  paperCount: z.number(),
  updatedAt: z.string(),
  lastCheckedAt: z.string().nullable(),
})

const matrixListSchema = z.object({ matrices: z.array(matrixListItemSchema) })

const checkResultSchema = z.object({
  verdict: verdictSchema,
  cached: z.boolean(),
  kpEarned: z.number(),
  /** The grid changed while Vega was reading: verdict shown, nothing stored. */
  stale: z.boolean(),
})

export type SynthesisMatrixResponse = z.infer<typeof matrixSchema>
export type SynthesisCheckResult = z.infer<typeof checkResultSchema>

export function listMatrices() {
  return requestJson('/api/literature/synthesis', matrixListSchema)
}

export function createMatrix(paperIds: string[], templateId?: string) {
  return requestJson('/api/literature/synthesis', matrixSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paperIds, ...(templateId ? { templateId } : {}) }),
  })
}

export function getMatrix(id: string) {
  return requestJson(`/api/literature/synthesis/${id}`, matrixSchema)
}

export interface MatrixPatch {
  title?: string
  columns?: { id: string; label: string; hint?: string }[]
  paperIds?: string[]
  cells?: { paperId: string; columnId: string; text: string }[]
}

export function patchMatrix(id: string, patch: MatrixPatch) {
  return requestJson(`/api/literature/synthesis/${id}`, matrixSchema, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

/**
 * `expectedHash` is the digest the server last handed us for this matrix. The
 * server refuses (409) if its own grid no longer hashes to it, so a paid check
 * can only grade the snapshot the student was actually looking at (P1-R13).
 */
export function checkMatrix(id: string, expectedHash: string) {
  return requestJson(`/api/literature/synthesis/${id}/check`, checkResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedHash }),
  })
}
