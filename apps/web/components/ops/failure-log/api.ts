import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

const followupSchema = z.object({
  id: z.string(),
  question: z.string(),
  response: z.string().nullable(),
  answeredAt: z.coerce.string().nullable(),
})

const failureEntryBase = z.object({
  id: z.string(),
  happened: z.string(),
  learned: z.string(),
  author: z.string(),
  authorId: z.string(),
  createdAt: z.coerce.string(),
  editedBy: z.string().nullable(),
  editedAt: z.coerce.string().nullable(),
})

const failureEntrySchema = failureEntryBase.extend({ followup: followupSchema.nullable() })

// The edit PATCH response omits `followup` — the client preserves the
// existing value (see `useFailureLog.handleSaved`).
const savedFailureEntrySchema = failureEntryBase.extend({
  followup: followupSchema.nullable().optional(),
})

const okSchema = z.object({ ok: z.literal(true) })

export function fetchFailureLog() {
  return requestJson('/api/failure-log', z.object({ entries: z.array(failureEntrySchema) }))
}

export function saveFailureEntry(body: { happened: string; learned: string }, entryId?: string) {
  return requestJson(
    entryId ? `/api/failure-log/${entryId}` : '/api/failure-log',
    z.object({ entry: savedFailureEntrySchema }),
    {
      method: entryId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

export async function deleteFailureEntry(entryId: string): Promise<void> {
  await requestJson(`/api/failure-log/${entryId}`, okSchema, { method: 'DELETE' })
}

export function generateFollowup(entryId: string) {
  return requestJson(
    `/api/failure-log/${entryId}/followup`,
    z.object({ followup: followupSchema }),
    { method: 'POST' },
  )
}

export function answerFollowup(entryId: string, response: string) {
  return requestJson(
    `/api/failure-log/${entryId}/followup`,
    z.object({ followup: followupSchema }),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    },
  )
}
