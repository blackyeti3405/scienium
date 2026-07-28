import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'
import { opaqueId } from '@/lib/observability/log'

/**
 * Per-request structured observability (REFACTOR2 P1-5).
 *
 * `lib/observability/log.ts` was correct and wired into five modules; the API
 * surface itself emitted nothing. A route that refused a request left no trace
 * of the refusal, and no route reported its latency or outcome at all — so the
 * first question asked of a pilot incident ("which routes were denying, to
 * whom, and how slow was it") had no answer in the drain.
 *
 * Three attacks are pinned here, each against the REAL guard and the REAL route
 * handler (the policy harness mocks only Clerk and the database):
 *
 *  1. a refused request emits a denial event naming the reason — the event that
 *     does not exist if the guard silently returns its 401;
 *  2. an emitted line never contains a RAW identifier. A Clerk user id in a log
 *     line is a primary key: anyone holding the drain joins it back to a named
 *     minor. Pseudonymity is asserted by SEARCHING THE WHOLE LINE for the raw
 *     ids, so a new field that leaks one fails this test whatever it is called;
 *  3. a served request reports duration, status and outcome.
 */

vi.mock('server-only', () => ({}))

/** Every `route.*` line the sink wrote during one call. */
interface Line {
  event: string
  route?: string
  outcome?: string
  status?: number
  durationMs?: number
  tier?: string
  userId?: string
  teamId?: string
  detail?: string
}

let lines: string[] = []
let h: RoutePolicyHarness

beforeEach(() => {
  lines = []
  const capture = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '))
  }
  vi.spyOn(console, 'log').mockImplementation(capture)
  vi.spyOn(console, 'error').mockImplementation(capture)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Parsed `route.*` events, in emission order. */
function events(): Line[] {
  return lines
    .map((l) => {
      try {
        return JSON.parse(l) as Line
      } catch {
        return null
      }
    })
    .filter((e): e is Line => !!e && typeof e.event === 'string' && e.event.startsWith('route.'))
}

describe('P1-5 — policy denials are observable', () => {
  beforeEach(() => {
    h = routeHarness()
  })

  it('a signed-out request emits route.denied naming the reason', async () => {
    const { GET } = await import('@/app/api/literature/synthesis/route')
    await h.anonymous().get(GET).expect(401)

    const denied = events().find((e) => e.event === 'route.denied')
    expect(denied).toMatchObject({
      outcome: 'denied',
      status: 401,
      detail: 'unauthenticated',
      tier: 'read',
      route: '/api/route-under-test',
    })
    // No identity to attribute it to — an explicit null, never a guess.
    expect(denied?.userId).toBeNull()
  })

  it('a phase-locked feature emits route.denied with the phase reason', async () => {
    // `literature` is locked before the team reaches the reading phase.
    const locked = routeHarness({ phase: 'discovery' })
    const { GET } = await import('@/app/api/literature/synthesis/route')
    await locked.asStudentA().get(GET).expect(403)

    expect(events().find((e) => e.event === 'route.denied')).toMatchObject({
      outcome: 'denied',
      status: 403,
      detail: 'phase_locked',
    })
  })

  it('a cross-origin write emits route.denied with the CSRF reason', async () => {
    const { POST } = await import('@/app/api/team/location/route')
    await h.asStudentA().crossOrigin().post(POST, {}, { body: { zip: '02139' } }).expect(403)

    expect(events().find((e) => e.event === 'route.denied')).toMatchObject({
      outcome: 'denied',
      status: 403,
      detail: 'cross_origin',
    })
  })
})

describe('P1-5 — a served request reports latency and outcome', () => {
  beforeEach(() => {
    h = routeHarness()
  })

  it('route.request carries status, outcome and a duration', async () => {
    const { GET } = await import('@/app/api/literature/synthesis/route')
    await h.asStudentA().get(GET).expect(200)

    const req = events().find((e) => e.event === 'route.request')
    expect(req).toMatchObject({
      outcome: 'ok',
      status: 200,
      tier: 'read',
      route: '/api/route-under-test',
    })
    expect(typeof req?.durationMs).toBe('number')
    expect(req!.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('a denied request still reports its outcome through the wrapper', async () => {
    const { GET } = await import('@/app/api/literature/synthesis/route')
    await h.anonymous().get(GET).expect(401)

    expect(events().find((e) => e.event === 'route.request')).toMatchObject({
      outcome: 'denied',
      status: 401,
    })
  })
})

describe('P1-5 — logged identifiers are pseudonymous', () => {
  beforeEach(() => {
    h = routeHarness()
  })

  it('no emitted line contains a raw Clerk id, internal user id or team id', async () => {
    const { GET } = await import('@/app/api/literature/synthesis/route')
    await h.asStudentA().get(GET).expect(200)

    const whole = lines.join('\n')
    expect(whole).not.toContain(h.ids.clerkStudentA)
    expect(whole).not.toContain(h.ids.studentA)
    expect(whole).not.toContain(h.ids.teamA)

    // …and the pseudonyms that replaced them are the stable hashes, so a line
    // still joins to other lines about the same team.
    const req = events().find((e) => e.event === 'route.request')
    expect(req?.userId).toBe(opaqueId(h.ids.studentA))
    expect(req?.teamId).toBe(opaqueId(h.ids.teamA))
  })

  it('the pseudonym is stable across requests and distinct per identity', async () => {
    expect(opaqueId('user_abc')).toBe(opaqueId('user_abc'))
    expect(opaqueId('user_abc')).not.toBe(opaqueId('user_abd'))
    expect(opaqueId(null)).toBeNull()
    expect(opaqueId(undefined)).toBeUndefined()
  })
})
