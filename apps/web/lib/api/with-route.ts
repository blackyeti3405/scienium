import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import type { ZodType } from 'zod'
import {
  requireTeamContext,
  type TeamRouteContext,
  type RequireTeamOptions,
} from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'

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
    const { ctx, error } = await requireTeamContext(req, {
      tier: opts.tier,
      feature: opts.feature,
    })
    if (error) return error

    let data = undefined as TBody
    if (opts.body) {
      const parsed = await parseJson(req, opts.body, { maxBytes: opts.maxBytes })
      if (parsed.error) return parsed.error
      data = parsed.data
    }

    try {
      const params = ((await route.params) ?? {}) as Record<string, string>
      return await handler({ req, ctx, data, params })
    } catch (err) {
      if (err instanceof RouteError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }
  }
}
