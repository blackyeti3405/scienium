import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Transactional logic of the plot economy service — the money-moving paths the
 * key-validation suite (service.test.ts) deliberately leaves alone.
 *
 * Economy math (evaluatePurchase, sellRefund, upgrade costs) and plot geometry
 * (occupancyOf, cellKey) run REAL — they're pure and tested elsewhere; mocking
 * them here would let the service drift against them silently. Only I/O is
 * mocked: db, the advisory lock, the shop/plot state loaders, activity log.
 *
 * The invariants pinned:
 *  - purchase debits via a CONDITIONAL updateMany (kp >= cost) — insufficient
 *    KP means no building row, no partial debit;
 *  - the in-lock occupancy re-check overrides the stale pre-check snapshot;
 *  - sell deletes and refunds atomically off costPaid;
 *  - upgrade's level bump is guarded on the level it costed against, so a
 *    lost race 409s instead of skipping a level.
 */

const mocks = vi.hoisted(() => ({
  lockAggregate: vi.fn(() => Promise.resolve()),
  loadShopState: vi.fn(),
  loadPlotState: vi.fn(),
  logActivity: vi.fn(() => Promise.resolve()),
  tx: {
    teamShopBuilding: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(() => Promise.resolve({})),
      update: vi.fn(() => Promise.resolve({ costPaid: 1000, level: 1 })),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
      delete: vi.fn(() => Promise.resolve({})),
    },
    teamGatewayPlacement: {
      findFirst: vi.fn(),
      upsert: vi.fn(() => Promise.resolve({})),
    },
    teamCurrency: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  dbTeamShopBuildingFindUnique: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/shop-server', () => ({ loadShopState: mocks.loadShopState }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/plot-server', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlotState: mocks.loadPlotState,
}))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(mocks.tx),
    teamShopBuilding: { findUnique: mocks.dbTeamShopBuildingFindUnique },
  },
}))

import { placeBuilding, moveBuilding, sellBuilding, upgradeBuilding } from './service'
import { sellRefund, upgradeKpCost } from '@/lib/economy'

// 'workshop': tier 0 → cost 1000, minClearance 0 (real catalog entry).
const KEY = 'workshop'
const BASE_COST = 1000

function shopState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    owned: [],
    kp: 5_000,
    clearanceLevel: 3,
    multiplier: 1,
    labType: 'volt_lab', // workshop lives in the volt_lab catalog
    ...overrides,
  }
}

function plotState(overrides: Partial<Record<string, unknown>> = {}) {
  return { economy: [], unplaced: [], gateways: [], ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.loadShopState.mockResolvedValue(shopState())
  mocks.loadPlotState.mockResolvedValue(plotState())
  mocks.tx.teamShopBuilding.findFirst.mockResolvedValue(null)
  mocks.tx.teamGatewayPlacement.findFirst.mockResolvedValue(null)
  mocks.tx.teamCurrency.findUnique.mockResolvedValue({ kp: 4_000, lc: 10 })
  mocks.tx.teamCurrency.updateMany.mockResolvedValue({ count: 1 })
  mocks.tx.teamCurrency.update.mockResolvedValue({ kp: 4_900 })
  mocks.tx.teamShopBuilding.updateMany.mockResolvedValue({ count: 1 })
})

