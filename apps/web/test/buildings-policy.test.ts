import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — buildings family (`/api/buildings/**`). P1-1's
 * highest-consequence gap: these five routes are the only ones a student can
 * use to SPEND and REFUND Knowledge Points, and they had no route-level
 * coverage of any kind. `lib/buildings/service.ts` is well tested; what was
 * untested is everything between the HTTP boundary and it — which is precisely
 * where the two bug classes `test/route-guard-sweep.test.ts` cannot see live:
 * a `withTeamRoute` whose guard result is ignored, and a service call handed
 * the wrong tenant.
 *
 * The four-case access matrix is preserved (same-team success, another team's
 * REAL key rejected, signed-out, over-limit), and the "another team's real key"
 * case is the one that matters for money: team B genuinely owns `workshop`, so
 * a handler that scoped by key alone would sell it, refund team A, and pass any
 * fake-id IDOR test ever written.
 *
 * Conflict/invalid-input behaviour for the same handlers is here too (P1-1's
 * second clause) — off-grid coordinates, an unknown key, an occupied cell, an
 * unaffordable purchase — because each is a decision the route makes, not an
 * interleaving. The real races belong to `test/pg/invariants.pg.test.ts`.
 */

import { GET as shopGET } from '@/app/api/buildings/route'
import { POST as placePOST } from '@/app/api/buildings/place/route'
import { POST as movePOST } from '@/app/api/buildings/move/route'
import { POST as sellPOST } from '@/app/api/buildings/sell/route'
import { POST as upgradePOST } from '@/app/api/buildings/upgrade/route'
import { shopBuilding } from '@/lib/shop'
import { PLOT_RADIUS } from '@/lib/plot'

/** A tier-0 Volt Lab building — both fixture teams are `volt_lab`. */
const KEY = 'workshop'
const COST = shopBuilding(KEY)!.cost

let h: RoutePolicyHarness

/** Give a team the KP to afford `n` copies of the tier-0 building. */
function fund(teamId: string, kp: number) {
  h.seed('teamCurrency', { teamId, kp, lc: 100, clearanceLevel: 4 })
}

/** Free plot cells — the 7 gateways own (0,0), (±1,±1), (0,1), (1,0). */
const FREE = { gx: -2, gy: 0 }
const FREE2 = { gx: -2, gy: -2 }
const PARKED = { gx: -3, gy: -3 }

/** Put a placed, paid-for building on a team's plot. */
function placed(teamId: string, key = KEY, gx = PARKED.gx, gy = PARKED.gy) {
  h.seed('teamShopBuilding', {
    teamId,
    buildingKey: key,
    posX: gx,
    posY: gy,
    costPaid: COST,
    level: 1,
  })
}

beforeEach(() => {
  h = routeHarness()
})

describe('GET /api/buildings — shop + plot state', () => {
  it('200s for a team member', async () => {
    fund(h.ids.teamA, COST)
    const body = await h.asStudentA().get(shopGET).expect(200)
    expect(body.kp).toBe(COST)
  })

  it("never reports ANOTHER team's currency", async () => {
    // Team B seeded FIRST on purpose: an unscoped `findFirst` would return the
    // first row in the store, so seeding our own team first would let this test
    // pass against a query with no `teamId` at all.
    fund(h.ids.teamB, 999_999)
    fund(h.ids.teamA, 10)
    const body = await h.asStudentA().get(shopGET).expect(200)
    expect(body.kp).toBe(10)
  })

  it('401s signed out', () => h.anonymous().get(shopGET).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(shopGET).expect(429))
})

describe('POST /api/buildings/place — the purchase', () => {
  const body = { key: KEY, ...FREE }

  it('debits the buying team exactly once', async () => {
    fund(h.ids.teamA, COST + 50)

    const res = await h.asStudentA().post(placePOST, {}, { body }).expect(200)

    expect(res.kp).toBe(50)
    expect(h.rows('teamShopBuilding')).toHaveLength(1)
    expect(h.rows('teamShopBuilding')[0]).toMatchObject({ teamId: h.ids.teamA })
  })

  it('401s signed out — and nothing is bought', async () => {
    fund(h.ids.teamA, COST)
    await h.anonymous().post(placePOST, {}, { body }).expect(401)
    expect(h.rows('teamShopBuilding')).toEqual([])
  })

  it('429s over the tier', async () => {
    fund(h.ids.teamA, COST)
    await h.asStudentA().overLimit().post(placePOST, {}, { body }).expect(429)
  })

  it('403s a cross-origin purchase (CSRF)', async () => {
    fund(h.ids.teamA, COST)
    await h.asStudentA().crossOrigin().post(placePOST, {}, { body }).expect(403)
    expect(h.rows('teamShopBuilding')).toEqual([])
  })

  it('402s when the team cannot afford it, and debits nothing', async () => {
    fund(h.ids.teamA, COST - 1)

    await h.asStudentA().post(placePOST, {}, { body }).expect(402)

    expect(h.rows('teamShopBuilding')).toEqual([])
    expect(h.rows('teamCurrency')[0]!.kp).toBe(COST - 1)
  })

  it("cannot spend ANOTHER team's KP", async () => {
    // Team A is broke, team B is rich, and B's row comes first in the store.
    // TWO independent defenses stand between them — the scoped pre-check read
    // (`loadShopState`) and the scoped conditional debit
    // (`updateMany({ where: { teamId, kp: { gte: cost } } })`) — so this test
    // stays green if EITHER survives, and goes red when both `teamId`s are
    // dropped (verified by negative control). It pins the outcome, not one line.
    fund(h.ids.teamB, 999_999)
    fund(h.ids.teamA, 0)

    await h.asStudentA().post(placePOST, {}, { body }).expect(402)

    expect(h.rows('teamCurrency').find((c) => c.teamId === h.ids.teamB)!.kp).toBe(999_999)
  })

  it('400s an off-grid cell before any DB work', async () => {
    fund(h.ids.teamA, COST)
    await h
      .asStudentA()
      .post(placePOST, {}, { body: { key: KEY, gx: PLOT_RADIUS + 1, gy: 0 } })
      .expect(400)
    expect(h.rows('teamShopBuilding')).toEqual([])
  })

  it('400s a malformed body (no key)', async () => {
    fund(h.ids.teamA, COST)
    await h.asStudentA().post(placePOST, {}, { body: { ...FREE } }).expect(400)
  })

  it('404s an unknown building key', async () => {
    fund(h.ids.teamA, COST)
    await h
      .asStudentA()
      .post(placePOST, {}, { body: { key: 'not_a_building', ...FREE } })
      .expect(404)
  })

  it('409s a cell this team already occupies', async () => {
    fund(h.ids.teamA, COST * 3)
    placed(h.ids.teamA, 'cnc_mill_shop', FREE.gx, FREE.gy)

    await h.asStudentA().post(placePOST, {}, { body }).expect(409)
  })

  it("is NOT blocked by another team's building on the same cell", async () => {
    // Plots are per-team. A cell occupancy check that forgot `teamId` would
    // make one lab's layout dictate every other lab's.
    fund(h.ids.teamA, COST)
    placed(h.ids.teamB, 'cnc_mill_shop', FREE.gx, FREE.gy)

    await h.asStudentA().post(placePOST, {}, { body }).expect(200)
  })
})

