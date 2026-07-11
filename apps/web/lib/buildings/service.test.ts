import { describe, it, expect } from 'vitest'
import { placeBuilding, moveBuilding, sellBuilding, upgradeBuilding } from './service'

/**
 * These exercise the pre-database validation branches of the plot economy service —
 * the point of the Phase 10 extraction is that the rules are callable and assertable
 * without a Next request or React. They return before touching the DB, so they run in
 * a plain unit test. (The transactional paths are covered by the buildings E2E specs.)
 */
describe('buildings/service validation (no DB access)', () => {
  const TEAM = 'team_test'
  const USER = 'user_test'
  // Off the 3-cell-radius plot grid — rejected before any query.
  const OFF_GRID = 99

  it('place rejects an unknown building key with 404', async () => {
    const r = await placeBuilding(TEAM, USER, { key: '__nope__', gx: 0, gy: 0 })
    expect(r).toEqual({ ok: false, error: 'Unknown building', status: 404 })
  })

  it('move rejects an off-grid target with 400', async () => {
    const r = await moveBuilding(TEAM, { kind: 'economy', key: 'anything', gx: OFF_GRID, gy: OFF_GRID })
    expect(r).toEqual({ ok: false, error: 'That spot is off the plot.', status: 400 })
  })

  it('move rejects an unknown gateway with 404', async () => {
    const r = await moveBuilding(TEAM, { kind: 'gateway', key: '__nope__', gx: 0, gy: 0 })
    expect(r).toEqual({ ok: false, error: 'Unknown gateway', status: 404 })
  })

  it('sell rejects an unknown building key with 404', async () => {
    const r = await sellBuilding(TEAM, USER, '__nope__')
    expect(r).toEqual({ ok: false, error: 'Unknown building', status: 404 })
  })

  it('upgrade rejects an unknown building key with 404', async () => {
    const r = await upgradeBuilding(TEAM, USER, '__nope__')
    expect(r).toEqual({ ok: false, error: 'Unknown building', status: 404 })
  })
})
