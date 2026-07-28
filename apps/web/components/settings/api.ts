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

/**
 * Reminder preferences (spec §13.7).
 *
 * `email` is READ-ONLY here and on the route: it is the address Clerk verified
 * for this account (mirrored into `User.email`), and the only place reminders
 * can go. The field used to be a free-text destination anyone could point
 * anywhere (REFACTOR2 §0.8).
 */
export const notificationPrefsSchema = z.object({
  emailEnabled: z.boolean(),
  email: z.string().nullable(),
  deadlineDays: z.array(z.number()),
})

export function getNotificationPrefs() {
  return requestJson('/api/notifications/prefs', notificationPrefsSchema)
}

export function saveNotificationPrefs(input: { emailEnabled: boolean; deadlineDays: number[] }) {
  return requestJson('/api/notifications/prefs', notificationPrefsSchema, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
