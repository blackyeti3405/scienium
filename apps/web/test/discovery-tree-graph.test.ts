import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Discovery tree graph invariants (REFACTOR2 P1-R10).
 *
 * The UI emits a tree, but `POST /api/discovery/tree` accepts client-generated
 * node ids and arbitrary `parentId`s, and `DiscoveryNode`'s self-relation
 * references only `id` — not `(teamId, id)` — so PostgreSQL permitted a team-A
 * node pointing at a team-B parent. A batch could also close a cycle, which
 * made the team's own Discovery GET walk parent pointers forever.
 *
 * These pin the write-time rejection. The victim team's node id is a REAL id
 * present in the database and simply owned by someone else — the actual attack,
 * not a fabricated id that any lookup would miss.
 */

const mocks = vi.hoisted(() => ({
  nodeFindMany: vi.fn(),
  nodeCreateMany: vi.fn(() => Promise.resolve({ count: 0 })),
  nodeFindFirst: vi.fn(() => Promise.resolve(null)),
  nodeCreate: vi.fn(),
  externalSourceCreate: vi.fn(),
  transaction: vi.fn(),
  requireTeamContext: vi.fn(),
  logActivityBestEffort: vi.fn(() => Promise.resolve()),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.logActivityBestEffort }))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/discovery/awardVisit', () => ({ awardDiscoveryVisit: vi.fn(async () => ({ kpAwarded: 0 })) }))
vi.mock('@/lib/db', () => ({
  db: {
    discoveryNode: {
      findMany: mocks.nodeFindMany,
      createMany: mocks.nodeCreateMany,
      findFirst: mocks.nodeFindFirst,
    },
    externalSource: {},
    $transaction: mocks.transaction,
  },
}))

import { assertValidTreeGraph, createTreeNodes, hydrateTree, TreeGraphError } from '@/lib/discovery/tree-service'

const TEAM = 'team_attacker'
const OURS = 'node_ours'
const VICTIM = 'node_belongs_to_team_b'

/** The team-scoped lookup only ever returns ids this team owns. */
function ownedByUs(ids: string[]) {
  mocks.nodeFindMany.mockImplementation(async ({ where }) => {
    const asked: string[] = where.id.in
    return asked.filter((id) => ids.includes(id)).map((id) => ({ id }))
  })
}

function node(id: string, parentId: string | null) {
  return { id, title: 't', parentId }
}

beforeEach(() => {
  vi.clearAllMocks()
  ownedByUs([OURS])
})

describe('assertValidTreeGraph', () => {
  it('accepts a root and a child of an existing same-team node', async () => {
    await expect(
      assertValidTreeGraph(TEAM, [node('n1', null), node('n2', OURS)]),
    ).resolves.toBeUndefined()
  })

  it('accepts a parent introduced in the same batch', async () => {
    await expect(
      assertValidTreeGraph(TEAM, [node('n1', null), node('n2', 'n1')]),
    ).resolves.toBeUndefined()
  })

  it('rejects a parent that belongs to another team', async () => {
    await expect(assertValidTreeGraph(TEAM, [node('n1', VICTIM)])).rejects.toBeInstanceOf(
      TreeGraphError,
    )
  })

  it('scopes the ownership lookup to the caller team', async () => {
    await assertValidTreeGraph(TEAM, [node('n1', OURS)])
    expect(mocks.nodeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: TEAM }) }),
    )
  })

  it('rejects a self-edge', async () => {
    await expect(assertValidTreeGraph(TEAM, [node('n1', 'n1')])).rejects.toThrow(/own parent/)
  })

  it('rejects a two-node cycle', async () => {
    await expect(
      assertValidTreeGraph(TEAM, [node('n1', 'n2'), node('n2', 'n1')]),
    ).rejects.toThrow(/loop back/)
  })

  it('rejects a longer cycle', async () => {
    await expect(
      assertValidTreeGraph(TEAM, [node('a', 'c'), node('b', 'a'), node('c', 'b')]),
    ).rejects.toThrow(/loop back/)
  })

  it('rejects duplicate ids in one batch', async () => {
    await expect(
      assertValidTreeGraph(TEAM, [node('n1', null), node('n1', null)]),
    ).rejects.toThrow(/Duplicate node ids/)
  })

  it('rejects an oversized batch before touching the database', async () => {
    const huge = Array.from({ length: 201 }, (_, i) => node(`n${i}`, null))
    await expect(assertValidTreeGraph(TEAM, huge)).rejects.toThrow(/at most 200/)
    expect(mocks.nodeFindMany).not.toHaveBeenCalled()
  })

  it('rejects a chain deeper than one batch may add', async () => {
    const chain = Array.from({ length: 60 }, (_, i) => node(`n${i}`, i === 0 ? null : `n${i - 1}`))
    await expect(assertValidTreeGraph(TEAM, chain)).rejects.toThrow(/too deep/)
  })
})


