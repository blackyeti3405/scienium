'use client'

import { create } from 'zustand'
import type { CredibilityTier } from '@prisma/client'
import type { ResolvedSource, SourceChip, SourcePlatform } from '@/lib/discovery/sources'

export type DiscoverySource = 'wikipedia' | 'youtube' | 'source'

export interface DiscoveryNode {
  id: string
  title: string
  source: DiscoverySource
  /** present only for youtube nodes */
  videoId?: string
  parentId: string | null
  depth: number
  starred: boolean
  /** visual indicator only — no longer blocks re-branching */
  explored: boolean
  addedAt: number
  // ── source-node metadata (present only when source === 'source') ──
  externalId?: string
  platform?: SourcePlatform | 'pmc'
  sourceUrl?: string
  sourceHost?: string
  credibilityTier?: CredibilityTier
  abstract?: string
  authors?: string[]
  publishedAt?: string
  reflection?: string
  /** #13: set once a source node is promoted into a real Paper (hides Promote). */
  paperId?: string | null
  /** #11: student-set interest tier. null/undefined = unmarked. */
  interestLevel?: 'high' | 'mid' | 'low' | null
}

interface DiscoveryStore {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  /** Titles the user has clicked to branch into — max 2, not yet committed */
  pendingLinks: string[]
  /** True once the tree has been loaded from the server at least once */
  hydrated: boolean
  /**
   * Server-reported first-visit KP from the most recent create/branch, plus a
   * monotonic nonce so the UI fires a "+N KP" tick-up exactly once per award
   * (even when two awards happen to be the same amount). 0 = nothing to show.
   * DB-authoritative: only ever set from the tree POST's `kpAwarded`.
   */
  kpAward: { amount: number; nonce: number }
  /**
   * #11: set by `startNewTree()`; consumed (cleared) by the FIRST of
   * `startExploration` / `addYouTubeVideo` / `addSourceNode` that fires next —
   * that create forces `parentId: null` (a new root/tree) regardless of the
   * current selection. `navigateToNode` does NOT consume it.
   */
  newTreePending: boolean

  hydrate: () => Promise<void>
  startExploration: (title: string) => void
  /** Add a YouTube video as a child of the current node (or a new root). */
  addYouTubeVideo: (videoId: string, title: string) => void
  /** Add a resolved source (arXiv/PubMed) as a child of the current node, or a new
   *  root when nothing is selected. Returns the created/existing node id. */
  addSourceNode: (resolved: ResolvedSource) => string
  /** Resolve up to 2 selected citation/metadata chips and branch them into child
   *  source nodes under the current node (the native citation surf). */
  branchSources: (chips: SourceChip[]) => Promise<void>
  navigateToNode: (nodeId: string) => void
  togglePendingLink: (title: string) => void
  branchAndContinue: () => void
  toggleStar: (nodeId: string) => void
  /** #11: set/clear a node's interest tier (persists via PATCH). */
  setInterest: (nodeId: string, level: 'high' | 'mid' | 'low' | null) => void
  /** #11: mark that the NEXT opened/added source should start a brand-new tree
   *  (a new root), regardless of the current selection. */
  startNewTree: () => void
  /** Update the local reflection cache for a source node (after a persisted PATCH). */
  setNodeReflection: (nodeId: string, reflection: string) => void
  /** Promote a starred source node into a real Paper (#13). Returns an error
   *  message on failure, or null on success (marks the node promoted locally). */
  promoteSource: (nodeId: string) => Promise<string | null>
  /** Delete a node and every descendant beneath it */
  deleteSubtree: (nodeId: string) => void
  reset: () => void
}

// ─── Server persistence helpers ──────────────────────────────────────────────
// The DB is the source of truth (team-scoped via the API). Mutations update
// local state optimistically and fire a persistence call; failures are logged
// but don't block the UI (the next hydrate reconciles).