describe('placeBuilding — purchase path', () => {
  it('debits conditionally (kp >= cost) and creates the placement', async () => {
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })

    expect(res.ok).toBe(true)
    expect(mocks.tx.teamCurrency.updateMany).toHaveBeenCalledWith({
      where: { teamId: 't1', kp: { gte: BASE_COST } },
      data: { kp: { decrement: BASE_COST } },
    })
    expect(mocks.tx.teamShopBuilding.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildingKey: KEY, posX: 2, posY: 3, costPaid: BASE_COST }),
      }),
    )
  })

  it('insufficient KP at debit time → 402, and NO building row is created', async () => {
    mocks.tx.teamCurrency.updateMany.mockResolvedValue({ count: 0 }) // conditional debit missed
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })

    expect(res).toMatchObject({ ok: false, status: 402 })
    expect(mocks.tx.teamShopBuilding.create).not.toHaveBeenCalled()
  })

  it('the in-lock occupancy re-check beats a stale pre-check snapshot (409, no debit)', async () => {
    // Pre-check snapshot says the cell is free; a concurrent place committed first.
    mocks.tx.teamShopBuilding.findFirst.mockResolvedValue({ buildingKey: 'other' })
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })

    expect(res).toMatchObject({ ok: false, status: 409 })
    expect(mocks.tx.teamCurrency.updateMany).not.toHaveBeenCalled()
  })

  it('an owned-but-unplaced building is positioned for FREE (no debit path)', async () => {
    mocks.loadPlotState.mockResolvedValue(plotState({ unplaced: [KEY] }))
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })

    expect(res.ok).toBe(true)
    expect(mocks.tx.teamCurrency.updateMany).not.toHaveBeenCalled()
    expect(mocks.tx.teamShopBuilding.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { posX: 2, posY: 3 } }),
    )
    // A free positioning is not a purchase — no activity entry.
    expect(mocks.logActivity).not.toHaveBeenCalled()
  })

  it('a concurrent double-buy surfacing as P2002 maps to 409, not a 500', async () => {
    mocks.tx.teamShopBuilding.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    )
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })
    expect(res).toMatchObject({ ok: false, status: 409 })
  })

  it('pre-check occupancy from the snapshot rejects before any transaction', async () => {
    mocks.loadPlotState.mockResolvedValue(
      plotState({ economy: [{ key: 'other', gx: 2, gy: 3, level: 1 }] }),
    )
    const res = await placeBuilding('t1', 'u1', { key: KEY, gx: 2, gy: 3 })
    expect(res).toMatchObject({ ok: false, status: 409 })
    expect(mocks.lockAggregate).not.toHaveBeenCalled()
  })
})

describe('moveBuilding', () => {
  it('a no-op drop on the building’s own cell is allowed (own row excluded)', async () => {
    mocks.loadPlotState.mockResolvedValue(
      plotState({ economy: [{ key: KEY, gx: 2, gy: 3, level: 1 }] }),
    )
    mocks.tx.teamShopBuilding.findUnique.mockResolvedValue({ posX: 2 })
    const res = await moveBuilding('t1', { kind: 'economy', key: KEY, gx: 2, gy: 3 })
    expect(res.ok).toBe(true)
  })

  it('in-lock re-check: a concurrent occupant 409s the move', async () => {
    mocks.loadPlotState.mockResolvedValue(
      plotState({ economy: [{ key: KEY, gx: 0, gy: 0, level: 1 }] }),
    )
    mocks.tx.teamGatewayPlacement.findFirst.mockResolvedValue({ gatewayKey: 'ops_hub' })
    const res = await moveBuilding('t1', { kind: 'economy', key: KEY, gx: 2, gy: 3 })
    expect(res).toMatchObject({ ok: false, status: 409 })
    expect(mocks.tx.teamShopBuilding.update).not.toHaveBeenCalled()
  })

  it('an economy building not on the plot 404s inside the lock too', async () => {
    mocks.loadPlotState.mockResolvedValue(
      plotState({ economy: [{ key: KEY, gx: 0, gy: 0, level: 1 }] }),
    )
    mocks.tx.teamShopBuilding.findUnique.mockResolvedValue({ posX: null }) // owned, unplaced
    const res = await moveBuilding('t1', { kind: 'economy', key: KEY, gx: 2, gy: 3 })
    expect(res).toMatchObject({ ok: false, status: 404 })
  })
})

