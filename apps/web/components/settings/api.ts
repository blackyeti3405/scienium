import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/**
 * The slice of GET /api/research-plan the Lab & Profile settings panel needs
 * to show the connected doc/type — the load previously used a bare
 * `.catch(() => {})` with no `r.ok` check, so a network blip or a non-2xx
 * response left the panel looking like the team had never connected a plan
 * at all (§0.7). Parsed and re-throwable now, so the panel can tell the two
 * apart and offer a retry instead of silently showing an empty form.
 *
 * Extra response keys (`ideaCheck` quota, review/idea-check payloads…) are
 * ignored rather than declared — this panel only ever displays the sync
 * fields, unlike the full `useResearchPlan` hook.
 */
export const researchPlanSummarySchema = z.object({
  plan: z
    .object({
      googleDocUrl: z.string().nullable().optional(),
      projectType: z.string().nullable().optional(),
      projectSubtype: z.string().nullable().optional(),
      lastSyncedAt: z.string().nullable().optional(),
      hasText: z.boolean().optional(),
    })
    .nullable()
    .optional(),
})

export function getResearchPlanSummary() {
  return requestJson('/api/research-plan', researchPlanSummarySchema)
}
