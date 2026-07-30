import type { DiscoveryNode } from '@/stores/discoveryStore'

/**
 * Discovery-tree layout — the pure algorithm, extracted from
 * `components/discovery/DiscoveryTree.tsx` (REFACTOR2 §0.7 disposition:
 * "Refactor algorithm/accessibility").
 *
 * Extracted because the two halves have different owners: this is a graph
 * algorithm with real failure modes and no DOM, the component is a view. Living
 * inside a `.tsx` file meant it could only ever be exercised through a browser
 * test — so the defects below shipped and stayed.
 *
 * ## What was wrong — measured, not assumed
 *
 * The audit called the recursive layout "cycle-unsafe" and P1-R10 carried that
 * forward as still-open debt. Running the original against a cycle showed
 * something different, and worth stating plainly: **a cycle can never be
 * reachable from a root**, because a node has exactly one `parentId`, so a node
 * inside a cycle points into the cycle and is therefore not a child of anything
 * outside it. The recursion never entered one. The three real defects were:
 *
 * **It silently dropped nodes.** A node whose `parentId` names a row not in
 * `nodes` — or names another node in a cycle — is not a root (it has a parent)
 * and is not reachable from one, so it was never laid out and simply vanished
 * from the student's tree. A pure two-node cycle rendered as an EMPTY tree. The
 * rows existed; the UI said otherwise. This is the failure that mattered, and it
 * is the one the "hang" framing was hiding.
 *
 * **It overflowed the stack on a deep chain.** `subtreeW` and `layout` are
 * mutually recursive per level; a 5,000-node chain — which a student builds by
 * clicking through sources — is a `RangeError`, verified against the original.
 *
 * **It was quadratic.** `subtreeW(id)` walked the whole subtree, and `layout`
 * called it once for the node and again for every child, recomputing the same
 * widths at every level. Memoizing collapses it to one pass.
 *
 * The cycle handling below is therefore containment, not a fix for a live hang:
 * a corrupted graph renders as a broken tree rather than disappearing.
 */

// ── Layout constants ────────────────────────────────────────────────────────
export const NODE_W = 170
export const NODE_H = 40
export const H_GAP = 14
export const V_GAP = 54
export const PAD = 16

export interface LayoutNode extends DiscoveryNode {
  x: number
  y: number
}

interface Graph {
  byId: Map<string, DiscoveryNode>
  childrenOf: Map<string, string[]>
  /** Nodes to lay out as roots: true roots PLUS orphans and cycle entry points. */
  roots: string[]
}

/**
 * Build the adjacency map and decide what counts as a root.
 *
 * An edge is only followed when the parent is actually present, so a dangling
 * `parentId` demotes its node to a root rather than orphaning it out of the
 * render. That is the honest failure mode: an unexpected graph shows up
 * displaced, never invisible.
 */
function buildGraph(nodes: DiscoveryNode[]): Graph {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const childrenOf = new Map<string, string[]>()
  const roots: string[] = []

  for (const n of nodes) {
    const parentPresent = !!n.parentId && byId.has(n.parentId) && n.parentId !== n.id
    if (parentPresent) {
      const siblings = childrenOf.get(n.parentId!)
      if (siblings) siblings.push(n.id)
      else childrenOf.set(n.parentId!, [n.id])
    } else {
      roots.push(n.id)
    }
  }

  // Anything a cycle keeps out of the forest still has to be drawn. Walking up
  // from each unreached node and taking the first id seen twice gives a stable
  // entry point per cycle, so a corrupted graph renders as a broken tree instead
  // of hanging or disappearing.
  const reachable = new Set<string>()
  const stack = [...roots]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const child of childrenOf.get(id) ?? []) stack.push(child)
  }
  for (const n of nodes) {
    if (reachable.has(n.id)) continue
    let cur: string = n.id
    const seen = new Set<string>()
    while (!seen.has(cur)) {
      seen.add(cur)
      const parent = byId.get(cur)?.parentId
      if (!parent || !byId.has(parent) || reachable.has(parent)) break
      cur = parent
    }
    if (reachable.has(cur)) continue
    roots.push(cur)
    const s = [cur]
    while (s.length > 0) {
      const id = s.pop()!
      if (reachable.has(id)) continue
      reachable.add(id)
      for (const child of childrenOf.get(id) ?? []) s.push(child)
    }
  }

  return { byId, childrenOf, roots }
}

