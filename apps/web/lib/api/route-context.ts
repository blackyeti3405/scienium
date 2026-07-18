import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveActiveTeam } from '@/lib/team/context'
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
 * This helper resolves both the internal `User.id` (`dbUserId`) and the active
 * team in one query. The team is resolved through membership (see
 * `pickActiveTeam`): a stored `activeTeamId` is trusted only when the user still
 * has a `TeamMember` row for it, so it can never leak another team's data.
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

/**
 * CSRF discipline (SEC-11): Clerk sessions ride on cookies, so "the browser has
 * a session" is not "the user intended this write" — a cross-site form/fetch
 * carries the cookie automatically. For mutating methods, a present `Origin`
 * header must match the request host. A missing Origin is allowed (non-browser
 * clients — tests, curl — don't send one and don't carry ambient cookies).
 * GET/HEAD/OPTIONS pass untouched; GET routes must not mutate.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null
  const origin = req.headers.get('origin')
  if (!origin) return null
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    if (host && new URL(origin).host === host) return null
  } catch {
    // Malformed Origin — treat as cross-site.
  }
  return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 })
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

  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) return { ctx: null, error: crossOrigin }

  // Resolve the active team through membership (the ONE query for this lives in
  // lib/team/context.ts): a stored activeTeamId is only trusted while a
  // TeamMember row still backs it.
  const resolved = await resolveActiveTeam(userId)
  if (!resolved) {
    return { ctx: null, error: NextResponse.json({ error: 'No team found' }, { status: 404 }) }
  }
  const { dbUserId, team } = resolved

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
      dbUserId,
      teamId: team.id,
      phase: team.phase,
      labType: team.labType,
    },
    error: null,
  }
}

/**
 * Sibling guard for routes that legitimately run *before* a team exists
 * (onboarding, join flows) or only need a rate-limited identity (the discovery
 * proxies). Mirrors `requireTeamContext`'s `{ ctx, error }` contract:
 *
 *   const { ctx, error } = await requireUserContext(req, { tier: 'read' })
 *   if (error) return error
 *   // ctx.userId is the Clerk user id
 *
 * Deliberately does NOT resolve the internal User row — several consumers
 * (onboarding) create it themselves, and the proxies never need it.
 */
export interface UserRouteContext {
  /** Clerk user id (the external identity). */
  userId: string
}

export type UserRouteGuard =
  | { ctx: UserRouteContext; error: null }
  | { ctx: null; error: NextResponse }

export async function requireUserContext(
  req: NextRequest,
  opts: { tier: TierName },
): Promise<UserRouteGuard> {
  const { userId } = await auth()
  if (!userId) {
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) return { ctx: null, error: crossOrigin }

  return { ctx: { userId }, error: null }
}
