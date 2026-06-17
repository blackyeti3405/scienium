'use client'

import { create } from 'zustand'

export type DiscoverySource = 'wikipedia' | 'youtube'

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
}

interface DiscoveryStore {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  /** Titles the user has clicked to branch into — max 2, not yet committed */
  pendingLinks: string[]
  /** True once the tree has been loaded from the server at least once */
  hydrated: boolean

  hydrate: () => Promise<void>
  startExploration: (title: string) => void
  /** Add a YouTube video as a child of the current node (or a new root). */
  addYouTubeVideo: (videoId: string, title: string) => void
  navigateToNode: (nodeId: string) => void
  togglePendingLink: (title: string) => void
  branchAndContinue: () => void
  toggleStar: (nodeId: string) => void
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
}

async function persistCreate(nodes: NewNode[]) {
  try {
    await fetch('/api/discovery/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })
  } catch (err) {
    console.error('[discovery] create failed:', err)
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

export const useDiscoveryStore = create<DiscoveryStore>()((set, get) => ({
  nodes: [],
  currentNodeId: null,
  pendingLinks: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const res = await fetch('/api/discovery/tree')
      if (!res.ok) throw new Error(`load failed (${res.status})`)
      const data = await res.json()
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
    persistCreate([{ id, title, parentId: null, source: 'wikipedia' }])
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
    persistCreate([{ id, title, parentId: currentNodeId ?? null, source: 'youtube', videoId }])
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
    persistCreate(newNodes.map((n) => ({ id: n.id, title: n.title, parentId: n.parentId, source: 'wikipedia' as const })))
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
