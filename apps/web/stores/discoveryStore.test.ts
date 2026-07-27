import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Discovery store — the largest client-side logic surface (tree state,
 * optimistic writes, KP ticks). Network I/O is already isolated in
 * lib/discovery/treeApi.ts, so the REAL store runs here against a mocked API:
 * these tests exercise the actual optimistic-apply → persist → rollback
 * sequencing, not an extraction of it.
 *
 * The stakes: `deleteSubtree` drives a server-side CASCADE delete of student
 * work, the dedupe rules mirror a DB unique constraint, and a failed persist
 * must reconcile back to server truth rather than leave phantom local nodes.
 */

const api = vi.hoisted(() => ({
  fetchTree: vi.fn(),
  persistCreate: vi.fn(),
  persistDelete: vi.fn(),
  persistInterest: vi.fn(),
  persistPromote: vi.fn(),
  persistReset: vi.fn(),
  persistStar: vi.fn(),
  resolveSource: vi.fn(),
}))
vi.mock('@/lib/discovery/treeApi', () => api)

import { useDiscoveryStore, type DiscoveryNode } from './discoveryStore'

function node(id: string, overrides: Partial<DiscoveryNode> = {}): DiscoveryNode {
  return {
    id,
    title: `Node ${id}`,
    source: 'wikipedia',
    parentId: null,
    depth: 0,
    starred: false,
    explored: false,
    addedAt: 1,
    ...overrides,
  }
}

/** a → b → c, plus unrelated root r. */
function seedTree(current: string | null = 'c') {
  useDiscoveryStore.setState({
    nodes: [
      node('a'),
      node('b', { parentId: 'a', depth: 1 }),
      node('c', { parentId: 'b', depth: 2 }),
      node('r', { title: 'Other root' }),
    ],
    currentNodeId: current,
    pendingLinks: [],
    hydrated: true,
    loadError: false,
    kpAward: { amount: 0, nonce: 0 },
    writeError: null,
    newTreePending: false,
  })
}

