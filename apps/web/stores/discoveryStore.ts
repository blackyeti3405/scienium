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

/** POST new nodes; returns the KP the server reports it awarded (0 on failure). */
async function persistCreate(nodes: NewNode[]): Promise<number> {
  try {
    const res = await fetch('/api/discovery/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })
    if (!res.ok) return 0
    const data = await res.json().catch(() => ({}))
    return typeof data.kpAwarded === 'number' ? data.kpAwarded : 0
  } catch (err) {
    console.error('[discovery] create failed:', err)
    return 0
  }
}

async function persistStar(id: string, starred: boolean) {
  try {
    await fetch(`/api/discovery/tree/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    })
  } catch (err) {
    console.error('[discovery] star failed:', err)
  }
}

async function persistDelete(id: string) {
  try {
    await fetch(`/api/discovery/tree/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.error('[discovery] delete failed:', err)
  }
}

async function persistReset() {
  try {
    await fetch('/api/discovery/tree', { method: 'DELETE' })
  } catch (err) {
    console.error('[discovery] reset failed:', err)
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
    const existing = get().nodes.find((n) => !n.parentId && n.title === title)
    if (existing) {
      set({ currentNodeId: existing.id, pendingLinks: [] })
      return
    }
    const id = crypto.randomUUID()
    set((state) => ({
      nodes: [
        ...state.nodes,
        { id, title, source: 'wikipedia', parentId: null, depth: 0, starred: false, explored: false, addedAt: Date.now() },
      ],
      currentNodeId: id,
      pendingLinks: [],
    }))
    persistCreate([{ id, title, parentId: null, source: 'wikipedia' }]).then((kp) => reportKp(set, kp))
  },

  // Add a pasted YouTube video. Attaches under the current node (a branch — and a
  // cross-source bridge if the current node is a Wikipedia article), or as a new
  // root if nothing is selected.
  addYouTubeVideo: (videoId, title) => {
    const { currentNodeId, nodes } = get()
    // De-dupe: if this video already exists under the current parent, just go to it.
    const existing = nodes.find((n) => n.videoId === videoId && n.parentId === (currentNodeId ?? null))
    if (existing) {
      set({ currentNodeId: existing.id })
      return
    }
    const parent = currentNodeId ? nodes.find((n) => n.id === currentNodeId) : null
    const id = crypto.randomUUID()
    set((state) => ({
      nodes: [
        ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
        {
          id,
          title,
          source: 'youtube',
          videoId,
          parentId: currentNodeId ?? null,
          depth: parent ? parent.depth + 1 : 0,
          starred: false,
          explored: false,
          addedAt: Date.now(),
        },
      ],
      currentNodeId: id,
      pendingLinks: [],
    }))
    persistCreate([{ id, title, parentId: currentNodeId ?? null, source: 'youtube', videoId }]).then((kp) =>
      reportKp(set, kp),
    )
  },

  // Add a resolved arXiv/PubMed source. Attaches under the current node (a branch
  // — and a cross-source bridge if the current node is wiki/youtube), or as a new
  // root when nothing is selected. Server re-derives host+tier before persisting.
  addSourceNode: (resolved) => {
    const { currentNodeId, nodes } = get()
    // De-dupe by externalId (the DB @@unique is team-wide; mirror it locally).
    const existing = nodes.find((n) => n.externalId === resolved.externalId)
    if (existing) {
      set({ currentNodeId: existing.id, pendingLinks: [] })
      return existing.id
    }
    const parent = currentNodeId ? nodes.find((n) => n.id === currentNodeId) : null
    const id = crypto.randomUUID()
    const node: DiscoveryNode = {
      id,
      title: resolved.title,
      source: 'source',
      parentId: currentNodeId ?? null,
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
        ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
        node,
      ],
      currentNodeId: id,
      pendingLinks: [],
    }))
    persistCreate([
      {
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
      },
    ])
    return id
  },

  // The native citation surf: resolve each selected chip (≤2) via the resolve
  // route, then attach the resolved sources as child nodes of the current node —
  // the source analogue of `branchAndContinue`. Marks the parent explored.
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
    persistCreate(toPersist)
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
    ).then((kp) => reportKp(set, kp))
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
    persistStar(nodeId, nextStarred)
  },

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
    persistDelete(nodeId)
  },

  reset: () => {
    set({ nodes: [], currentNodeId: null, pendingLinks: [] })
    persistReset()
  },
}))
