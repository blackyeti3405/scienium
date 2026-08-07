import { db } from '@/lib/db'
import { SPELL_POWER_TIERS, type SpellPowerTier } from '@scienium/shared-types'

// The tier table lives in @scienium/shared-types so the server, the meter HUD
// and the lobby badge can never drift apart — it used to be copy-pasted into
// four files. Re-exported here for the existing import sites.
export { SPELL_POWER_TIERS }

export function getTierForTaskCount(tasksCompleted: number): {
  tier: SpellPowerTier
  multiplier: number
} {
  const entry =
    SPELL_POWER_TIERS.find(
      (t) => tasksCompleted >= t.minTasks && tasksCompleted <= t.maxTasks,
    ) ?? SPELL_POWER_TIERS[0]
  return { tier: entry.tier, multiplier: entry.multiplier }
}

// ─── DB: Team-scoped (combat engine) ───────────────────────────────────────

export async function getSpellPower(teamId: string): Promise<{
  tier: SpellPowerTier
  multiplier: number
  tasksCompleted: number
}> {
  const today = todayUtc()
  const row = await db.teamDailyTaskDay.findUnique({
    where: { teamId_date: { teamId, date: today } },
    select: { tasksCompleted: true },
  })
  const tasksCompleted = row?.tasksCompleted ?? 0
  const { tier, multiplier } = getTierForTaskCount(tasksCompleted)
  return { tier, multiplier, tasksCompleted }
}

export async function incrementDailyTaskCount(teamId: string): Promise<number> {
  const today = todayUtc()
  const result = await db.$queryRaw<[{ tasks_completed: number }]>`
    INSERT INTO "team_daily_task_days" ("team_id", "date", "tasks_completed", "updated_at")
    VALUES (${teamId}, ${today}, 1, NOW())
    ON CONFLICT ("team_id", "date")
    DO UPDATE SET "tasks_completed" = "team_daily_task_days"."tasks_completed" + 1,
                  "updated_at" = NOW()
    RETURNING "tasks_completed" AS "tasks_completed"
  `
  return result[0]?.tasks_completed ?? 1
}

// ─── Internal ──────────────────────────────────────────────────────────────

function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}
