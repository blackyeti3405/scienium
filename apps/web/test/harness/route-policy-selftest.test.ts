import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './route-policy'

/**
 * Self-test: proves the harness actually DISCRIMINATES the two bug classes the
 * policy matrix exists to catch. Three inline handlers share one shape; only
 * the correct one survives the matrix:
 *
 *   - `correctGET`      — real guard honored, query scoped `{ id, teamId }`
 *   - `unscopedGET`     — real guard honored, query `findUnique({ id })` (IDOR)
 *   - `guardlessGET`    — calls the guard but DROPS its error return
 *
 * The broken handlers are asserted to return the WRONG status (200 where the
 * matrix demands 404/401) — i.e. a matrix written against them would fail. If
 * the harness ever stops telling these apart (say the db mock stops filtering
 * by where-clause, or the Clerk mock always signs you in), THIS file goes red.
 */

import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'

const anyDb = db as any

async function correctGET(req: NextRequest, props: { params: Promise<unknown> }) {
  const params = (await props.params) as { id: string }
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error
  const row = await anyDb.widget.findFirst({ where: { id: params.id, teamId: ctx.teamId } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

async function unscopedGET(req: NextRequest, props: { params: Promise<unknown> }) {
  const params = (await props.params) as { id: string }
  const { error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error
  const row = await anyDb.widget.findUnique({ where: { id: params.id } }) // missing teamId
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

async function guardlessGET(req: NextRequest, props: { params: Promise<unknown> }) {
  const params = (await props.params) as { id: string }
  await requireTeamContext(req, { tier: 'read' }) // forgot: if (error) return error
  const row = await anyDb.widget.findUnique({ where: { id: params.id } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

let h: RoutePolicyHarness

beforeEach(() => {
  h = routeHarness()
  h.seed('widget', { id: 'w_a', teamId: h.ids.teamA, name: 'A' })
  h.seed('widget', { id: 'w_b', teamId: h.ids.teamB, name: 'B' })
})

describe('the correct handler passes the full matrix', () => {
  it('200s its own row', () => h.asStudentA().get(correctGET, 'w_a').expect(200))
  it("404s ANOTHER team's real row", () => h.asStudentA().get(correctGET, 'w_b').expect(404))
  it('401s signed out', () => h.anonymous().get(correctGET, 'w_a').expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(correctGET, 'w_a').expect(429))
})

describe('the harness catches an UNSCOPED query', () => {
  it("leaks another team's row (200 where the matrix expects 404)", async () => {
    const res = await h.asStudentA().get(unscopedGET, 'w_b').response()
    expect(res.status).toBe(200) // the leak — a matrix test would fail here
  })
  it('still 200s its own row (the bug is invisible to same-team tests)', () =>
    h.asStudentA().get(unscopedGET, 'w_a').expect(200))
  it('still 404s a nonexistent id — why fake-id IDOR tests miss this bug', () =>
    h.asStudentA().get(unscopedGET, 'clxxxxxxxxxxxxxxxxxxxxxxx').expect(404))
})

describe('the harness catches a DROPPED guard error', () => {
  it('serves an anonymous request (200 where the matrix expects 401)', async () => {
    const res = await h.anonymous().get(guardlessGET, 'w_a').response()
    expect(res.status).toBe(200) // fully unauthenticated — a matrix test would fail here
  })
})

describe('CSRF modifier', () => {
  it('403s a cross-origin POST through the real guard', async () => {
    const postHandler = async (req: NextRequest) => {
      const { error } = await requireTeamContext(req, { tier: 'mutate' })
      if (error) return error
      return NextResponse.json({ ok: true })
    }
    await h.asStudentA().crossOrigin().post(postHandler as any, 'w_a').expect(403)
  })
})