/** Let queued microtasks (the persist .then chains) run. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchTree.mockResolvedValue([])
  api.persistCreate.mockResolvedValue({ ok: true, kp: 0 })
  api.persistDelete.mockResolvedValue(true)
  api.persistStar.mockResolvedValue(true)
  api.persistInterest.mockResolvedValue(true)
  api.persistReset.mockResolvedValue(true)
  seedTree()
})

describe('hydrate (BLK-7: failure ≠ empty tree)', () => {
  it('a fetch failure sets loadError, NEVER an empty "first-run" tree', async () => {
    api.fetchTree.mockRejectedValue(new Error('network'))
    await useDiscoveryStore.getState().hydrate()
    const s = useDiscoveryStore.getState()
    expect(s.hydrated).toBe(true)
    expect(s.loadError).toBe(true)
    expect(s.nodes).toHaveLength(4) // prior nodes untouched — no false wipe
  })

  it('a retry after failure clears loadError and applies the fetched tree', async () => {
    useDiscoveryStore.setState({ loadError: true })
    api.fetchTree.mockResolvedValue([node('x')])
    await useDiscoveryStore.getState().hydrate()
    const s = useDiscoveryStore.getState()
    expect(s.loadError).toBe(false)
    expect(s.nodes.map((n) => n.id)).toEqual(['x'])
  })

  it('keeps the current selection when it survives the refetch, else picks the last node', async () => {
    api.fetchTree.mockResolvedValue([node('a'), node('z')])
    useDiscoveryStore.setState({ currentNodeId: 'a' })
    await useDiscoveryStore.getState().hydrate()
    expect(useDiscoveryStore.getState().currentNodeId).toBe('a')

    useDiscoveryStore.setState({ currentNodeId: 'gone' })
    await useDiscoveryStore.getState().hydrate()
    expect(useDiscoveryStore.getState().currentNodeId).toBe('z')
  })
})

describe('deleteSubtree', () => {
  it('removes the node and EVERY descendant, and persists only the subtree root id', async () => {
    useDiscoveryStore.getState().deleteSubtree('a')
    await flush()
    const s = useDiscoveryStore.getState()
    expect(s.nodes.map((n) => n.id)).toEqual(['r']) // a, b, c all gone
    expect(api.persistDelete).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('reselects the deleted subtree root’s parent when the selection died with the subtree', async () => {
    useDiscoveryStore.setState({ currentNodeId: 'c' })
    useDiscoveryStore.getState().deleteSubtree('b') // kills b and c; parent a survives
    await flush()
    expect(useDiscoveryStore.getState().currentNodeId).toBe('a')
  })

  it('falls back to the first remaining node when the parent died too, then to null', async () => {
    useDiscoveryStore.getState().deleteSubtree('a')
    await flush()
    expect(useDiscoveryStore.getState().currentNodeId).toBe('r')

    useDiscoveryStore.getState().deleteSubtree('r')
    await flush()
    expect(useDiscoveryStore.getState().currentNodeId).toBeNull()
  })

  it('an unrelated selection and pending links survive the delete', async () => {
    useDiscoveryStore.setState({ currentNodeId: 'r', pendingLinks: ['Kept'] })
    useDiscoveryStore.getState().deleteSubtree('b')
    await flush()
    const s = useDiscoveryStore.getState()
    expect(s.currentNodeId).toBe('r')
    expect(s.pendingLinks).toEqual(['Kept'])
  })

  it('a FAILED persist re-hydrates so phantom-deleted nodes come back', async () => {
    api.persistDelete.mockResolvedValue(false)
    api.fetchTree.mockResolvedValue([node('a'), node('b', { parentId: 'a', depth: 1 })])
    useDiscoveryStore.getState().deleteSubtree('b')
    await flush()
    // Server truth restored: b is back, the optimistic removal did not stick.
    expect(useDiscoveryStore.getState().nodes.map((n) => n.id)).toEqual(['a', 'b'])
  })
})

describe('newTreePending semantics (#11)', () => {
  it('startExploration consumes the flag and forces a NEW root even for a duplicate title', async () => {
    useDiscoveryStore.setState({ newTreePending: true })
    useDiscoveryStore.getState().startExploration('Other root') // same title as r
    await flush()
    const s = useDiscoveryStore.getState()
    const roots = s.nodes.filter((n) => n.title === 'Other root' && n.parentId === null)
    expect(roots).toHaveLength(2) // dedupe deliberately skipped
    expect(s.newTreePending).toBe(false)
  })

  it('without the flag, a same-title root NAVIGATES instead of creating', async () => {
    useDiscoveryStore.getState().startExploration('Other root')
    await flush()
    const s = useDiscoveryStore.getState()
    expect(s.nodes).toHaveLength(4)
    expect(s.currentNodeId).toBe('r')
    expect(api.persistCreate).not.toHaveBeenCalled()
  })

  it('addSourceNode with the flag creates a fresh ROOT despite a current selection', async () => {
    useDiscoveryStore.setState({ newTreePending: true, currentNodeId: 'c' })
    const id = useDiscoveryStore.getState().addSourceNode({
      externalId: 'arxiv:1', platform: 'arxiv', title: 'P', url: 'https://x', host: 'arxiv.org',
      tier: 'preprint', authors: [], abstract: null, publishedAt: null,
    } as never)
    await flush()
    const created = useDiscoveryStore.getState().nodes.find((n) => n.id === id)
    expect(created?.parentId).toBeNull()
    expect(created?.depth).toBe(0)
    expect(useDiscoveryStore.getState().newTreePending).toBe(false)
  })

  it('branchAndContinue does NOT consume the flag (branching is not opening)', async () => {
    useDiscoveryStore.setState({ newTreePending: true, currentNodeId: 'c', pendingLinks: ['L1'] })
    useDiscoveryStore.getState().branchAndContinue()
    await flush()
    const s = useDiscoveryStore.getState()
    expect(s.newTreePending).toBe(true) // still pending for the next source-open
    const child = s.nodes.find((n) => n.title === 'L1')
    expect(child?.parentId).toBe('c') // attached under current, not a new root
  })

  it('navigateToNode does not consume the flag', () => {
    useDiscoveryStore.setState({ newTreePending: true })
    useDiscoveryStore.getState().navigateToNode('a')
    expect(useDiscoveryStore.getState().newTreePending).toBe(true)
  })
})

describe('dedupe mirrors of DB uniques', () => {
  it('addSourceNode dedupes by externalId TEAM-WIDE and navigates to the existing node', async () => {
    useDiscoveryStore.setState({
      nodes: [...useDiscoveryStore.getState().nodes, node('s1', { source: 'source', externalId: 'arxiv:1' })],
    })
    const id = useDiscoveryStore.getState().addSourceNode({
      externalId: 'arxiv:1', platform: 'arxiv', title: 'Dup', url: 'https://x', host: 'arxiv.org',
      tier: 'preprint', authors: [], abstract: null, publishedAt: null,
    } as never)
    expect(id).toBe('s1')
    expect(useDiscoveryStore.getState().currentNodeId).toBe('s1')
    expect(api.persistCreate).not.toHaveBeenCalled()
  })

  it('addYouTubeVideo dedupe is scoped to the SAME parent (the same video can branch elsewhere)', async () => {
    useDiscoveryStore.setState({
      nodes: [...useDiscoveryStore.getState().nodes, node('v1', { source: 'youtube', videoId: 'vid', parentId: 'a' })],
      currentNodeId: 'a',
    })
    useDiscoveryStore.getState().addYouTubeVideo('vid', 'Video')
    expect(useDiscoveryStore.getState().currentNodeId).toBe('v1') // navigated, not duplicated

    useDiscoveryStore.setState({ currentNodeId: 'r' })
    useDiscoveryStore.getState().addYouTubeVideo('vid', 'Video')
    await flush()
    const copies = useDiscoveryStore.getState().nodes.filter((n) => n.videoId === 'vid')
    expect(copies).toHaveLength(2) // same video under a different parent is a new node
  })
})

describe('optimistic rollback + KP awards', () => {
  it('a failed star persist re-hydrates to server truth', async () => {
    api.persistStar.mockResolvedValue(false)
    api.fetchTree.mockResolvedValue([node('a')]) // server: star never landed
    useDiscoveryStore.getState().toggleStar('a')
    expect(useDiscoveryStore.getState().nodes.find((n) => n.id === 'a')?.starred).toBe(true) // optimistic
    await flush()
    expect(useDiscoveryStore.getState().nodes.find((n) => n.id === 'a')?.starred).toBe(false) // reconciled
  })

  it('kpAward bumps the nonce ONLY when the server actually paid, including equal amounts', async () => {
    api.persistCreate.mockResolvedValue({ ok: true, kp: 5 })
    useDiscoveryStore.getState().startExploration('Fresh topic A')
    await flush()
    const first = useDiscoveryStore.getState().kpAward
    expect(first).toEqual({ amount: 5, nonce: 1 })

    useDiscoveryStore.getState().startExploration('Fresh topic B')
    await flush()
    expect(useDiscoveryStore.getState().kpAward).toEqual({ amount: 5, nonce: 2 }) // same amount, new tick

    api.persistCreate.mockResolvedValue({ ok: true, kp: 0 })
    useDiscoveryStore.getState().startExploration('Fresh topic C')
    await flush()
    expect(useDiscoveryStore.getState().kpAward.nonce).toBe(2) // zero-KP create: no tick
  })
})

describe('togglePendingLink cap', () => {
  it('caps pending links at 2 and toggles off on re-click', () => {
    const s = useDiscoveryStore.getState()
    s.togglePendingLink('L1')
    s.togglePendingLink('L2')
    s.togglePendingLink('L3') // over the cap — ignored
    expect(useDiscoveryStore.getState().pendingLinks).toEqual(['L1', 'L2'])
    useDiscoveryStore.getState().togglePendingLink('L1')
    expect(useDiscoveryStore.getState().pendingLinks).toEqual(['L2'])
  })
})

describe('branchSources', () => {
  it('skips already-present externalIds, resolves the rest, attaches under current', async () => {
    useDiscoveryStore.setState({
      nodes: [...useDiscoveryStore.getState().nodes, node('s1', { source: 'source', externalId: 'arxiv:have' })],
      currentNodeId: 'c',
    })
    api.resolveSource.mockResolvedValue({
      externalId: 'arxiv:new', platform: 'arxiv', title: 'New', url: 'https://x',
      host: 'arxiv.org', tier: 'preprint', authors: [], abstract: null, publishedAt: null,
    })

    await useDiscoveryStore.getState().branchSources([
      { platform: 'arxiv', externalId: 'arxiv:have', label: 'Have' } as never,
      { platform: 'arxiv', externalId: 'arxiv:new', label: 'New' } as never,
    ])

    expect(api.resolveSource).toHaveBeenCalledExactlyOnceWith('arxiv', 'arxiv:new')
    const created = useDiscoveryStore.getState().nodes.find((n) => n.externalId === 'arxiv:new')
    expect(created?.parentId).toBe('c')
    expect(created?.depth).toBe(3)
    expect(useDiscoveryStore.getState().currentNodeId).toBe(created?.id)
  })
})

/**
 * REFACTOR2 §0.7. Each of these was REPRODUCED against the pre-fix store before
 * it was changed — the numbers in the comments are measured, not estimated.
 */
