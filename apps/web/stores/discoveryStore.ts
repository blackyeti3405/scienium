'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DiscoveryNode {
  id: string
  title: string
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

  startExploration: (title: string) => void
  navigateToNode: (nodeId: string) => void
  togglePendingLink: (title: string) => void
  branchAndContinue: () => void
  toggleStar: (nodeId: string) => void
  /** Delete a node and every descendant beneath it */
  deleteSubtree: (nodeId: string) => void
  reset: () => void
}

export const useDiscoveryStore = create<DiscoveryStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      currentNodeId: null,
      pendingLinks: [],

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
            { id, title, parentId: null, depth: 0, starred: false, explored: false, addedAt: Date.now() },
          ],
          currentNodeId: id,
          pendingLinks: [],
        }))
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
          parentId: currentNodeId,
          depth: current.depth + 1,
          starred: false,
          explored: false,
          addedAt: Date.now(),
        }))

        set((state) => ({
          nodes: [
            ...state.nodes.map((n) =>
              n.id === currentNodeId ? { ...n, explored: true } : n,
            ),
            ...newNodes,
          ],
          currentNodeId: newNodes[0].id,
          pendingLinks: [],
        }))
      },

      toggleStar: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, starred: !n.starred } : n)),
        }))
      },

      deleteSubtree: (nodeId) => {
        set((state) => {
          // Collect the target node and all descendants via BFS
          const toDelete = new Set<string>()
          const queue = [nodeId]
          while (queue.length > 0) {
            const id = queue.shift()!
            toDelete.add(id)
            state.nodes
              .filter((n) => n.parentId === id)
              .forEach((n) => queue.push(n.id))
          }

          const remaining = state.nodes.filter((n) => !toDelete.has(n.id))

          // If the current node was deleted, navigate to the deleted node's
          // parent (if it still exists) or the first remaining node
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
      },

      reset: () => set({ nodes: [], currentNodeId: null, pendingLinks: [] }),
    }),
    { name: 'nova-lab-discovery-v1' },
  ),
)
