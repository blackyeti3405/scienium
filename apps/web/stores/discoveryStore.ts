'use client'

import { create } from 'zustand'
import type { CredibilityTier } from '@prisma/client'
import type {
  ArticleProvider,
  ArticleRenderMode,
  ResolvedArticle,
  ResolvedSource,
  SourceChip,
  SourcePlatform,
} from '@/lib/discovery/sources'
import {
  fetchTree,
  persistCreate,
  persistDelete,
  persistInterest,
  persistPromote,
  persistReset,
  persistStar,
  resolveSource,
  type NewNode,
} from '@/lib/discovery/treeApi'

export type DiscoverySource = 'wikipedia' | 'youtube' | 'source' | 'article'

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
  // ── article-node metadata (present only when source === 'article') ──
  provider?: ArticleProvider
  renderMode?: ArticleRenderMode
  sourceName?: string
  articleUrl?: string
  excerpt?: string
  /** Full sanitized HTML — present only for `renderMode === 'full'`. */
  articleHtml?: string
  articleAuthor?: string
  articlePublishedAt?: string
}

interface DiscoveryStore {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  /** Titles the user has clicked to branch into — max 2, not yet committed */
  pendingLinks: string[]
  /** True once the tree has been loaded from the server at least once */
  hydrated: boolean
  /**
   * True when the last hydrate attempt failed. Distinct from "hydrated with an
   * empty tree" — a fetch failure must render a retry, never the first-run
   * home implying the team's tree is gone (BLK-7).
   */
  loadError: boolean
  /**
   * Server-reported first-visit KP from the most recent create/branch, plus a
   * monotonic nonce so the UI fires a "+N KP" tick-up exactly once per award
   * (even when two awards happen to be the same amount). 0 = nothing to show.
   * DB-authoritative: only ever set from the tree POST's `kpAwarded`.
   */
  kpAward: { amount: number; nonce: number }
  /**
   * The last write that did not reach the server, plus a monotonic nonce so a
   * repeat failure re-fires the toast.
   *
   * Every mutation here is optimistic: the node appears, then the POST goes out.
   * When that POST failed, the store re-hydrated — which is correct, the server
   * is authoritative — and the student's node simply **vanished**, with nothing
   * anywhere saying why. `loadError` covers a failed *read* only. Reproduced
   * against the original: a failed `startExploration` left `nodes: []` and
   * `loadError: false`.
   */
  writeError: { message: string; nonce: number } | null
  dismissWriteError: () => void
  /**
   * #11: set by `startNewTree()`; consumed (cleared) by the FIRST of
   * `startExploration` / `addYouTubeVideo` / `addSourceNode` / `addArticleNode`
   * that fires next — that create forces `parentId: null` (a new root/tree)
   * regardless of the current selection. `navigateToNode` does NOT consume it,
   * and neither does a create whose write FAILED (`commitOptimistic` gives the
   * flag back, so an intent is never spent on something that did not happen).
   */
  newTreePending: boolean