describe('a write that never landed (§0.7)', () => {
  it('a failed create SAYS SO — it used to just erase the node', async () => {
    useDiscoveryStore.setState({ nodes: [], currentNodeId: null })
    api.persistCreate.mockResolvedValue({ ok: false, kp: 0 })
    api.fetchTree.mockResolvedValue([])

    useDiscoveryStore.getState().startExploration('Photosynthesis')
    await flush()

    const s = useDiscoveryStore.getState()
    expect(s.nodes).toEqual([]) // the rollback itself is correct and unchanged
    expect(s.loadError).toBe(false) // the READ was fine; this was a write
    expect(s.writeError?.message).toMatch(/Could not start that topic/)
  })

  it('gives back newTreePending — an intent is not spent on a create that failed', async () => {
    useDiscoveryStore.setState({ nodes: [], currentNodeId: null, newTreePending: true })
    api.persistCreate.mockResolvedValue({ ok: false, kp: 0 })
    api.fetchTree.mockResolvedValue([])

    useDiscoveryStore.getState().startExploration('Photosynthesis')
    await flush()

    expect(useDiscoveryStore.getState().newTreePending).toBe(true)
  })

  it('keeps newTreePending consumed when the create SUCCEEDS', async () => {
    useDiscoveryStore.setState({ nodes: [], currentNodeId: null, newTreePending: true })
    useDiscoveryStore.getState().startExploration('Photosynthesis')
    await flush()
    expect(useDiscoveryStore.getState().newTreePending).toBe(false)
    expect(useDiscoveryStore.getState().writeError).toBeNull()
  })

  it('a repeat failure re-fires the toast via a bumped nonce', async () => {
    api.persistStar.mockResolvedValue(false)
    useDiscoveryStore.getState().toggleStar('a')
    await flush()
    const first = useDiscoveryStore.getState().writeError!.nonce

    useDiscoveryStore.getState().toggleStar('a')
    await flush()
    expect(useDiscoveryStore.getState().writeError!.nonce).toBe(first + 1)
  })

  it('a successful write clears a standing writeError', async () => {
    api.persistStar.mockResolvedValue(false)
    useDiscoveryStore.getState().toggleStar('a')
    await flush()
    expect(useDiscoveryStore.getState().writeError).not.toBeNull()

    api.persistStar.mockResolvedValue(true)
    useDiscoveryStore.getState().toggleStar('a')
    await flush()
    expect(useDiscoveryStore.getState().writeError).toBeNull()
  })
})