type NewNode = {
  id: string
  title: string
  parentId: string | null
  source?: DiscoverySource
  videoId?: string
  // ── forwarded to the tree POST for `source` nodes ──
  platform?: SourcePlatform | 'pmc'
  externalId?: string
  sourceUrl?: string
  sourceHost?: string
  authors?: string[]
  abstract?: string
  publishedAt?: string
}

/** POST new nodes and distinguish a real zero-KP award from a failed write. */
async function persistCreate(nodes: NewNode[]): Promise<{ ok: boolean; kp: number }> {
  try {
    const res = await fetch('/api/discovery/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })
    if (!res.ok) return { ok: false, kp: 0 }
    const data = await res.json().catch(() => ({}))
    return { ok: true, kp: typeof data.kpAwarded === 'number' ? data.kpAwarded : 0 }
  } catch (err) {
    console.error('[discovery] create failed:', err)
    return { ok: false, kp: 0 }
  }
}

async function persistStar(id: string, starred: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    })
    return res.ok
  } catch (err) {
    console.error('[discovery] star failed:', err)
    return false
  }
}

// #11: persist a node's interest tier. Log-and-swallow on failure — the next
// hydrate() reconciles with the DB-authoritative value, same as `persistStar`.
async function persistInterest(
  id: string,
  level: 'high' | 'mid' | 'low' | null,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestLevel: level }),
    })
    return res.ok
  } catch (err) {
    console.error('[discovery] interest failed:', err)
    return false
  }
}

async function persistDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[discovery] delete failed:', err)
    return false
  }
}

