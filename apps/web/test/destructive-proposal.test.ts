import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Server-owned destructive confirmations (REFACTOR2 P1-R1).
 *
 * A boolean the client sends is not a capability. These pin the two properties
 * that make the confirmation the server's: the digest binds the EXACT payload
 * that was proposed, and consumption is a single-use compare-and-set scoped to
 * the actor, team, and command.
 */

const mocks = vi.hoisted(() => ({
  proposalCreate: vi.fn(),
  proposalUpdateMany: vi.fn(),
  requireTeamContext: vi.fn(),
  nodeFindMany: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
  nodeDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/activity/log', () => ({ logActivity: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/db', () => ({
  db: {
    destructiveProposal: { create: mocks.proposalCreate, updateMany: mocks.proposalUpdateMany },
    discoveryNode: { findMany: mocks.nodeFindMany, deleteMany: mocks.nodeDeleteMany },
  },
}))

import {
  consumeDestructive,
  proposalDigest,
  proposeDestructive,
  PROPOSAL_TTL_MS,
} from '@/lib/api/destructive-proposal'
import { DELETE } from '@/app/api/discovery/tree/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.proposalCreate.mockResolvedValue({ id: 'tok_1' })
  mocks.proposalUpdateMany.mockResolvedValue({ count: 1 })
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
    error: null,
  })
})

describe('proposalDigest binds the exact payload', () => {
  const base = { command: 'topic_paper_removal' as const, targetIds: ['a', 'b'], context: ['old', 'new'] }

  it('is stable for the same payload', () => {
    expect(proposalDigest(base)).toBe(proposalDigest({ ...base }))
  })

  it('ignores id ORDER — the same set is the same proposal', () => {
    expect(proposalDigest({ ...base, targetIds: ['b', 'a'] })).toBe(proposalDigest(base))
  })

  // An expanded delete list riding a genuine token is the attack.
  it('changes when an id is added, removed, or swapped', () => {
    for (const targetIds of [['a'], ['a', 'b', 'c'], ['a', 'z']]) {
      expect(proposalDigest({ ...base, targetIds })).not.toBe(proposalDigest(base))
    }
  })

  it('changes when the bound context changes', () => {
    expect(proposalDigest({ ...base, context: ['old', 'different'] })).not.toBe(proposalDigest(base))
  })

  it('changes with the command, so a token cannot cross commands', () => {
    expect(proposalDigest({ ...base, command: 'discovery_tree_reset' })).not.toBe(
      proposalDigest(base),
    )
  })

  // Framing, not concatenation: no id may impersonate a delimiter.
  it('does not collide when ids and context could concatenate alike', () => {
    expect(proposalDigest({ command: 'topic_paper_removal', targetIds: ['a', 'bc'], context: [] })).not.toBe(
      proposalDigest({ command: 'topic_paper_removal', targetIds: ['ab', 'c'], context: [] }),
    )
  })
})

describe('proposeDestructive', () => {
  it('stores actor, team, command, digest, and a short expiry', async () => {
    const before = Date.now()
    const token = await proposeDestructive({
      teamId: 'team_1',
      actorUserId: 'user_1',
      command: 'topic_paper_removal',
      targetIds: ['p1'],
      context: ['old', 'new'],
    })

    expect(token).toBe('tok_1')
    const data = mocks.proposalCreate.mock.calls[0]![0].data
    expect(data).toMatchObject({
      teamId: 'team_1',
      actorUserId: 'user_1',
      command: 'topic_paper_removal',
      payloadDigest: proposalDigest({
        command: 'topic_paper_removal',
        targetIds: ['p1'],
        context: ['old', 'new'],
      }),
    })
    const ttl = (data.expiresAt as Date).getTime() - before
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(PROPOSAL_TTL_MS + 1_000)
  })
})

describe('consumeDestructive is a single-use, scoped compare-and-set', () => {
  const input = {
    token: 'tok_1',
    teamId: 'team_1',
    actorUserId: 'user_1',
    command: 'topic_paper_removal' as const,
    targetIds: ['p1'],
    context: ['old', 'new'],
  }

  it('consumes only an unconsumed, unexpired proposal for this actor/team/command/payload', async () => {
    expect(await consumeDestructive(input)).toEqual({ ok: true })

    expect(mocks.proposalUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'tok_1',
        teamId: 'team_1',
        actorUserId: 'user_1',
        command: 'topic_paper_removal',
        payloadDigest: proposalDigest(input),
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { consumedAt: expect.any(Date) },
    })
  })

  // Guessed, expired, replayed, foreign, payload-mismatched — one answer, so the
  // endpoint is not an oracle for which proposals exist.
  it('reports every failure identically', async () => {
    mocks.proposalUpdateMany.mockResolvedValue({ count: 0 })

    expect(await consumeDestructive(input)).toEqual({ ok: false, reason: 'invalid' })
    expect(await consumeDestructive({ ...input, token: 'guessed' })).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(await consumeDestructive({ ...input, targetIds: ['p1', 'p2'] })).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})

describe('DELETE /api/discovery/tree is two-phase (P1-R1)', () => {
  function delReq(token?: string): NextRequest {
    const q = token ? `?token=${token}` : ''
    return new NextRequest(`http://app.example.com/api/discovery/tree${q}`, { method: 'DELETE' })
  }

  it('destroys nothing on a bare request and returns a proposal instead', async () => {
    mocks.nodeFindMany.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }])

    const res = await DELETE(delReq())

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      requiresConfirmation: true,
      proposalToken: 'tok_1',
      nodeCount: 2,
    })
    expect(mocks.nodeDeleteMany).not.toHaveBeenCalled()
  })

  it('wipes only after the proposal is consumed', async () => {
    mocks.nodeFindMany.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }])
    mocks.nodeDeleteMany.mockResolvedValue({ count: 2 })

    const res = await DELETE(delReq('tok_1'))

    expect(res.status).toBe(200)
    expect(mocks.nodeDeleteMany).toHaveBeenCalledWith({
      where: { teamId: 'team_1', id: { in: ['n1', 'n2'] } },
    })
  })

  it('refuses an invalid token without deleting', async () => {
    mocks.nodeFindMany.mockResolvedValue([{ id: 'n1' }])
    mocks.proposalUpdateMany.mockResolvedValue({ count: 0 })

    const res = await DELETE(delReq('replayed'))

    expect(res.status).toBe(409)
    expect(mocks.nodeDeleteMany).not.toHaveBeenCalled()
  })

  // A token minted for a 3-node tree must not wipe a 300-node one later.
  it('binds the proposal to the node set that existed when it was issued', async () => {
    mocks.nodeFindMany.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }])

    await DELETE(delReq('tok_1'))

    expect(mocks.proposalUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          payloadDigest: proposalDigest({
            command: 'discovery_tree_reset',
            targetIds: ['n1', 'n2'],
          }),
        }),
      }),
    )
  })

  it('skips the confirmation dance for an empty tree', async () => {
    mocks.nodeFindMany.mockResolvedValue([])

    const res = await DELETE(delReq())

    expect(res.status).toBe(200)
    expect(mocks.proposalCreate).not.toHaveBeenCalled()
    expect(mocks.nodeDeleteMany).not.toHaveBeenCalled()
  })
})
