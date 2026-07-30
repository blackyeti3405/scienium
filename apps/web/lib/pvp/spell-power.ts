import { db } from '@/lib/db'
import type { SpellPowerTier } from '@scienium/shared-types'

// ─── Spell Power Tiers (Option B — spec §4.4) ─────────────────────────────
// The multiplier is applied to every spell's baseDamage on the attacker's side
// for the entire day. Resets at midnight. Raiding does NOT drain it.

export const SPELL_POWER_TIERS: {
  tier: SpellPowerTier
  label: string
  minTasks: number
  maxTasks: number
  multiplier: number
}[] = [
  { tier: 'NONE', label: 'Dormant', minTasks: 0, maxTasks: 0, multiplier: 0.5 },
  { tier: 'BASE', label: 'Active', minTasks: 1, maxTasks: 2, multiplier: 1.0 },
  { tier: 'BOOSTED', label: 'Charged', minTasks: 3, maxTasks: 4, multiplier: 1.5 },
  { tier: 'MAX', label: 'Overcharged', minTasks: 5, maxTasks: Infinity, multiplier: 2.0 },
]

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
