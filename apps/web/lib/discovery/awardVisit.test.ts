import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * First-visit KP orchestration. The economy MATH (visitKp, clampToDailyCap)
 * is tested in lib/discovery/economy.test.ts — these tests pin the
 * ORCHESTRATION the module docstring promises:
 *   - the visit-ledger unique constraint is the SOLE idempotency gate
 *     (P2002 → pay nothing, no cap or currency writes);
 *   - a capped-out day writes NOTHING beyond the zero-KP ledger row;
 *   - the cap rollup is bumped in the same transaction pattern as the credit,
 *     so a crash can't credit KP without recording it against the cap.
 */

const economy = vi.hoisted(() => ({
  visitKp: vi.fn(),
  clampToDailyCap: vi.fn(),
}))
vi.mock('@/lib/discovery/economy', () => economy)

import { awardDiscoveryVisit } from './awardVisit'

function mockTx() {
  return {
    discoverySourceVisit: {
      create: vi.fn(() => Promise.resolve({})),
      update: vi.fn(() => Promise.resolve({})),
    },
    discoveryKpDay: {
      upsert: vi.fn(() => Promise.resolve({ kpTotal: 0 })),
      update: vi.fn(() => Promise.resolve({})),
    },
    teamCurrency: {
      upsert: vi.fn(() => Promise.resolve({})),
    },
  }
}
type Tx = ReturnType<typeof mockTx>

const INPUT = { teamId: 't1', userId: 'u1', nodeId: 'n1', tier: null }

function p2002(): Error & { code: string } {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
}

let tx: Tx

beforeEach(() => {
  vi.clearAllMocks()
  tx = mockTx()
  economy.visitKp.mockReturnValue(10)
  economy.clampToDailyCap.mockImplementation((want: number) => want)
})

describe('awardDiscoveryVisit', () => {
  it('happy path: ledger row, rollup bump, ledger backfill, currency credit', async () => {
    const res = await awardDiscoveryVisit(tx as never, INPUT)

    expect(res).toEqual({ kpAwarded: 10, alreadyVisited: false })
    expect(tx.discoverySourceVisit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teamId: 't1', nodeId: 'n1', kpAwarded: 0 }) }),
    )
    expect(tx.discoveryKpDay.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kpTotal: { increment: 10 } } }),
    )
    expect(tx.discoverySourceVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kpAwarded: 10 } }),
    )
    expect(tx.teamCurrency.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { teamId: 't1', kp: 10 },
        update: { kp: { increment: 10 } },
      }),
    )
  })

  it('P2002 on the ledger insert → already visited, ZERO further writes', async () => {
    tx.discoverySourceVisit.create.mockRejectedValue(p2002())

    const res = await awardDiscoveryVisit(tx as never, INPUT)

    expect(res).toEqual({ kpAwarded: 0, alreadyVisited: true })
    expect(tx.discoveryKpDay.upsert).not.toHaveBeenCalled()
    expect(tx.discoveryKpDay.update).not.toHaveBeenCalled()
    expect(tx.teamCurrency.upsert).not.toHaveBeenCalled()
  })

  it('a NON-unique DB error is rethrown, never swallowed into a silent zero', async () => {
    tx.discoverySourceVisit.create.mockRejectedValue(new Error('connection reset'))
    await expect(awardDiscoveryVisit(tx as never, INPUT)).rejects.toThrow('connection reset')
  })

  it('cap exhausted: the zero-KP ledger row stands, but no rollup/currency writes', async () => {
    tx.discoveryKpDay.upsert.mockResolvedValue({ kpTotal: 999 })
    economy.clampToDailyCap.mockReturnValue(0)

    const res = await awardDiscoveryVisit(tx as never, INPUT)

    expect(res).toEqual({ kpAwarded: 0, alreadyVisited: false })
    expect(tx.discoveryKpDay.update).not.toHaveBeenCalled()
    expect(tx.discoverySourceVisit.update).not.toHaveBeenCalled()
    expect(tx.teamCurrency.upsert).not.toHaveBeenCalled()
  })

  it('a partial clamp credits exactly the clamped amount, not the want', async () => {
    economy.visitKp.mockReturnValue(10)
    economy.clampToDailyCap.mockReturnValue(3) // only 3 KP of headroom left today
    tx.discoveryKpDay.upsert.mockResolvedValue({ kpTotal: 47 })

    const res = await awardDiscoveryVisit(tx as never, INPUT)

    expect(res.kpAwarded).toBe(3)
    expect(economy.clampToDailyCap).toHaveBeenCalledWith(10, 47)
    expect(tx.teamCurrency.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { kp: { increment: 3 } } }),
    )
  })

  it('the tier reaches visitKp (credibility-weighted award)', async () => {
    await awardDiscoveryVisit(tx as never, { ...INPUT, tier: 'peer_reviewed' })
    expect(economy.visitKp).toHaveBeenCalledWith('peer_reviewed')
  })
})
