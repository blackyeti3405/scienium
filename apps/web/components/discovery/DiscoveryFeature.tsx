'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { DiscoveryTree } from '@/components/discovery/DiscoveryTree'
import { DiscoveryTopicList } from '@/components/discovery/DiscoveryTopicList'
import { DiscoveryHomeScreen } from '@/components/discovery/DiscoveryHomeScreen'
import { DiscoveryModals } from '@/components/discovery/DiscoveryModals'
import { DiscoveryHeader } from '@/components/discovery/DiscoveryHeader'
import { FinalTopicBar } from '@/components/discovery/FinalTopicBar'
import { ExplorerSidePanel } from '@/components/discovery/ExplorerSidePanel'
import { ExplorerReaderPane } from '@/components/discovery/ExplorerReaderPane'
import { useFinalTopic } from '@/components/discovery/hooks/useFinalTopic'
import { useTeamInterests } from '@/components/discovery/hooks/useTeamInterests'
import { useSourceLanes } from '@/components/discovery/hooks/useSourceLanes'
import { useResizablePanel } from '@/lib/hooks/useResizablePanel'
import { useAutoDismiss } from '@/lib/hooks/useAutoDismiss'
import { resolveSource } from '@/lib/discovery/treeApi'
import type { DiscoverySource } from '@/stores/discoveryStore'
import type { SourcePlatform, SourceChip } from '@/lib/discovery/sources'

// ── Resize constraints ──────────────────────────────────────────────────────
const MIN_PANEL = 240
const MAX_PANEL = 640
const DEFAULT_PANEL = 320

/**
 * Topic Discovery feature — the Wikipedia explorer + branching tree.
 *
 * Fills its parent (`h-full`) so it can mount inside the gateway overlay panel
 * (FeaturePanel) as well as the standalone /discovery route. This is the real,
 * fully-built feature; the other gateways currently open placeholder panels.
 */
