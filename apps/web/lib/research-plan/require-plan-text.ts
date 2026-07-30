import 'server-only'
import { db } from '@/lib/db'
import type { ResearchPlan } from '@prisma/client'

/**
 * Load a team's research plan and guard on the one precondition every
 * plan-driven workflow (idea-check, review) shares: synced text to work
 * from. Both callers use the full `plan` row after the guard.
 */
export async function requirePlanText(
  teamId: string,
): Promise<{ ok: false; error: string; status: number } | { ok: true; plan: ResearchPlan }> {
  const plan = await db.researchPlan.findUnique({ where: { teamId } })
  if (!plan?.lastSyncedText) {
    return {
      ok: false,
      error: 'Add your plan first — connect a Google Doc or paste your text',
      status: 400,
    }
  }
  return { ok: true, plan }
}
