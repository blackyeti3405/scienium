import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enforceRateLimit, type TierName } from '@/lib/rate-limit'
import {
  assertFeatureUnlocked,
  PhaseGateError,
  type Feature,
  type Phase,
  type LabType,
} from '@/lib/phase'

/**
 * Shared per-request guard for team-scoped API routes.
 *
 * Almost every authenticated handler repeats the same opening sequence:
 *   1. `auth()`            → 401 if signed out
 *   2. `enforceRateLimit`  → 429 if over the tier
 *   3. resolve active team → 404 if the user has no team   (queries `user`)
 *   4. `user.findUnique`   → 404 if no user row            (queries `user` AGAIN)
 *   5. `assertFeatureUnlocked` wrapped in a PhaseGateError try/catch → 403
 *
 * This helper resolves both the internal `User.id` (`dbUserId`) and explicit
 * `activeTeam` in one query. The membership lookup is a temporary compatibility
 * fallback for users created before active-team selection was persisted.
 *
 *   const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'buildings' })
 *   if (error) return error
 *   // ctx.dbUserId, ctx.teamId, ctx.phase, ctx.labType are all ready to use
 */
export interface TeamRouteContext {
  /** Clerk user id (the external identity). */
  userId: string
  /** Internal `User.id` — the foreign key used by every owned row. */
  dbUserId: string
  teamId: string
  phase: Phase
  labType: LabType | null
}

export type TeamRouteGuard =
  | { ctx: TeamRouteContext; error: null }
  | { ctx: null; error: NextResponse }

export interface RequireTeamOptions {
  /** Rate-limit tier to enforce (per-user + per-IP). */
  tier: TierName
  /** When set, the team's phase must unlock this feature or the request 403s. */
  feature?: Feature
}

export async function requireTeamContext(
  req: NextRequest,
  opts: RequireTeamOptions,
): Promise<TeamRouteGuard> {
  const { userId } = await auth()
  if (!userId) {
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  // Resolve the explicit active team and keep one legacy-membership fallback
  // until all deployed users have activeTeamId backfilled.
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      activeTeam: {
        select: { id: true, phase: true, labType: true },
      },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: { team: { select: { id: true, phase: true, labType: true } } },
      },
    },
  })

  const team = user?.activeTeam ?? user?.teamMemberships[0]?.team
  if (!team) {
    return { ctx: null, error: NextResponse.json({ error: 'No team found' }, { status: 404 }) }
  }

  if (opts.feature) {
    try {
      assertFeatureUnlocked(team.phase as Phase, opts.feature)
    } catch (err) {
      if (err instanceof PhaseGateError) {
        return { ctx: null, error: NextResponse.json({ error: err.message }, { status: 403 }) }
      }
      throw err
    }
  }

  return {
    ctx: {
      userId,
      dbUserId: user!.id,
      teamId: team.id,
      phase: team.phase,
      labType: team.labType,
    },
    error: null,
  }
}