/**
 * Lay out the forest. Multi-root by design — the Discovery tree is a forest, and
 * every view (the panel, the full-window tab, the topic list) shares this one
 * layout rather than re-deriving it.
 *
 * Every node appears exactly once, cycles included: `placed` is the guard, so a
 * back-edge is simply not followed a second time.
 */
export function computeLayout(nodes: DiscoveryNode[]): LayoutNode[] {
  if (nodes.length === 0) return []
  const { byId, childrenOf, roots } = buildGraph(nodes)

  // Memoized subtree widths, computed bottom-up with an explicit stack: the
  // recursive version was both quadratic and a stack-overflow risk on a deep
  // chain, which a student can build by clicking through 200 sources.
  const widths = new Map<string, number>()
  const measure = (rootId: string) => {
    const stack: { id: string; expanded: boolean }[] = [{ id: rootId, expanded: false }]
    const onPath = new Set<string>()
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!
      if (widths.has(frame.id)) {
        stack.pop()
        onPath.delete(frame.id)
        continue
      }
      if (!frame.expanded) {
        frame.expanded = true
        onPath.add(frame.id)
        // A child already on the current path is a back-edge; skipping it is
        // what makes a cycle terminate instead of recursing forever.
        for (const child of childrenOf.get(frame.id) ?? []) {
          if (!onPath.has(child) && !widths.has(child)) stack.push({ id: child, expanded: false })
        }
        continue
      }
      const kids = (childrenOf.get(frame.id) ?? []).filter((c) => widths.has(c))
      const childTotal = kids.reduce((sum, c) => sum + widths.get(c)! + H_GAP, -H_GAP)
      widths.set(frame.id, Math.max(NODE_W, kids.length === 0 ? NODE_W : childTotal))
      onPath.delete(frame.id)
      stack.pop()
    }
  }

  const result: LayoutNode[] = []
  const placed = new Set<string>()

  const place = (rootId: string, rootLeft: number) => {
    measure(rootId)
    const stack: { id: string; left: number; top: number }[] = [
      { id: rootId, left: rootLeft, top: PAD },
    ]
    while (stack.length > 0) {
      const { id, left, top } = stack.pop()!
      if (placed.has(id)) continue
      placed.add(id)
      const node = byId.get(id)
      if (!node) continue
      const sw = widths.get(id) ?? NODE_W
      result.push({ ...node, x: left + sw / 2 - NODE_W / 2, y: top })

      let childLeft = left
      for (const child of childrenOf.get(id) ?? []) {
        if (placed.has(child)) continue
        stack.push({ id: child, left: childLeft, top: top + NODE_H + V_GAP })
        childLeft += (widths.get(child) ?? NODE_W) + H_GAP
      }
    }
  }

  let rootLeft = PAD
  for (const rid of roots) {
    if (placed.has(rid)) continue
    place(rid, rootLeft)
    measure(rid)
    rootLeft += (widths.get(rid) ?? NODE_W) + H_GAP * 2
  }

  return result
}

/**
 * Which root-derived tree each node belongs to, as a stable 0-based index in
 * root order. Backs `DiscoveryTopicList`'s color-major/tree-minor grouping.
 *
 * Shares `buildGraph`, so its answer for an orphan or a cycle matches what the
 * layout actually draws — two independent root-walkers would eventually
 * disagree, and the symptom would be a node coloured as one tree and drawn in
 * another.
 */
export function nodeTreeIndices(nodes: DiscoveryNode[]): Map<string, number> {
  if (nodes.length === 0) return new Map()
  const { childrenOf, roots } = buildGraph(nodes)

  const result = new Map<string, number>()
  let nextIndex = 0
  for (const rid of roots) {
    if (result.has(rid)) continue
    const index = nextIndex++
    const stack = [rid]
    while (stack.length > 0) {
      const id = stack.pop()!
      if (result.has(id)) continue
      result.set(id, index)
      for (const child of childrenOf.get(id) ?? []) stack.push(child)
    }
  }
  // Belt and braces: anything the walk somehow missed still gets an index, so a
  // caller keying off this map can never read `undefined`.
  for (const n of nodes) if (!result.has(n.id)) result.set(n.id, nextIndex++)
  return result
}