  hydrate: () => Promise<void>
  startExploration: (title: string) => void
  /** Add a YouTube video as a child of the current node (or a new root). */
  addYouTubeVideo: (videoId: string, title: string) => void
  /** Add a resolved source (arXiv/PubMed) as a child of the current node, or a new
   *  root when nothing is selected. Returns the created/existing node id. */
  addSourceNode: (resolved: ResolvedSource) => string
  /** Add a resolved article (The Conversation/journalism) as a child of the
   *  current node, or a new root when nothing is selected. Returns the
   *  created/existing node id. */
  addArticleNode: (resolved: ResolvedArticle) => string
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

// Network I/O lives in lib/discovery/treeApi.ts; this store owns state +
// actions and the optimistic-apply/rollback sequencing around those calls.

export const useDiscoveryStore = create<DiscoveryStore>()((set, get) => {
  // Reports a server KP award into the store so the UI can tick it up once.
  // Only bumps the nonce when the server actually paid (amount > 0).
  const reportKp = (amount: number) => {
    if (amount > 0) set((s) => ({ kpAward: { amount, nonce: s.kpAward.nonce + 1 } }))
  }

  /**
   * The repeated optimistic-update idiom: apply the local state change, fire
   * the persistence call, and re-hydrate on a failed write so the UI
   * reconciles with the DB-authoritative tree.
   *
   * A failed write now also (a) SAYS SO — re-hydrating silently is how a
   * student's node disappeared with no explanation — and (b) gives back
   * `newTreePending`. That flag is the student's "start a new tree" intent, and
   * it was cleared inside the optimistic apply, so a create that never happened
   * still spent it: they pressed "new tree", the create failed, the node
   * vanished, and the next source they opened attached to the old tree instead.
   */
  // Monotonic across the store's lifetime. Reading it back off `writeError`
  // would restart at 1 every time, because the same function clears the field
  // before it applies — so a second failure would never re-fire the toast.
  let writeErrorNonce = 0

  const commitOptimistic = (
    apply: () => void,
    persist: () => Promise<boolean>,
    failure: string,
  ): Promise<void> => {
    const pendingBefore = get().newTreePending
    set({ writeError: null })
    apply()
    return persist().then((ok) => {
      if (ok) return
      set({
        writeError: { message: failure, nonce: ++writeErrorNonce },
        newTreePending: pendingBefore,
      })
      return get().hydrate()
    })
  }

  /** Optimistic-create variant: POST the new nodes and report any KP award. */
  const commitCreate = (apply: () => void, nodes: NewNode[], failure: string): Promise<void> =>
    commitOptimistic(
      apply,
      async () => {
        const result = await persistCreate(nodes)
        if (result.ok) reportKp(result.kp)
        return result.ok
      },
      failure,
    )

  /**
   * The ONE create path for a single node attached to the current selection.
   *
   * `addSourceNode` and `addArticleNode` were near-identical sixty-line copies of
   * this, and `addYouTubeVideo` a third — §0.7 names the duplication. Everything
   * outside `build` is the same for all three: where a new node attaches (the
   * current selection, unless a new tree was requested), the parent's depth,
   * marking that parent explored, and clearing the selection state.
   */
  const attachOne = (
    build: (id: string, parentId: string | null, depth: number) => { node: DiscoveryNode; row: NewNode },
    failure: string,
  ): string => {
    const { currentNodeId, nodes, newTreePending } = get()
    const parentId = newTreePending ? null : currentNodeId ?? null
    const parent = parentId ? nodes.find((n) => n.id === parentId) : null
    const id = crypto.randomUUID()
    const { node, row } = build(id, parentId, parent ? parent.depth + 1 : 0)
    void commitCreate(
      () =>
        set((state) => ({
          nodes: [...state.nodes.map((n) => (n.id === parentId ? { ...n, explored: true } : n)), node],
          currentNodeId: id,
          pendingLinks: [],
          newTreePending: false,
        })),
      [row],
      failure,
    )
    return id
  }

  return {
    nodes: [],
    currentNodeId: null,
    pendingLinks: [],
    hydrated: false,
    loadError: false,
    kpAward: { amount: 0, nonce: 0 },
    writeError: null,
    newTreePending: false,

    dismissWriteError: () => set({ writeError: null }),

    hydrate: async () => {
      set({ loadError: false })
      try {
        const nodes = await fetchTree()
        set((state) => ({
          nodes,
          hydrated: true,
          loadError: false,
          // Keep the current selection if it still exists, else the most-recent node
          currentNodeId:
            state.currentNodeId && nodes.some((n) => n.id === state.currentNodeId)
              ? state.currentNodeId
              : nodes[nodes.length - 1]?.id ?? null,
        }))
      } catch (err) {
        console.error('[discovery] hydrate failed:', err)
        set({ hydrated: true, loadError: true })
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
      void commitCreate(
        () =>
          set((state) => ({
            nodes: [
              ...state.nodes,
              { id, title, source: 'wikipedia', parentId: null, depth: 0, starred: false, explored: false, addedAt: Date.now() },
            ],
            currentNodeId: id,
            pendingLinks: [],
            newTreePending: false,
          })),
        [{ id, title, parentId: null, source: 'wikipedia' }],
        'Could not start that topic — check your connection and try again.',
      )
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
      attachOne(
        (id, parentId, depth) => ({
          node: {
            id,
            title,
            source: 'youtube',
            videoId,
            parentId,
            depth,
            starred: false,
            explored: false,
            addedAt: Date.now(),
          },
          row: { id, title, parentId, source: 'youtube', videoId },
        }),
        'Could not save that video — check your connection and try again.',
      )
    },

    // Add a resolved arXiv/PubMed source. Attaches under the current node (a branch
    // — and a cross-source bridge if the current node is wiki/youtube), or as a new
    // root when nothing is selected. Server re-derives host+tier before persisting.
    addSourceNode: (resolved) => {
      const { nodes } = get()
      // De-dupe by externalId (the DB @@unique is team-wide; mirror it locally).
      // Correct even when starting a new tree — a work already in the forest is
      // navigated to (existing behavior), which also consumes the pending flag.
      const existing = nodes.find((n) => n.externalId === resolved.externalId)
      if (existing) {
        set({ currentNodeId: existing.id, pendingLinks: [], newTreePending: false })
        return existing.id
      }
      // #11: a pending "new tree" request ignores the current selection — the
      // source becomes a fresh root (parentId: null, depth: 0). `attachOne` owns
      // that rule for every single-node create.
      return attachOne(
        (id, parentId, depth) => ({
          node: {
            id,
            title: resolved.title,
            source: 'source',
            parentId,
            depth,
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
          },
          row: {
            id,
            title: resolved.title,
            parentId,
            source: 'source',
            platform: resolved.platform,
            externalId: resolved.externalId,
            sourceUrl: resolved.url,
            sourceHost: resolved.host,
            authors: resolved.authors,
            abstract: resolved.abstract ?? undefined,
            publishedAt: resolved.publishedAt ?? undefined,
          },
        }),
        'Could not save that paper — check your connection and try again.',
      )
    },

    // Add a resolved article (The Conversation/journalism). Attaches under the
    // current node (a branch — and a cross-source bridge if the current node is
    // wiki/youtube/source), or as a new root when nothing is selected. Server
    // re-derives the sanitized `html` before persisting.
    addArticleNode: (resolved) => {
      const { nodes } = get()
      // De-dupe by externalId (the DB @@unique is team-wide; mirror it locally).
      const existing = nodes.find((n) => n.externalId === resolved.externalId)
      if (existing) {
        set({ currentNodeId: existing.id, pendingLinks: [], newTreePending: false })
        return existing.id
      }
      // #11: a pending "new tree" request ignores the current selection — the
      // article becomes a fresh root (parentId: null, depth: 0).
      return attachOne(
        (id, parentId, depth) => ({
          node: {
            id,
            title: resolved.title,
            source: 'article',
            parentId,
            depth,
            starred: false,
            explored: false,
            addedAt: Date.now(),
            externalId: resolved.externalId,
            provider: resolved.provider,
            renderMode: resolved.renderMode,
            sourceName: resolved.sourceName,
            articleUrl: resolved.url,
            excerpt: resolved.excerpt ?? undefined,
            articleHtml: resolved.html ?? undefined,
            articleAuthor: resolved.author ?? undefined,
            articlePublishedAt: resolved.publishedAt ?? undefined,
          },
          row: {
            id,
            title: resolved.title,
            parentId,
            source: 'article',
            externalId: resolved.externalId,
            provider: resolved.provider,
            renderMode: resolved.renderMode,
            sourceName: resolved.sourceName,
            articleUrl: resolved.url,
            excerpt: resolved.excerpt ?? undefined,
            html: resolved.html ?? undefined,
            articleAuthor: resolved.author ?? undefined,
            publishedAt: resolved.publishedAt ?? undefined,
          },
        }),
        'Could not save that article — check your connection and try again.',
      )
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
        const resolved = await resolveSource(chip.platform, chip.externalId)
        if (!resolved) continue
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

      await commitCreate(
        () =>
          set((state) => ({
            nodes: [
              ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
              ...created,
            ],
            currentNodeId: created[0].id,
            pendingLinks: [],
          })),
        toPersist,
        'Could not save those citations — check your connection and try again.',
      )
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

      void commitCreate(
        () =>
          set((state) => ({
            nodes: [
              ...state.nodes.map((n) => (n.id === currentNodeId ? { ...n, explored: true } : n)),
              ...newNodes,
            ],
            currentNodeId: newNodes[0].id,
            pendingLinks: [],
          })),
        newNodes.map((n) => ({ id: n.id, title: n.title, parentId: n.parentId, source: 'wikipedia' as const })),
        'Could not save that branch — check your connection and try again.',
      )
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
      const result = await persistPromote(nodeId)
      if (!result.ok) return result.error
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, paperId: result.paperId } : n)),
      }))
      return null
    },

    toggleStar: (nodeId) => {
      let nextStarred = false
      void commitOptimistic(
        () =>
          set((state) => ({
            nodes: state.nodes.map((n) => {
              if (n.id !== nodeId) return n
              nextStarred = !n.starred
              return { ...n, starred: nextStarred }
            }),
          })),
        () => persistStar(nodeId, nextStarred),
        'Could not save that star — check your connection and try again.',
      )
    },

    // #11: optimistically set the local interest tier, then persist (mirrors
    // `toggleStar`). The caller (DiscoveryTree's swatch cycle) computes `level`.
    setInterest: (nodeId, level) => {
      void commitOptimistic(
        () =>
          set((state) => ({
            nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, interestLevel: level } : n)),
          })),
        () => persistInterest(nodeId, level),
        'Could not save that interest tier — check your connection and try again.',
      )
    },

    // #11: mark that the next opened/added source starts a brand-new tree.
    startNewTree: () => set({ newTreePending: true }),

    deleteSubtree: (nodeId) => {
      void commitOptimistic(
        () =>
          set((state) => {
            // Collect the target node and all descendants.
            //
            // This used to rescan every node per queue entry AND never check
            // whether a child was already queued, so it had two problems the
            // audit named as one. The quadratic scan is real but cheap (48ms on
            // a 2,000-node chain, measured). The missing visited-check is not:
            // a self-parented row or a two-node cycle **never terminated** — the
            // browser tab hangs. `tree-service.ts` has stopped writing those
            // since v0.34.1 and its own `depthOf` still defends against rows
            // written before that guard existed; this path did not.
            const childrenOf = new Map<string, string[]>()
            for (const n of state.nodes) {
              if (!n.parentId) continue
              const siblings = childrenOf.get(n.parentId)
              if (siblings) siblings.push(n.id)
              else childrenOf.set(n.parentId, [n.id])
            }
            const toDelete = new Set<string>([nodeId])
            const queue = [nodeId]
            // Index walk, not `shift()` — which is itself O(n) on an array.
            for (let i = 0; i < queue.length; i++) {
              for (const childId of childrenOf.get(queue[i]!) ?? []) {
                if (toDelete.has(childId)) continue
                toDelete.add(childId)
                queue.push(childId)
              }
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
          }),
        // Server cascades the subtree delete from this id.
        () => persistDelete(nodeId),
        'Could not delete that branch — it has been restored.',
      )
    },

    reset: () => {
      void commitOptimistic(
        () => set({ nodes: [], currentNodeId: null, pendingLinks: [], newTreePending: false }),
        persistReset,
        'Could not clear your discovery tree — it has been restored.',
      )
    },
  }
})