describe('createTreeNodes — validation runs before any write', () => {
  it('writes nothing when the batch names a foreign parent', async () => {
    ownedByUs([])

    await expect(
      createTreeNodes({ teamId: TEAM, userId: 'u1', nodes: [node('n1', VICTIM)] }),
    ).rejects.toBeInstanceOf(TreeGraphError)
    expect(mocks.nodeCreateMany).not.toHaveBeenCalled()
  })

  it('writes nothing when the batch contains a cycle', async () => {
    ownedByUs([])

    await expect(
      createTreeNodes({ teamId: TEAM, userId: 'u1', nodes: [node('a', 'b'), node('b', 'a')] }),
    ).rejects.toBeInstanceOf(TreeGraphError)
    expect(mocks.nodeCreateMany).not.toHaveBeenCalled()
  })

  it('persists a valid batch', async () => {
    ownedByUs([OURS])
    mocks.nodeFindMany.mockImplementation(async ({ where }) => {
      // ownership probe first, then the KP first-visit lookup
      const asked: string[] = where.id?.in ?? []
      return asked.filter((id) => id === OURS).map((id) => ({ id }))
    })

    await createTreeNodes({ teamId: TEAM, userId: 'u1', nodes: [node('n1', OURS)] })

    expect(mocks.nodeCreateMany).toHaveBeenCalled()
  })
})

describe('hydrateTree — depth walk survives corrupt rows', () => {
  // Containment, not the fix: rows written before assertValidTreeGraph existed
  // must not make the team's own GET walk parent pointers forever.
  it('terminates on a two-node cycle instead of hanging', async () => {
    mocks.nodeFindMany.mockResolvedValue([
      { id: 'a', parentId: 'b', sourceType: 'wikipedia', wikipediaTitle: 'A', visitedAt: new Date(), starred: false, interestLevel: null, externalId: null, paperId: null, youtubeTitle: null, youtubeVideoId: null, externalSource: null, articleSource: null },
      { id: 'b', parentId: 'a', sourceType: 'wikipedia', wikipediaTitle: 'B', visitedAt: new Date(), starred: false, interestLevel: null, externalId: null, paperId: null, youtubeTitle: null, youtubeVideoId: null, externalSource: null, articleSource: null },
    ])

    const nodes = await hydrateTree(TEAM)

    expect(nodes).toHaveLength(2)
    for (const n of nodes) expect(Number.isFinite(n.depth)).toBe(true)
  })

  it('terminates on a self-edge', async () => {
    mocks.nodeFindMany.mockResolvedValue([
      { id: 'a', parentId: 'a', sourceType: 'wikipedia', wikipediaTitle: 'A', visitedAt: new Date(), starred: false, interestLevel: null, externalId: null, paperId: null, youtubeTitle: null, youtubeVideoId: null, externalSource: null, articleSource: null },
    ])

    expect((await hydrateTree(TEAM))[0]!.depth).toBe(0)
  })

  it('still reports real depth for a healthy chain', async () => {
    const row = (id: string, parentId: string | null) => ({
      id, parentId, sourceType: 'wikipedia', wikipediaTitle: id, visitedAt: new Date(),
      starred: false, interestLevel: null, externalId: null, paperId: null,
      youtubeTitle: null, youtubeVideoId: null, externalSource: null, articleSource: null,
    })
    mocks.nodeFindMany.mockResolvedValue([row('a', null), row('b', 'a'), row('c', 'b')])

    const byId = Object.fromEntries((await hydrateTree(TEAM)).map((n) => [n.id, n.depth]))
    expect(byId).toEqual({ a: 0, b: 1, c: 2 })
  })
})
