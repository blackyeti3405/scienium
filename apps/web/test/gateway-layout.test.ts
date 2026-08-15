import { describe, it, expect } from 'vitest'
import { GATEWAYS, STARTING_GATEWAYS } from '@/lib/gateways'
import { cellKey, cellToScreen, isOnGrid } from '@/lib/plot'

/**
 * The default cells are a hand-maintained table, and nothing at the DB level
 * stops two gateways sharing one — `team_gateway_placements` is unique on
 * (team, key), not on the cell. Two gateways with the same default would just
 * stack invisibly on a new lab's plot.
 */
describe('gateway default layout', () => {
  it('gives every gateway its own on-grid cell', () => {
    const cells = GATEWAYS.map((g) => cellKey(g.cell.gx, g.cell.gy))
    expect(new Set(cells).size).toBe(GATEWAYS.length)
    expect(GATEWAYS.every((g) => isOnGrid(g.cell.gx, g.cell.gy))).toBe(true)
  })

  it('stands the three starting gateways in one row — Discovery, Operations Hub, Science Fair', () => {
    const row = STARTING_GATEWAYS.map((g) => ({ key: g.key, ...cellToScreen(g.cell.gx, g.cell.gy) }))
      .sort((a, b) => a.dx - b.dx)
    expect(row.map((r) => r.key)).toEqual(['discovery', 'operations_hub', 'science_fair'])
    expect(new Set(row.map((r) => r.dy)).size).toBe(1)
  })
})