async function persistReset(): Promise<boolean> {
  try {
    const res = await fetch('/api/discovery/tree', { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[discovery] reset failed:', err)
    return false
  }
}

// Reports a server KP award into the store so the UI can tick it up once.
// Only bumps the nonce when the server actually paid (amount > 0).
function reportKp(
  set: (fn: (s: DiscoveryStore) => Partial<DiscoveryStore>) => void,
  amount: number,
) {
  if (amount > 0) set((s) => ({ kpAward: { amount, nonce: s.kpAward.nonce + 1 } }))
}

export const useDiscoveryStore = create<DiscoveryStore>()((set, get) => ({
  nodes: [],
  currentNodeId: null,
  pendingLinks: [],
  hydrated: false,
  kpAward: { amount: 0, nonce: 0 },
  newTreePending: false,

  hydrate: async () => {
    try {
      const res = await fetch('/api/discovery/tree')
      if (!res.ok) throw new Error(`load failed (${res.status})`)
      const data = await res.json()
      // Spread preserves every field the GET serializer surfaces, including the
      // source-node metadata (platform/tier/url/abstract/…). Missing one here
      // would silently corrupt source nodes (epic §"Client coupling" warning).
      const nodes: DiscoveryNode[] = (Array.isArray(data.nodes) ? data.nodes : []).map(
        (n: DiscoveryNode) => ({ ...n, source: n.source ?? 'wikipedia' }),
      )
      set((state) => ({
        nodes,
        hydrated: true,
        // Keep the current selection if it still exists, else the most-recent node
        currentNodeId:
          state.currentNodeId && nodes.some((n) => n.id === state.currentNodeId)
            ? state.currentNodeId
            : nodes[nodes.length - 1]?.id ?? null,
      }))
    } catch (err) {
      console.error('[discovery] hydrate failed:', err)
      set({ hydrated: true })
    }
  },

  startExploration: (title) => {
    // #11: a pending "new tree" request forces a fresh root even if a same-
    // title root already exists — skip the dedupe so re-opening a topic makes
    // a genuinely new tree, then consume the flag.
    const { newTreePending } = get()
    if (!newTreePending) {
      const existing = get().nodes.find((n) => !n.parentId && n.title === title)
      if (existing) {
        set({ currentNodeId: existing.id, pendingLinks: [] })
        return
      }
    }
    const id = crypto.randomUUID()
    set((state) => ({
      nodes: [
        ...state.nodes,
        { id, title, source: 'wikipedia', parentId: null, depth: 0, starred: false, explored: false, addedAt: Date.now() },
      ],
      currentNodeId: id,
      pendingLinks: [],
      newTreePending: false,
    }))
    persistCreate([{ id, title, parentId: null, source: 'wikipedia' }]).then((result) => {
      if (result.ok) reportKp(set, result.kp)
      else void get().hydrate()
    })
  },

  // Add a pasted YouTube video. Attaches under the current node (a branch — and a
  // cross-source bridge if the current node is a Wikipedia article), or as a new
  // root if nothing is selected.
  addYouTubeVideo: (videoId, title) => {
    const { currentNodeId, nodes, newTreePending } = get()
    // #11: a pending "new tree" request ignores the current selection — the
    // video becomes a fresh root (parentId: null, depth: 0).
    const targetParentId = newTreePending ? null : currentNodeId ?? null
    // De-dupe: if this video already exists under the target parent, just go
    // to it. Scoped to root when starting a new tree, matching the plan.
    const existing = nodes.find((n) => n.videoId === videoId && n.parentId === targetParentId)
    if (existing) {
      set({ currentNodeId: existing.id, newTreePending: false })
      return
    }
    const parent = targetParentId ? nodes.find((n) => n.id === targetParentId) : null
    const id = crypto.randomUUID()
    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => (n.id === targetParentId ? { ...n, explored: true } : n)),
        {
          id,
          title,
          source: 'youtube',
          videoId,
          parentId: targetParentId,
          depth: parent ? parent.depth + 1 : 0,
          starred: false,
          explored: false,
          addedAt: Date.now(),
        },
      ],
      currentNodeId: id,
      pendingLinks: [],
      newTreePending: false,
    }))
    persistCreate([{ id, title, parentId: targetParentId, source: 'youtube', videoId }]).then(
      (result) => {
        if (result.ok) reportKp(set, result.kp)
        else void get().hydrate()
      },
    )
  },

  // Add a resolved arXiv/PubMed source. Attaches under the current node (a branch
  // — and a cross-source bridge if the current node is wiki/youtube), or as a new
  // root when nothing is selected. Server re-derives host+tier before persisting.
  addSourceNode: (resolved) => {
    const { currentNodeId, nodes, newTreePending } = get()
    // De-dupe by externalId (the DB @@unique is team-wide; mirror it locally).
    // Correct even when starting a new tree — a work already in the forest is
    // navigated to (existing behavior), which also consumes the pending flag.
    const existing = nodes.find((n) => n.externalId === resolved.externalId)
    if (existing) {
      set({ currentNodeId: existing.id, pendingLinks: [], newTreePending: false })
      return existing.id
    }
    // #11: a pending "new tree" request ignores the current selection — the
    // source becomes a fresh root (parentId: null, depth: 0).
    const targetParentId = newTreePending ? null : currentNodeId ?? null
    const parent = targetParentId ? nodes.find((n) => n.id === targetParentId) : null
    const id = crypto.randomUUID()
    const node: DiscoveryNode = {
      id,
      title: resolved.title,
      source: 'source',
      parentId: targetParentId,
      depth: parent ? parent.depth + 1 : 0,
      starred: false,
      explored: false,
      addedAt: Date.now(),
      externalId: resolved.externalId,
      platform: resolved.platform,
      sourceUrl: resolved.url,
      sourceHost: resolved.host,
      credibilityTier: resolved.tier,
      abstract: resolved.abstract ?? undefined,
      authors: resolved.authors,
      publishedAt: resolved.publishedAt ?? undefined,
    }
    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => (n.id === targetParentId ? { ...n, explored: true } : n)),
        node,
      ],
      currentNodeId: id,
      pendingLinks: [],
      newTreePending: false,
    }))
    persistCreate([
      {
        id,
        title: resolved.title,
        parentId: targetParentId,
        source: 'source',
        platform: resolved.platform,
        externalId: resolved.externalId,
        sourceUrl: resolved.url,
        sourceHost: resolved.host,
        authors: resolved.authors,
        abstract: resolved.abstract ?? undefined,
        publishedAt: resolved.publishedAt ?? undefined,
      },
    ]).then((result) => {
      if (result.ok) reportKp(set, result.kp)
      else void get().hydrate()
    })
    return id
  },

  // The native citation surf: resolve each selected chip (≤2) via the resolve
  // route, then attach the resolved sources as child nodes of the current node —
  // the source analogue of `branchAndContinue`. Marks the parent explored.
  // #11: intentionally does NOT consume `newTreePending` — "new tree" means
  // "the next SOURCE you OPEN/ADD starts a new tree," not a citation-branch
  // off the current node. Branching always attaches to `currentNodeId`.
  branchSources: async (chips) => {
    const selected = chips.slice(0, 2)
    if (selected.length === 0) return
    const { currentNodeId, nodes } = get()

    const parent = currentNodeId ? nodes.find((n) => n.id === currentNodeId) : null
    const baseDepth = parent ? parent.depth + 1 : 0

    const created: DiscoveryNode[] = []
    const toPersist: NewNode[] = []

    for (const chip of selected) {
      // Skip anything already in the tree (team-wide dedup mirror).
      if (nodes.some((n) => n.externalId === chip.externalId)) continue
      let resolved: ResolvedSource
      try {
        const res = await fetch('/api/discovery/sources/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: chip.platform, externalId: chip.externalId }),
        })
        if (!res.ok) continue
        resolved = (await res.json()) as ResolvedSource
      } catch (err) {
        console.error('[discovery] branch resolve failed:', err)
        continue
      }
      const id = crypto.randomUUID()
      created.push({
        id,
        title: resolved.title,
        source: 'source',
        parentId: currentNodeId ?? null,
        depth: baseDepth,
        starred: false,
        explored: false,
        addedAt: Date.now(),
        externalId: resolved.externalId,
        platform: resolved.platform,
        sourceUrl: resolved.url,
        sourceHost: resolved.host,
        credibilityTier: resolved.tier,
        abstract: resolved.abstract ?? undefined,
        authors: resolved.authors,
        publishedAt: resolved.publishedAt ?? undefined,
      })
      toPersist.push({
        id,
        title: resolved.title,
        parentId: currentNodeId ?? null,
        source: 'source',
        platform: resolved.platform,
        externalId: resolved.externalId,
        sourceUrl: resolved.url,
        sourceHost: resolved.host,
        authors: resolved.authors,
        abstract: resolved.abstract ?? undefined,
        publishedAt: resolved.publishedAt ?? undefined,
      })
    }

    if (created.length === 0) {
      set({ pendingLinks: [] })
      return
    }

    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
        ...created,
      ],
      currentNodeId: created[0].id,
      pendingLinks: [],
    }))
    const result = await persistCreate(toPersist)
    if (result.ok) reportKp(set, result.kp)
    else await get().hydrate()
  },

  navigateToNode: (nodeId) => {
    set({ currentNodeId: nodeId, pendingLinks: [] })
  },

  togglePendingLink: (title) => {
    const { pendingLinks } = get()
    if (pendingLinks.includes(title)) {
      set({ pendingLinks: pendingLinks.filter((t) => t !== title) })
    } else if (pendingLinks.length < 2) {
      set({ pendingLinks: [...pendingLinks, title] })
    }
  },

  // #11: intentionally does NOT consume `newTreePending` (same reasoning as
  // `branchSources` above) — this is a branch-from-current action, not a
  // source-open/add, so it always attaches under `currentNodeId`.
  branchAndContinue: () => {
    const { currentNodeId, pendingLinks, nodes } = get()
    if (!currentNodeId || pendingLinks.length === 0) return

    const current = nodes.find((n) => n.id === currentNodeId)
    if (!current) return

    const newNodes: DiscoveryNode[] = pendingLinks.map((title) => ({
      id: crypto.randomUUID(),
      title,
      source: 'wikipedia',
      parentId: currentNodeId,
      depth: current.depth + 1,
      starred: false,
      explored: false,
      addedAt: Date.now(),
    }))

    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
        ...newNodes,
      ],
      currentNodeId: newNodes[0].id,
      pendingLinks: [],
    }))
    persistCreate(
      newNodes.map((n) => ({ id: n.id, title: n.title, parentId: n.parentId, source: 'wikipedia' as const })),
    ).then((result) => {
      if (result.ok) reportKp(set, result.kp)
      else void get().hydrate()
    })
  },

  setNodeReflection: (nodeId, reflection) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, reflection: reflection || undefined } : n,
      ),
    }))
  },

  // #13: promote a starred source node into a real Paper. The server is the sole
  // authority (team-scoped, IDOR-safe, idempotent); on success we mark the node
  // promoted locally so the Promote control disappears without a full reload.
  promoteSource: async (nodeId) => {
    try {
      const res = await fetch(`/api/discovery/source/${nodeId}/promote`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Already promoted (409) still carries a paperId — treat as success.
        if (res.status === 409 && d.paperId) {
          set((state) => ({
            nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, paperId: d.paperId } : n)),
          }))
          return null
        }
        return typeof d.error === 'string' ? d.error : 'Could not promote this source.'
      }
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, paperId: d.paperId } : n)),
      }))
      return null
    } catch (err) {
      console.error('[discovery] promote failed:', err)
      return 'Network error — please try again.'
    }
  },

  toggleStar: (nodeId) => {
    let nextStarred = false
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        nextStarred = !n.starred
        return { ...n, starred: nextStarred }
      }),
    }))
    persistStar(nodeId, nextStarred).then((ok) => {
      if (!ok) void get().hydrate()
    })
  },

  // #11: optimistically set the local interest tier, then persist (mirrors
  // `toggleStar`). The caller (DiscoveryTree's swatch cycle) computes `level`.
  setInterest: (nodeId, level) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, interestLevel: level } : n)),
    }))
    persistInterest(nodeId, level).then((ok) => {
      if (!ok) void get().hydrate()
    })
  },

  // #11: mark that the next opened/added source starts a brand-new tree.
  startNewTree: () => set({ newTreePending: true }),

  deleteSubtree: (nodeId) => {
    set((state) => {
      // Collect the target node and all descendants via BFS
      const toDelete = new Set<string>()
      const queue = [nodeId]
      while (queue.length > 0) {
        const id = queue.shift()!
        toDelete.add(id)
        state.nodes.filter((n) => n.parentId === id).forEach((n) => queue.push(n.id))
      }

      const remaining = state.nodes.filter((n) => !toDelete.has(n.id))

      // If the current node was deleted, navigate to the deleted node's parent
      // (if it still exists) or the first remaining node
      const currentWasDeleted = toDelete.has(state.currentNodeId ?? '')
      let newCurrentId = state.currentNodeId
      if (currentWasDeleted) {
        const deletedNode = state.nodes.find((n) => n.id === nodeId)
        const parent = remaining.find((n) => n.id === deletedNode?.parentId)
        newCurrentId = parent?.id ?? remaining[0]?.id ?? null
      }

      return {
        nodes: remaining,
        currentNodeId: newCurrentId,
        pendingLinks: currentWasDeleted ? [] : state.pendingLinks,
      }
    })
    // Server cascades the subtree delete from this id.
    persistDelete(nodeId).then((ok) => {
      if (!ok) void get().hydrate()
    })
  },

  reset: () => {
    set({ nodes: [], currentNodeId: null, pendingLinks: [], newTreePending: false })
    persistReset().then((ok) => {
      if (!ok) void get().hydrate()
    })
  },
}))
