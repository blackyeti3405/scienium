import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * `/lab` must never render a load FAILURE as a brand-new empty lab (§0.9 Row C2).
 *
 * The ATTACK: the page's one team query throws (a dropped connection, a pool
 * timeout, a replica hiccup). Before this fix a bare `catch {}` swallowed it and
 * the page rendered its cold-start defaults — team name "Your Lab", phase
 * `discovery`, 0 KP, 0 LC. A student in the showcase phase with a full lab
 * reloads the page and is shown, with no error anywhere, a lab that looks
 * freshly created. Same shape one level down: `loadPlotState` failing used to
 * fall back to the DEFAULT gateway layout, hiding every building the team had
 * bought and placed.
 *
 * These tests call the real page function with the DB throwing and assert it
 * REJECTS, so the route's error boundary renders its retry instead. The
 * positive cases keep the fix honest: a healthy DB still renders the real team,
 * and `next build`'s DB-less prerender still gets its defaults.
 */

const dbState: {
  findUnique: () => Promise<unknown>
  shop: () => Promise<unknown[]>
  gateways: () => Promise<unknown[]>
} = {
  findUnique: async () => null,
  shop: async () => [],
  gateways: async () => [],
}

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: () => dbState.findUnique() },
    teamShopBuilding: { findMany: () => dbState.shop() },
    teamGatewayPlacement: { findMany: () => dbState.gateways() },
  },
}))

const importLoad = async () =>
  (await import('@/app/(dashboard)/lab/loadLab')).loadLabPageData

const HEALTHY_USER = {
  activeTeamId: 'team_1',
  teamMemberships: [
    {
      teamId: 'team_1',
      team: {
        id: 'team_1',
        name: 'Photon Collective',
        phase: 'working',
        labType: 'volt_lab',
        currency: { kp: 420, clearanceLevel: 3, lc: 12 },
        members: [{ userId: 'u1' }, { userId: 'u2' }],
      },
    },
  ],
}

function load() {
  return importLoad().then((fn) => fn('user_e2e', {}))
}

describe('/lab — a load failure is not an empty lab', () => {
  beforeEach(() => {
    dbState.findUnique = async () => HEALTHY_USER
    dbState.shop = async () => []
    dbState.gateways = async () => []
    delete process.env.NEXT_PHASE
  })

  it('resolves the REAL team when the DB is healthy', async () => {
    const data = await load()
    expect(data.teamName).toBe('Photon Collective')
    expect(data.phase).toBe('working')
    expect(data.currency).toEqual({ kp: 420, clearanceLevel: 3, lc: 12 })
  })

  it('REJECTS when the team query fails, instead of returning a new lab', async () => {
    dbState.findUnique = async () => {
      throw new Error('connection terminated unexpectedly')
    }
    await expect(load()).rejects.toThrow('connection terminated unexpectedly')
  })

  it('REJECTS when the plot query fails, instead of the default gateway layout', async () => {
    dbState.shop = async () => {
      throw new Error('pool timeout')
    }
    await expect(load()).rejects.toThrow('pool timeout')
  })

  it('still falls back to defaults during a production PRERENDER', async () => {
    // The one legitimate reason the swallow existed: `next build` renders this
    // route with no database reachable. Narrowing it must not remove it.
    process.env.NEXT_PHASE = 'phase-production-build'
    dbState.findUnique = async () => {
      throw new Error('no database')
    }
    const data = await load()
    expect(data.teamName).toBe('Your Lab')
    expect(data.phase).toBe('discovery')
  })

  it('a user with no team gets the cold-start defaults, not an error', async () => {
    dbState.findUnique = async () => null
    const data = await load()
    expect(data.teamName).toBe('Your Lab')
    expect(data.placedBuildings).toEqual([])
    // …and the default gateway layout, which is legitimate here: there is no
    // team plot to contradict.
    expect(data.gatewayPositions.length).toBeGreaterThan(0)
  })
})
