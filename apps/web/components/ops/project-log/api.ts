import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

const userRefSchema = z.object({ id: z.string(), name: z.string() })

const referenceChipSchema = z.object({
  id: z.string(),
  entryNumber: z.number(),
  stage: z.string().nullable(),
  createdAt: z.coerce.string(),
  createdByName: z.string(),
})

// POST/PATCH responses omit links/backlinks (and PATCH omits entryNumber);
// GET responses carry all three. Optional fields + the list schema's defaults
// keep one schema serving both shapes.
const savedEntrySchema = z.object({
  id: z.string(),
  entryNumber: z.number().optional(),
  body: z.string(),
  nextSteps: z.string(),
  stage: z.string().nullable(),
  attendeeIds: z.array(z.string()),
  attachmentUrls: z.array(z.string()),
  createdAt: z.coerce.string(),
  createdBy: userRefSchema,
  lastEditedBy: userRefSchema.nullable(),
  lastEditedAt: z.coerce.string().nullable(),
})

const logEntrySchema = savedEntrySchema.extend({
  entryNumber: z.number(),
  // Optional — defensive against older/partial responses (safety per plan
  // step 1); `useProjectLog` defaults them to [] on load.
  links: z.array(referenceChipSchema).optional(),
  backlinks: z.array(referenceChipSchema).optional(),
})

const logListSchema = z.object({
  entries: z.array(logEntrySchema),
  members: z.array(z.object({ userId: z.string(), name: z.string() })),
  labType: z.string().nullable().optional(),
})

const okSchema = z.object({ ok: z.literal(true) })

export function fetchProjectLog() {
  return requestJson('/api/project-log', logListSchema)
}

export function saveLogEntry(
  body: {
    body: string
    nextSteps: string
    stage: string | undefined
    attendeeIds: string[]
    attachmentUrls: string[]
  },
  entryId?: string,
) {
  return requestJson(
    entryId ? `/api/project-log/${entryId}` : '/api/project-log',
    z.object({ entry: savedEntrySchema }),
    {
      method: entryId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

export async function deleteLogEntry(entryId: string): Promise<void> {
  await requestJson(`/api/project-log/${entryId}`, okSchema, { method: 'DELETE' })
}

export function addLogReference(fromId: string, targetId: string) {
  return requestJson(
    `/api/project-log/${fromId}/references`,
    z.object({ reference: referenceChipSchema }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    },
  )
}

export async function removeLogReference(fromId: string, targetId: string): Promise<void> {
  await requestJson(
    `/api/project-log/${fromId}/references?targetId=${encodeURIComponent(targetId)}`,
    okSchema,
    { method: 'DELETE' },
  )
}
