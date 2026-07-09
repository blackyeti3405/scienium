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