describe('sellBuilding', () => {
  it('refunds sellRefund(costPaid) and deletes the row atomically', async () => {
    mocks.tx.teamShopBuilding.findUnique.mockResolvedValue({ costPaid: 1_500 })
    const expected = sellRefund(1_500)

    const res = await sellBuilding('t1', 'u1', KEY)

    expect(res).toMatchObject({ ok: true, refund: expected })
    expect(mocks.tx.teamShopBuilding.delete).toHaveBeenCalled()
    expect(mocks.tx.teamCurrency.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kp: { increment: expected } } }),
    )
  })

  it('a concurrent double-sell reads no row inside the lock → 404, nothing deleted', async () => {
    mocks.tx.teamShopBuilding.findUnique.mockResolvedValue(null)
    const res = await sellBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 404 })
    expect(mocks.tx.teamShopBuilding.delete).not.toHaveBeenCalled()
    expect(mocks.tx.teamCurrency.update).not.toHaveBeenCalled()
  })
})

describe('upgradeBuilding', () => {
  beforeEach(() => {
    mocks.dbTeamShopBuildingFindUnique.mockResolvedValue({
      level: 2,
      posX: 1,
      posY: 1,
      costPaid: 1_000,
    })
  })

  it('debits BOTH currencies in one conditional updateMany, bump guarded on the costed level', async () => {
    const kpCost = upgradeKpCost(BASE_COST, 3)
    const res = await upgradeBuilding('t1', 'u1', KEY)

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.level).toBe(3)
      expect(res.kpCost).toBe(kpCost)
      expect(res.costPaid).toBe(1_000 + kpCost) // total KP invested drives the sell refund
    }
    expect(mocks.tx.teamCurrency.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ kp: { gte: kpCost } }) }),
    )
    expect(mocks.tx.teamShopBuilding.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 't1', buildingKey: KEY, level: 2 },
        data: { level: { increment: 1 }, costPaid: { increment: kpCost } },
      }),
    )
  })

  it('a lost level race (bump matches 0 rows) → 409, never a skipped level', async () => {
    mocks.tx.teamShopBuilding.updateMany.mockResolvedValue({ count: 0 })
    const res = await upgradeBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 409 })
  })

  it('failed debit at a KP-only level names Knowledge Points', async () => {
    mocks.tx.teamCurrency.updateMany.mockResolvedValue({ count: 0 })
    mocks.tx.teamCurrency.findUnique.mockResolvedValue({ kp: 50, lc: 10 })
    const res = await upgradeBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 402 })
    if (!res.ok) expect(res.error).toMatch(/Knowledge Points/)
  })

  it('failed debit at a tier-up level with short LC names Lab Credits', async () => {
    // Level 3→4 is a tier-up (upgradeLcCost(4) > 0); LC below that cost must
    // produce the LC message, not the generic KP one.
    const { upgradeLcCost } = await import('@/lib/economy')
    expect(upgradeLcCost(4)).toBeGreaterThan(0) // fixture sanity: 4 IS a tier-up
    mocks.dbTeamShopBuildingFindUnique.mockResolvedValue({
      level: 3, posX: 1, posY: 1, costPaid: 1_000,
    })
    mocks.tx.teamCurrency.updateMany.mockResolvedValue({ count: 0 })
    mocks.tx.teamCurrency.findUnique.mockResolvedValue({ kp: 999_999, lc: 0 })
    const res = await upgradeBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 402 })
    if (!res.ok) expect(res.error).toMatch(/Lab Credits/)
  })

  it('an unplaced building cannot be upgraded (404)', async () => {
    mocks.dbTeamShopBuildingFindUnique.mockResolvedValue({
      level: 1,
      posX: null,
      posY: null,
      costPaid: 1_000,
    })
    const res = await upgradeBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 404 })
  })

  it('max level refuses with 409 before any transaction', async () => {
    mocks.dbTeamShopBuildingFindUnique.mockResolvedValue({
      level: 15,
      posX: 1,
      posY: 1,
      costPaid: 1_000,
    })
    const res = await upgradeBuilding('t1', 'u1', KEY)
    expect(res).toMatchObject({ ok: false, status: 409 })
    expect(mocks.lockAggregate).not.toHaveBeenCalled()
  })
})
