import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import type { ZodType } from 'zod'
import {
  requireTeamContext,
  type TeamRouteContext,
  type RequireTeamOptions,
} from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { beginRequest, logEvent } from '@/lib/observability/log'

/**
 * Composable handler wrapper for team-scoped API routes.
 *
 * Nearly every mutating route repeats the same prelude:
 *
 *   const { ctx, error } = await requireTeamContext(req, { tier, feature })
 *   if (error) return error
 *   const { data, error: bodyError } = await parseJson(req, Body)
 *   if (bodyError) return bodyError
 *
 * Each copy is a place to forget a guard-return. `withTeamRoute` runs the whole
 * prelude once and hands the handler a ready `{ ctx, data }`:
 *
 *   export const POST = withTeamRoute(
 *     { tier: 'mutate', feature: 'ops', body: Body },
 *     async ({ ctx, data }) => NextResponse.json(await doThing(ctx, data)),
 *   )
 *
 * Dynamic-segment routes receive `params` exactly as Next provides them.
 * Handlers may `throw new RouteError(message, status)` anywhere in their call
 * tree instead of threading error responses back up.
 *
 * Additive: `requireTeamContext` is unchanged and remains directly callable for
 * routes with non-standard preludes.
 */
export class RouteError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'RouteError'
    this.status = status
  }
}

interface WithTeamRouteOptions<TBody> extends RequireTeamOptions {
  /** When set, the JSON body is parsed + validated and handed over as `data`. */
  body?: ZodType<TBody>
  /**
   * Raise the shared body byte ceiling for this route (P2-S8). Omit it and the
   * route inherits `MAX_BODY_BYTES` — the ceiling is infrastructure, so a route
   * opts OUT of the default, never into having one.
   */
  maxBytes?: number
}

interface TeamRouteArgs<TBody> {
  req: NextRequest
  ctx: TeamRouteContext
  /** Parsed body when `body` schema was given; otherwise `undefined`. */
  data: TBody
  /** Dynamic route params (`[id]` etc.); empty object for static routes. */
  params: Record<string, string>
}

export function withTeamRoute<TBody = undefined>(
  opts: WithTeamRouteOptions<TBody>,
  handler: (args: TeamRouteArgs<TBody>) => Promise<Response>,
) {
  // Next 15: the route context's `params` is a Promise, and the generated
  // per-route type is exact (`Promise<{}>` for static routes, `Promise<{ id:
  // string }>` for dynamic ones) — so the boundary accepts the widest shape
  // (`Promise<unknown>`) and the single await below narrows for handlers,
  // which keep receiving plain params.
  return async (
    req: NextRequest,
    route: { params: Promise<unknown> },
  ): Promise<Response> => {
    // One structured line per request (REFACTOR2 P1-5), emitted from the
    // wrapper because the wrapper is the only thing that sees the whole
    // request: the guard alone cannot time a handler or know its status. Ids
    // are pseudonymized by `logEvent` itself. It is a log line, not a write —
    // nothing here touches the database.
    const started = Date.now()
    // Binds the id to the async context as well as returning it, so a security
    // event written from deep inside the handler carries the SAME requestId as
    // this line and as any denial the guard emitted.
    const requestId = beginRequest(req)
    const pathname = new URL(req.url).pathname
    let status = 500
    let teamId: string | null = null
    let dbUserId: string | null = null

    try {
      const { ctx, error } = await requireTeamContext(req, {
        tier: opts.tier,
        feature: opts.feature,
      })
      if (error) {
        status = error.status
        return error
      }
      teamId = ctx.teamId
      dbUserId = ctx.dbUserId

      let data = undefined as TBody
      if (opts.body) {
        const parsed = await parseJson(req, opts.body, { maxBytes: opts.maxBytes })
        if (parsed.error) {
          status = parsed.error.status
          return parsed.error
        }
        data = parsed.data
      }

      try {
        const params = ((await route.params) ?? {}) as Record<string, string>
        const res = await handler({ req, ctx, data, params })
        status = res.status
        return res
      } catch (err) {
        if (err instanceof RouteError) {
          status = err.status
          return NextResponse.json({ error: err.message }, { status: err.status })
        }
        throw err
      }
    } finally {
      // `status` stays 500 on an unhandled throw — the one outcome the handler
      // never got to report itself, and the one most worth seeing.
      logEvent({
        event: 'route.request',
        requestId,
        route: pathname,
        outcome: status < 400 ? 'ok' : status < 500 ? 'denied' : 'error',
        status,
        durationMs: Date.now() - started,
        tier: opts.tier,
        userId: dbUserId,
        teamId,
      })
    }
  }
}
