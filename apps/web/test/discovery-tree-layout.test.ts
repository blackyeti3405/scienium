import { describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 §0.7 — `DiscoveryTree.tsx`: "Refactor algorithm/accessibility.
 * Recursive layout is cycle-unsafe and can be O(n²)."
 *
 * P1-R10 closed the WRITE path (`assertValidTreeGraph` refuses a cyclic or
 * foreign-parent batch) and explicitly left this open: "**Still open:** … the
 * cycle-unsafe SVG layout in `DiscoveryTree.tsx`". A guard on new writes does
 * not repair rows that predate it, and it is not the only way a row can arrive.
 *
 * The original was run against each of these shapes before the rewrite, and the
 * "cycle-unsafe" framing turned out to be wrong: a node has one `parentId`, so a
 * cycle is never reachable from a root and the recursion never entered one. What
 * it actually did:
 *   - **dropped nodes silently** — an orphan was not drawn, and a pure two-node
 *     cycle rendered as an EMPTY tree;
 *   - **overflowed the stack** on a 5,000-node chain (`RangeError`);
 *   - **ran quadratically**, recomputing every subtree width per level.
 *
 * They live here rather than in a browser spec because the algorithm has no
 * DOM — which is exactly why it was never covered while it sat in a `.tsx`.
 */

vi.mock('server-only', () => ({}))

import { computeLayout, nodeTreeIndices, NODE_W } from '@/lib/discovery/tree-layout'

type Node = Parameters<typeof computeLayout>[0][number]

const node = (id: string, parentId: string | null = null): Node =>
  ({ id, parentId, title: id, source: 'wikipedia' }) as unknown as Node

/** A parent with `n` children. */
const star = (n: number): Node[] => [
  node('root'),
  ...Array.from({ length: n }, (_, i) => node(`c${i}`, 'root')),
]

/** A single chain root → n0 → n1 → … */
const chain = (n: number): Node[] =>
  Array.from({ length: n }, (_, i) => node(`n${i}`, i === 0 ? null : `n${i - 1}`))

describe('a corrupted graph still renders', () => {
  it('lays out a two-node cycle instead of rendering an empty tree', () => {
    // a → b → a. Neither is a root, so the old layout had nothing to descend
    // from and drew NOTHING — the student's tree simply went blank.
    const laid = computeLayout([node('a', 'b'), node('b', 'a')])

    expect(laid).toHaveLength(2)
    expect(new Set(laid.map((n) => n.id))).toEqual(new Set(['a', 'b']))
  })

  it('lays out a self-parented node', () => {
    const laid = computeLayout([node('solo', 'solo')])
    expect(laid.map((n) => n.id)).toEqual(['solo'])
  })

  it('draws a cycle sitting alongside a real tree, exactly once each', () => {
    const laid = computeLayout([
      node('root'),
      node('kid', 'root'),
      node('x', 'y'),
      node('y', 'x'),
    ])

    expect(laid).toHaveLength(4)
    expect(new Set(laid.map((n) => n.id))).toEqual(new Set(['root', 'kid', 'x', 'y']))
    // Exactly once — a node drawn twice would overlap itself and duplicate its
    // controls.
    expect(new Set(laid.map((n) => n.id)).size).toBe(laid.length)
  })
})

describe('nothing disappears', () => {
  it('draws a node whose parent is not in the set', () => {
    // Not a root (it has a parentId) and not reachable from one, so the old
    // layout never placed it — verified against the original, which drew only
    // `root,kid`. The row existed; the tree said it did not.
    const laid = computeLayout([node('root'), node('kid', 'root'), node('orphan', 'gone')])

    expect(laid.map((n) => n.id).sort()).toEqual(['kid', 'orphan', 'root'])
  })

  it('draws every node for a forest of several roots', () => {
    const laid = computeLayout([
      node('r1'),
      node('r1a', 'r1'),
      node('r2'),
      node('r2a', 'r2'),
      node('r2b', 'r2'),
    ])
    expect(laid).toHaveLength(5)
  })

  it('never returns a node twice, whatever the shape', () => {
    const nodes = [...star(20), node('loopA', 'loopB'), node('loopB', 'loopA')]
    const laid = computeLayout(nodes)
    expect(new Set(laid.map((n) => n.id)).size).toBe(laid.length)
    expect(laid).toHaveLength(nodes.length)
  })
})

describe('it scales', () => {
  it('handles a chain deep enough to have overflowed the recursive version', () => {
    // A student clicking through sources builds exactly this shape. 5,000 frames
    // of mutual recursion is a RangeError; the iterative version is flat.
    const laid = computeLayout(chain(5_000))
    expect(laid).toHaveLength(5_000)
    // Depth still increases monotonically down the chain.
    expect(laid.find((n) => n.id === 'n4999')!.y).toBeGreaterThan(
      laid.find((n) => n.id === 'n0')!.y,
    )
  })

  it('is linear, not quadratic, on a deep chain', () => {
    // The old `subtreeW` walked the whole subtree and was called once per node
    // AND once per child, so doubling the depth quadrupled the work. Timing is
    // noisy, so this asserts the SHAPE of the growth with a generous factor:
    // quadratic would be ~4x, and anything under 3x cannot be quadratic.
    const time = (n: number) => {
      const nodes = chain(n)
      const start = performance.now()
      computeLayout(nodes)
      return performance.now() - start + 0.01
    }
    time(1_000) // warm up, so JIT does not masquerade as complexity
    const small = time(2_000)
    const large = time(4_000)
    expect(large / small).toBeLessThan(3)
  })

  it('lays a wide star out left to right without overlap', () => {
    const laid = computeLayout(star(30))
    const kids = laid.filter((n) => n.id !== 'root').sort((a, b) => a.x - b.x)
    for (let i = 1; i < kids.length; i++) {
      expect(kids[i]!.x).toBeGreaterThanOrEqual(kids[i - 1]!.x + NODE_W)
    }
  })
})

describe('tree indices agree with the layout', () => {
  it('gives each root-derived tree its own index', () => {
    const idx = nodeTreeIndices([node('r1'), node('r1a', 'r1'), node('r2'), node('r2a', 'r2')])

    expect(idx.get('r1')).toBe(idx.get('r1a'))
    expect(idx.get('r2')).toBe(idx.get('r2a'))
    expect(idx.get('r1')).not.toBe(idx.get('r2'))
  })

  it('assigns an index to every node the layout draws — cycles and orphans included', () => {
    // Two independent root-walkers would eventually disagree, and the symptom
    // would be a node coloured as one tree and drawn in another. They share
    // `buildGraph` precisely so they cannot.
    const nodes = [node('root'), node('kid', 'root'), node('orphan', 'gone'), node('x', 'y'), node('y', 'x')]
    const idx = nodeTreeIndices(nodes)
    const laid = computeLayout(nodes)

    for (const n of laid) expect(idx.get(n.id), `${n.id} has no tree index`).toBeDefined()
    expect(idx.size).toBe(nodes.length)
  })

  it('terminates on a cycle', () => {
    const idx = nodeTreeIndices([node('a', 'b'), node('b', 'a')])
    expect(idx.size).toBe(2)
  })
})