export function DiscoveryFeature() {
  const {
    nodes,
    currentNodeId,
    pendingLinks,
    kpAward,
    hydrated,
    loadError,
    hydrate,
    startExploration,
    addYouTubeVideo,
    addSourceNode,
    branchSources,
    navigateToNode,
    togglePendingLink,
    branchAndContinue,
    toggleStar,
    setInterest,
    newTreePending,
    startNewTree,
    setNodeReflection,
    promoteSource,
    deleteSubtree,
    reset,
  } = useDiscoveryStore()

  const { confirm, dialog } = useConfirm()
  const { addCurrency } = useLabCurrency()

  // ── "+N KP" pill — bumped whenever the server reports a first-visit/topic/
  //    reflection award. Auto-dismisses; only shown for awards > 0. ────────────
  const [kpPill, setKpPill] = useState<{ amount: number; nonce: number } | null>(null)
  const showKp = useCallback(
    (amount: number) => {
      if (amount <= 0) return
      addCurrency({ kp: amount })
      setKpPill({ amount, nonce: Date.now() })
    },
    [addCurrency],
  )

  // Tree create/branch awards arrive via the store's DB-authoritative kpAward
  // signal (bumped only when the server actually paid). Fire the tick-up once
  // per award via the monotonic nonce.
  useEffect(() => {
    if (kpAward.nonce > 0 && kpAward.amount > 0) showKp(kpAward.amount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpAward.nonce])

  // Auto-dismiss the pill a few seconds after it appears.
  useAutoDismiss(kpPill, () => setKpPill(null), 2600)

  // Which source the left pane shows: the Wikipedia reader or the YouTube viewer.
  const [discoverySource, setDiscoverySource] = useState<DiscoverySource>('wikipedia')
  // #11: 'explore' = the normal reader + right-panel-tree layout (unchanged).
  // 'tree' = the full-window Discovery Tree view (large tree left, grouped
  // topic list right) — a fourth top-level view mode, not a `discoverySource`.
  const [view, setView] = useState<'explore' | 'tree'>('explore')
  // Papers tab: 'search' shows the results list, 'reader' shows the open paper.
  // Kept separate from currentNodeId so "← Results" returns to the list without
  // losing the tree selection (PapersSearch stays mounted → its results persist).
  const [papersView, setPapersView] = useState<'search' | 'reader'>('search')

  async function addVideoFromUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch('/api/discovery/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) return data.error ?? 'Could not add that link'
      addYouTubeVideo(data.videoId, data.title)
      return null
    } catch {
      return 'Network error — please try again'
    }
  }

  // Transient error pill (Toast primitive) for the add-paper-from-search path —
  // a wifi blip must never fail silently (UX-1).
  const [sourceAddError, setSourceAddError] = useState<{ nonce: number } | null>(null)
  useAutoDismiss(sourceAddError, () => setSourceAddError(null), 4000)

  // Papers search → resolve the picked work (server-authoritative host/tier) →
  // add it as a new source node (root, or a child of the current node).
  // Failure is non-fatal — surfaced as an error toast so the student retries.
  async function addSourceFromSearch(platform: SourcePlatform, externalId: string): Promise<void> {
    const resolved = await resolveSource(platform, externalId)
    if (resolved) {
      addSourceNode(resolved)
    } else {
      setSourceAddError({ nonce: Date.now() })
    }
  }

  // Persist the one-line reflection; update the local cache on success. The
  // first completion of a source node's reflection is #1's KP trigger — tick up
  // when the server reports kpAwarded > 0.
  async function saveReflection(nodeId: string, text: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/discovery/sources/${nodeId}/reflection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection: text }),
      })
      if (!res.ok) return false
      const d = await res.json().catch(() => ({}))
      setNodeReflection(nodeId, text)
      if (typeof d.kpAwarded === 'number') showKp(d.kpAwarded)
      return true
    } catch {
      return false
    }
  }

  // Load the persisted tree from the database on mount.
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Toast surfaced when a locked topic connects to seeded interests.
  const [interestConnectMsg, setInterestConnectMsg] = useState<string | null>(null)

  // ── Final research topic (stored on the team) ──────────────────────────────
  const {
    finalTopic,
    topicLoaded,
    editingTopic,
    setEditingTopic,
    topicDraft,
    setTopicDraft,
    savingTopic,
    topicConfirm,
    setTopicConfirm,
    topicWipeResult,
    setTopicWipeResult,
    saveTopic,
  } = useFinalTopic({ onKpAwarded: showKp, onInterestConnect: setInterestConnectMsg })

  // ── Team interests (#2 Activate TopicInterest) ─────────────────────────────
  const { interests, currentUserId, addInterest, removeInterest } = useTeamInterests()

  // Documented seam for Feature A's Papers tab: seeding an interest sets this to
  // the phrase so the Papers search box can prefill from it, then clear it. Unused
  // if the Papers tab doesn't read it — no runtime dependency.
  const [pendingSourceSearch, setPendingSourceSearch] = useState<string | null>(null)
  // Promote-to-Literature-Review result toast (#13).
  const [promoteMsg, setPromoteMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // #11: transient hint pill shown right after clicking "New tree" (the
  // `newTreePending` badge on the button itself stays until consumed; this
  // pill just calls out what to do next, then auto-dismisses).
  const [newTreeHint, setNewTreeHint] = useState(false)
  // Busy state for the "Branch into N sources" action — seconds-class (resolve +
  // persist per chip) with previously zero feedback and a double-click window.
  const [branching, setBranching] = useState(false)
  // Busy state for the Promote pill (per-node id) — seconds with zero feedback.
  const [promotingId, setPromotingId] = useState<string | null>(null)

  async function handlePromote(nodeId: string) {
    if (promotingId) return
    setPromotingId(nodeId)
    const node = nodes.find((n) => n.id === nodeId)
    try {
      const err = await promoteSource(nodeId)
      if (err) {
        setPromoteMsg({ text: err, ok: false })
      } else {
        setPromoteMsg({ text: `Added “${node?.title ?? 'source'}” to your Literature Review`, ok: true })
      }
    } finally {
      setPromotingId(null)
    }
  }

  async function handleBranchSources(chips: SourceChip[]) {
    if (branching) return
    setBranching(true)
    try {
      await branchSources(chips)
    } finally {
      setBranching(false)
    }
  }

  async function handleDeleteNode(nodeId: string) {
    const target = nodes.find((n) => n.id === nodeId)
    const ok = await confirm({
      title: 'Delete node',
      message: `Delete “${target?.title ?? 'this node'}” and all of its children? This can’t be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (ok) deleteSubtree(nodeId)
  }

  // Auto-dismiss the interest-connection toast.
  useAutoDismiss(interestConnectMsg, () => setInterestConnectMsg(null), 5000)

  // Auto-dismiss the promote toast (#13).
  useAutoDismiss(promoteMsg, () => setPromoteMsg(null), 4000)

  // Auto-dismiss the "New tree" hint pill (#11). The persistent "NEW TREE
  // PENDING" badge on the button itself is the source of truth for the
  // pending state — this pill is just a one-time nudge.
  useAutoDismiss(newTreeHint, () => setNewTreeHint(false), 4000)

  // One-tap start from an interest chip: seed a Wikipedia root (the chip text IS
  // the query — no AI), open the explorer, and expose the phrase to the Papers tab.
  function seedFromInterest(text: string) {
    startExploration(text)
    setPendingSourceSearch(text)
    setShowHome(false)
  }

  const currentNode = nodes.find((n) => n.id === currentNodeId) ?? null
  const starredNodes = nodes.filter((n) => n.starred)

  // Navigating to a node switches the left pane to match its source. Opening a
  // source node (from search OR the tree) shows the reader; "← Results" flips back.
  useEffect(() => {
    if (currentNode) setDiscoverySource(currentNode.source)
    if (currentNode?.source === 'source') setPapersView('reader')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId])

  // ── Source surf lanes (shared by the reader + the source branch panel) ──────
  const { sourceLanes, lanesLoading, chipsById } = useSourceLanes(currentNode)
  const currentIsSource = currentNode?.source === 'source'

  // Clear the pending Papers-tab seed once the Papers search box has mounted with
  // it (PapersSearch reads defaultQuery only on mount), so it isn't re-applied.
  useEffect(() => {
    if (pendingSourceSearch && discoverySource === 'source' && !currentIsSource) {
      const t = setTimeout(() => setPendingSourceSearch(null), 0)
      return () => clearTimeout(t)
    }
  }, [discoverySource, currentIsSource, pendingSourceSearch])

  // ── Home screen state — true on every fresh mount ──────────────────────────
  const [showHome, setShowHome] = useState(true)

  // ── Resizable panel ────────────────────────────────────────────────────────
  const { width: panelWidth, onDividerMouseDown } = useResizablePanel({
    min: MIN_PANEL,
    max: MAX_PANEL,
    initial: DEFAULT_PANEL,
  })

  // One props object for the tree, mounted twice (full-window view + side panel).
  const treeProps = {
    nodes,
    currentNodeId,
    onNavigate: navigateToNode,
    onDelete: handleDeleteNode,
    onToggleStar: toggleStar,
    onPromote: handlePromote,
    onSetInterest: setInterest,
    promotingId,
  }

  // ── Shared modals (rendered over whichever screen is active) ────────────────

  const modals = (
    <>
      {dialog}
      <DiscoveryModals
        kpPill={kpPill}
        sourceAddError={sourceAddError}
        topicConfirm={topicConfirm}
        savingTopic={savingTopic}
        onCancelTopicChange={() => setTopicConfirm(null)}
        onConfirmTopicChange={(newTopic) => saveTopic(newTopic, true)}
        topicWipeResult={topicWipeResult}
        onDismissWipeResult={() => setTopicWipeResult(null)}
        promoteMsg={promoteMsg}
        onDismissPromoteMsg={() => setPromoteMsg(null)}
        newTreeHint={newTreeHint}
        interestConnectMsg={interestConnectMsg}
        onDismissInterestConnect={() => setInterestConnectMsg(null)}
      />
    </>
  )

  // ── Home screen ─────────────────────────────────────────────────────────────
  if (showHome) {
    return (
      <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white">
        {modals}
        <DiscoveryHomeScreen
          hydrated={hydrated}
          loadError={loadError}
          onRetry={() => void hydrate()}
          homeProps={{
            starredNodes,
            hasExisting: nodes.length > 0,
            finalTopic,
            onSetFinalTopic: saveTopic,
            onContinue: () => setShowHome(false),
            onOpenStarred: (nodeId) => {
              navigateToNode(nodeId)
              setShowHome(false)
            },
            interests,
            currentUserId,
            onAddInterest: addInterest,
            onRemoveInterest: removeInterest,
            onSeedInterest: seedFromInterest,
          }}
        />
      </div>
    )
  }

  // ── Main explorer layout (handles the empty case too: search a Wikipedia
  //    topic, or toggle to YouTube and paste a link) ──────────────────────────
  return (
    <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white">
      {modals}

      {/* ── Top bar ── */}
      <DiscoveryHeader
        view={view}
        discoverySource={discoverySource}
        starredCount={starredNodes.length}
        newTreePending={newTreePending}
        onBack={() => setShowHome(true)}
        onSearchSelect={startExploration}
        onSelectSource={(source) => { setDiscoverySource(source); setView('explore') }}
        onSelectTreeView={() => setView('tree')}
        onNewTree={() => {
          startNewTree()
          setView('explore')
          setNewTreeHint(true)
        }}
        onStartOver={async () => {
          if (await confirm({ title: 'Start over', message: 'Start over? This will clear your discovery tree.', confirmLabel: 'Start over', tone: 'danger' })) reset()
        }}
      />

      {/* ── Final topic bar ── */}
      <FinalTopicBar
        finalTopic={finalTopic}
        topicLoaded={topicLoaded}
        editing={editingTopic}
        draft={topicDraft}
        onDraftChange={setTopicDraft}
        saving={savingTopic}
        onSave={saveTopic}
        onBeginEdit={(initialDraft) => { setTopicDraft(initialDraft); setEditingTopic(true) }}
        onCancelEdit={() => setEditingTopic(false)}
        chooseDraft={currentNode?.title ?? ''}
      />

      {/* ── Body ── */}
      {view === 'tree' ? (
        // #11: full-window Discovery Tree view — large tree left, ALL topics
        // grouped color-major/tree-minor on the right. Reads only from the
        // store (no reader state), so a plain conditional swap is fine.
        <div data-testid="tree-view" className="flex flex-1 overflow-hidden bg-[#0d1b2e]">
          <div className="flex-1 overflow-hidden p-3 flex flex-col min-h-0 border-r border-white/10">
            <p className="font-pixel text-[8px] uppercase tracking-widest text-[#F5C518] px-1 mb-2 shrink-0">
              🌳 Discovery Tree
            </p>
            <div className="flex-1 min-h-0">
              <DiscoveryTree {...treeProps} />
            </div>
          </div>
          <div className="w-[320px] shrink-0 overflow-hidden">
            <DiscoveryTopicList nodes={nodes} currentNodeId={currentNodeId} onNavigate={navigateToNode} />
          </div>
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Wikipedia reader, YouTube viewer, or Papers (search/reader) ── */}
        <ExplorerReaderPane
          discoverySource={discoverySource}
          papersView={papersView}
          currentNode={currentNode}
          currentIsSource={currentIsSource}
          pendingSourceSearch={pendingSourceSearch}
          finalTopic={finalTopic}
          sourceLanes={sourceLanes}
          lanesLoading={lanesLoading}
          pendingLinks={pendingLinks}
          onPickSource={addSourceFromSearch}
          onChipToggle={togglePendingLink}
          onStarCurrent={() => currentNode && toggleStar(currentNode.id)}
          onSaveReflection={saveReflection}
          onBackToResults={() => setPapersView('search')}
          onAddVideoUrl={addVideoFromUrl}
        />

        {/* ── Drag handle ── */}
        <div
          onMouseDown={onDividerMouseDown}
          title="Drag to resize"
          className="w-1.5 shrink-0 cursor-col-resize bg-white/10 hover:bg-[#F5C518]/40 active:bg-[#F5C518]/60 transition-colors flex flex-col items-center justify-center gap-1 group"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/30 group-hover:bg-[#F5C518]/60 transition-colors" />
          ))}
        </div>

        {/* ── Right: tree + starred + branch panel ── */}
        <ExplorerSidePanel
          width={panelWidth}
          treeProps={treeProps}
          starredNodes={starredNodes}
          currentNodeId={currentNodeId}
          discoverySource={discoverySource}
          currentIsSource={currentIsSource}
          pendingLinks={pendingLinks}
          chipsById={chipsById}
          branching={branching}
          onNavigate={navigateToNode}
          onTogglePendingLink={togglePendingLink}
          onBranchSources={handleBranchSources}
          onBranchAndContinue={branchAndContinue}
        />
      </div>
      )}
    </div>
  )
}

export default DiscoveryFeature
