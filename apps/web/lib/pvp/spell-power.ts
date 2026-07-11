import { db } from '@/lib/db'
import type { SpellPowerTier } from '@/packages/shared-types/src/pvp'

// ─── Spell Power Tiers (Option B — spec §4.4) ─────────────────────────────
// The multiplier is applied to every spell's baseDamage on the attacker's side
// for the entire day. It resets at midnight. Raiding does NOT drain it.

export const SPELL_POWER_TIERS: {
  tier: SpellPowerTier
  label: string
  minTasks: number
  maxTasks: number
  multiplier: number
}[] = [
  {
    tier: 'NONE',
    label: 'Dormant',
    minTasks: 0,
    maxTasks: 0,
    multiplier: 0.5,
  },
  {
    tier: 'BASE',
    label: 'Active',
    minTasks: 1,
    maxTasks: 2,
    multiplier: 1.0,
  },
  {
    tier: 'BOOSTED',
    label: 'Charged',
    minTasks: 3,
    maxTasks: 4,
    multiplier: 1.5,
  },
  {
    tier: 'MAX',
    label: 'Overcharged',
    minTasks: 5,
    maxTasks: Infinity,
    multiplier: 2.0,
  },
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

// ─── DB helpers ────────────────────────────────────────────────────────────

/**
 * Returns the Spell Power tier + multiplier for `teamId` based on how many
 * daily tasks its members have completed today (UTC midnight boundary).
 *
 * Returns NONE / 0.5x if no row exists yet (team hasn't done anything today).
 */
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

/**
 * Atomically increments today's task counter for `teamId` by 1.
 * Creates the row if it doesn't exist yet (upsert).
 *
 * Each pillar route (Codex complete, Project Log create, Failure Log submit,
 * Expertise exam pass, etc.) calls this once per task completion.
 *
 * Returns the new tasksCompleted value.
 */
export async function incrementDailyTaskCount(teamId: string): Promise<number> {
  const today = todayUtc()

  // Atomic upsert: if the row exists, increment; if not, create with 1.
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

/** UTC midnight as a DATE string (YYYY-MM-DD). */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