describe('POST /api/buildings/sell — the refund', () => {
  it('refunds the selling team and removes its own row', async () => {
    fund(h.ids.teamA, 0)
    placed(h.ids.teamA)

    const res = await h.asStudentA().post(sellPOST, {}, { body: { key: KEY } }).expect(200)

    expect(res.refund).toBeGreaterThan(0)
    expect(h.rows('teamShopBuilding')).toEqual([])
  })

  it("THE ATTACK: selling ANOTHER team's real building 404s and moves no money", async () => {
    fund(h.ids.teamA, 0)
    fund(h.ids.teamB, 0)
    placed(h.ids.teamB) // team B genuinely owns `workshop`; team A does not

    await h.asStudentA().post(sellPOST, {}, { body: { key: KEY } }).expect(404)

    expect(h.rows('teamShopBuilding')).toHaveLength(1) // still team B's
    expect(h.rows('teamCurrency').every((c) => c.kp === 0)).toBe(true)
  })

  it('401s signed out', async () => {
    placed(h.ids.teamA)
    await h.anonymous().post(sellPOST, {}, { body: { key: KEY } }).expect(401)
    expect(h.rows('teamShopBuilding')).toHaveLength(1)
  })

  it('429s over the tier', async () => {
    placed(h.ids.teamA)
    await h.asStudentA().overLimit().post(sellPOST, {}, { body: { key: KEY } }).expect(429)
  })

  it('404s a building nobody owns', async () => {
    fund(h.ids.teamA, 0)
    await h.asStudentA().post(sellPOST, {}, { body: { key: KEY } }).expect(404)
  })
})

describe('POST /api/buildings/upgrade', () => {
  it('upgrades this team’s own building', async () => {
    fund(h.ids.teamA, 999_999)
    placed(h.ids.teamA)

    const res = await h.asStudentA().post(upgradePOST, {}, { body: { key: KEY } }).expect(200)

    expect(res.level).toBe(2)
  })

  it("THE ATTACK: upgrading ANOTHER team's real building 404s and leaves it alone", async () => {
    fund(h.ids.teamA, 999_999)
    placed(h.ids.teamB)

    await h.asStudentA().post(upgradePOST, {}, { body: { key: KEY } }).expect(404)

    expect(h.rows('teamShopBuilding')[0]!.level).toBe(1)
  })

  it('401s signed out', () => h.anonymous().post(upgradePOST, {}, { body: { key: KEY } }).expect(401))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(upgradePOST, {}, { body: { key: KEY } }).expect(429))
})

describe('POST /api/buildings/move', () => {
  const move = { kind: 'economy' as const, key: KEY, ...FREE2 }

  it("moves this team's own building", async () => {
    placed(h.ids.teamA)
    await h.asStudentA().post(movePOST, {}, { body: move }).expect(200)
    expect(h.rows('teamShopBuilding')[0]).toMatchObject({ posX: FREE2.gx, posY: FREE2.gy })
  })

  it("THE ATTACK: moving ANOTHER team's real building 404s and does not move it", async () => {
    placed(h.ids.teamB)

    await h.asStudentA().post(movePOST, {}, { body: move }).expect(404)

    expect(h.rows('teamShopBuilding')[0]).toMatchObject({ posX: PARKED.gx, posY: PARKED.gy })
  })

  it('400s an off-grid destination', async () => {
    placed(h.ids.teamA)
    await h
      .asStudentA()
      .post(movePOST, {}, { body: { ...move, gx: -(PLOT_RADIUS + 1) } })
      .expect(400)
  })

  it('400s an unknown `kind`', async () => {
    placed(h.ids.teamA)
    await h.asStudentA().post(movePOST, {}, { body: { ...move, kind: 'gateway_lol' } }).expect(400)
  })

  it('401s signed out', () => h.anonymous().post(movePOST, {}, { body: move }).expect(401))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(movePOST, {}, { body: move }).expect(429))
})