describe('deleteSubtree on a corrupted graph (§0.7)', () => {
  it('TERMINATES on a self-parented row — the original never did', async () => {
    useDiscoveryStore.setState({
      nodes: [node('a'), node('loop', { parentId: 'loop' })],
      currentNodeId: 'a',
    })
    useDiscoveryStore.getState().deleteSubtree('loop')
    await flush()
    expect(useDiscoveryStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('TERMINATES on a two-node cycle, and removes both', async () => {
    useDiscoveryStore.setState({
      nodes: [node('a'), node('x', { parentId: 'y' }), node('y', { parentId: 'x' })],
      currentNodeId: 'a',
    })
    useDiscoveryStore.getState().deleteSubtree('x')
    await flush()
    expect(useDiscoveryStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('is linear — a 20,000-node chain deletes well inside the old quadratic cost', async () => {
    const chain = Array.from({ length: 20_000 }, (_, i) =>
      node(`n${i}`, { parentId: i === 0 ? null : `n${i - 1}`, depth: i }),
    )
    useDiscoveryStore.setState({ nodes: chain, currentNodeId: 'n0' })

    const started = Date.now()
    useDiscoveryStore.getState().deleteSubtree('n0')
    await flush()

    // The original took 48ms for 2,000 nodes; quadratic puts 20,000 near 5s.
    expect(Date.now() - started).toBeLessThan(1000)
    expect(useDiscoveryStore.getState().nodes).toEqual([])
  })
})
