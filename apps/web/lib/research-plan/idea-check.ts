import { db } from '@/lib/db'

/**
 * Shared rate-limit helpers for the "has this idea been done before?" web-search
 * agent (Feature 2C). Capped at 3 runs PER TEAM PER DAY (local-time calendar
 * day), counted from IdeaCheck.createdAt.
 */

export const IDEA_CHECK_DAILY_LIMIT = 3

/** Count today's idea checks for a team (since local midnight). */
export async function ideaChecksUsedToday(teamId: string): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return db.ideaCheck.count({ where: { teamId, createdAt: { gte: start } } })
}
