import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveActiveTeam } from '@/lib/team/context'
import { enforceRateLimit, type TierName } from '@/lib/rate-limit'
import { enterAiScope } from '@/lib/ai/scope'
import { beginRequest, logEvent } from '@/lib/observability/log'
import { recordSecurityEvent } from '@/lib/observability/security-event'
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

/**
 * Why a guard refused. A bounded enum, never a message built from the request —
 * `LogEvent.detail` is operator-facing text and nothing else.
 */
export type DenialReason =
  | 'unauthenticated'
  | 'cross_origin'
  | 'no_team'
  | 'phase_locked'
  /** Teacher guard: the caller is not teacher|admin (`lib/teacher/auth.ts`). */
  | 'not_teacher'
  /** Teacher guard: the class scope is larger than a request can represent. */
  | 'class_scope_overflow'
  /** Teacher guard: a claim-only teacher with no resolvable email. */
  | 'no_email'

/**
 * Emit the policy-denial event for a refused request (REFACTOR2 P1-5).
 *
 * It lives HERE, in the guards, rather than at 78 call sites: these are the only
 * places a denial of this shape is produced, so every guarded route inherits the
 * event and a new route cannot forget it. Rate-limit denials are deliberately
 * absent — `enforceRateLimit` already logs its own `rate_limit.denied`, and two
 * lines for one refusal is worse than none.
 *
 * TWO SINKS, on purpose. The log line answers "what is happening right now" and
 * expires with the drain; the `SecurityEvent` row is what is still there next
 * month, and is what the repeated-denial alert counts over. Exported so the
 * teacher guard — a different guard, the same kind of refusal — emits the
 * identical pair rather than growing its own dialect.
 */
export function logDenied(
  req: NextRequest,
  tier: TierName,
  reason: DenialReason,
  status: number,
  userId: string | null,
): void {
  const pathname = new URL(req.url).pathname
  logEvent({
    event: 'route.denied',
    requestId: beginRequest(req),
    route: pathname,
    outcome: 'denied',
    status,
    tier,
    userId,
    detail: reason,
  })
  // Not awaited: a refusal has already been decided and its response is about to
  // be returned — the audit write must not add latency to it, and cannot change
  // it. `recordSecurityEvent` never rejects, so there is no unhandled rejection.
  void recordSecurityEvent({
    kind: 'authz.denied',
    outcome: 'denied',
    actorType: userId ? 'user' : 'anonymous',
    actorUserId: userId,
    targetType: 'route',
    // The route PATH — `LogEvent.route`'s own domain, and never a query string.
    targetId: pathname,
    reason,
  })
}

export async function requireTeamContext(
  req: NextRequest,
  opts: RequireTeamOptions,
): Promise<TeamRouteGuard> {
  const { userId } = await auth()
  if (!userId) {
    logDenied(req, opts.tier, 'unauthenticated', 401, null)
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) {
    logDenied(req, opts.tier, 'cross_origin', 403, userId)
    return { ctx: null, error: crossOrigin }
  }

  // Resolve the active team through membership (the ONE query for this lives in
  // lib/team/context.ts): a stored activeTeamId is only trusted while a
  // TeamMember row still backs it.
  const resolved = await resolveActiveTeam(userId)
  if (!resolved) {
    logDenied(req, opts.tier, 'no_team', 404, userId)
    return { ctx: null, error: NextResponse.json({ error: 'No team found' }, { status: 404 }) }
  }
  const { dbUserId, team } = resolved

  if (opts.feature) {
    try {
      assertFeatureUnlocked(team.phase as Phase, opts.feature)
    } catch (err) {
      if (err instanceof PhaseGateError) {
        logDenied(req, opts.tier, 'phase_locked', 403, userId)
        return { ctx: null, error: NextResponse.json({ error: err.message }, { status: 403 }) }
      }
      throw err
    }
  }

  // Attribute any paid AI call made later in this request to this team and user
  // (REFACTOR2 P1-R3). `enterWith` rather than a callback because this helper
  // returns context instead of wrapping the handler — the alternative was
  // threading a team id through six library functions that have no other reason
  // to know one, and remembering to do it at every new call site.
  enterAiScope({ teamId: team.id, userId: dbUserId })

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
    logDenied(req, opts.tier, 'unauthenticated', 401, null)
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) {
    logDenied(req, opts.tier, 'cross_origin', 403, userId)
    return { ctx: null, error: crossOrigin }
  }

  return { ctx: { userId }, error: null }
}
