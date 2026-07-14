'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { useLabCurrency } from '@/lib/labCurrency'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { TopicSearch } from '@/components/discovery/TopicSearch'
import { WikiReader } from '@/components/discovery/WikiReader'
import { YouTubeViewer } from '@/components/discovery/YouTubeViewer'
import { SourceReader } from '@/components/discovery/SourceReader'
import { PapersSearch } from '@/components/discovery/PapersSearch'
import { DiscoveryTree } from '@/components/discovery/DiscoveryTree'
import { DiscoveryTopicList } from '@/components/discovery/DiscoveryTopicList'
import { DiscoveryHome } from '@/components/discovery/DiscoveryHome'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { BusyButton } from '@/components/ui/BusyButton'
import type { Interest } from '@/components/discovery/InterestSeeds'
import type { DiscoverySource } from '@/stores/discoveryStore'
import type { SourcePlatform, ResolvedSource, SourceChip, SourceLanes } from '@/lib/discovery/sources'

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
  useEffect(() => {
    if (!kpPill) return
    const t = setTimeout(() => setKpPill(null), 2600)
    return () => clearTimeout(t)
  }, [kpPill])

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

  // Papers search → resolve the picked work (server-authoritative host/tier) →
  // add it as a new source node (root, or a child of the current node).
  async function addSourceFromSearch(platform: SourcePlatform, externalId: string): Promise<void> {
    try {
      const res = await fetch('/api/discovery/sources/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, externalId }),
      })
      if (!res.ok) return
      const resolved = (await res.json()) as ResolvedSource
      addSourceNode(resolved)
    } catch {
      // Non-fatal — the student can retry.
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

  // ── Final research topic (stored on the team) ──────────────────────────────
  const [finalTopic, setFinalTopic] = useState<string | null>(null)
  // False-prompt fix: without this, the topic bar's "Choose your final research
  // topic" CTA renders for the ~1s the /api/discovery/topic fetch is in flight,
  // even for a team that already has a topic set.
  const [topicLoaded, setTopicLoaded] = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)
  // Confirmation modal state
  const [topicConfirm, setTopicConfirm] = useState<{
    newTopic: string
    paperCount: number
  } | null>(null)
  const [topicWipeResult, setTopicWipeResult] = useState<{
    removedCount: number
    removedTitles: string[]
  } | null>(null)

  useEffect(() => {
    fetch('/api/discovery/topic')
      .then((r) => r.json())
      .then((d) => setFinalTopic(d.topic ?? null))
      .catch(() => {})
      .finally(() => setTopicLoaded(true))
  }, [])

  // ── Team interests (#2 Activate TopicInterest) ─────────────────────────────
  const [interests, setInterests] = useState<Interest[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  // Documented seam for Feature A's Papers tab: seeding an interest sets this to
  // the phrase so the Papers search box can prefill from it, then clear it. Unused
  // if the Papers tab doesn't read it — no runtime dependency.
  const [pendingSourceSearch, setPendingSourceSearch] = useState<string | null>(null)
  // Toast surfaced when a locked topic connects to seeded interests.
  const [interestConnectMsg, setInterestConnectMsg] = useState<string | null>(null)
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

  useEffect(() => {
    fetch('/api/discovery/interests')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.interests)) setInterests(d.interests)
        setCurrentUserId(d.currentUserId ?? null)
      })
      .catch(() => {})
  }, [])

  // Auto-dismiss the interest-connection toast.
  useEffect(() => {
    if (!interestConnectMsg) return
    const t = setTimeout(() => setInterestConnectMsg(null), 5000)
    return () => clearTimeout(t)
  }, [interestConnectMsg])

  // Auto-dismiss the promote toast (#13).
  useEffect(() => {
    if (!promoteMsg) return
    const t = setTimeout(() => setPromoteMsg(null), 4000)
    return () => clearTimeout(t)
  }, [promoteMsg])

  // Auto-dismiss the "New tree" hint pill (#11). The persistent "NEW TREE
  // PENDING" badge on the button itself is the source of truth for the
  // pending state — this pill is just a one-time nudge.
  useEffect(() => {
    if (!newTreeHint) return
    const t = setTimeout(() => setNewTreeHint(false), 4000)
    return () => clearTimeout(t)
  }, [newTreeHint])

  async function addInterest(text: string) {
    try {
      const res = await fetch('/api/discovery/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const d = await res.json()
      if (d.interest) {
        // Idempotent add: skip if the row is already in local state.
        setInterests((prev) => (prev.some((i) => i.id === d.interest.id) ? prev : [...prev, d.interest]))
      }
    } catch (err) {
      console.error('[discovery] add interest failed:', err)
    }
  }

  async function removeInterest(id: string) {
    const prev = interests
    setInterests((cur) => cur.filter((i) => i.id !== id)) // optimistic
    try {
      const res = await fetch('/api/discovery/interests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.deleted === 0) setInterests(prev) // roll back if not owned
    } catch (err) {
      console.error('[discovery] remove interest failed:', err)
      setInterests(prev)
    }
  }

  // One-tap start from an interest chip: seed a Wikipedia root (the chip text IS
  // the query — no AI), open the explorer, and expose the phrase to the Papers tab.
  function seedFromInterest(text: string) {
    startExploration(text)
    setPendingSourceSearch(text)
    setShowHome(false)
  }

  async function saveTopic(topic: string, confirmWipe = false) {
    setSavingTopic(true)
    try {
      const res = await fetch('/api/discovery/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, confirmWipe }),
      })
      const d = await res.json()
      if (res.status === 409 && d.requiresConfirmation) {
        // Server says papers exist — ask the user to confirm before wiping
        setTopicConfirm({ newTopic: topic, paperCount: d.paperCount })
        return
      }
      setFinalTopic(d.topic ?? null)
      setEditingTopic(false)
      setTopicConfirm(null)
      if (d.removedCount > 0) {
        setTopicWipeResult({ removedCount: d.removedCount, removedTitles: d.removedTitles })
      }
      // One-time "Topic Locked" bonus (#1) — tick up when the server grants it.
      if (typeof d.topicBonusKp === 'number') showKp(d.topicBonusKp)
      // Topic ↔ interest overlap (#2): surface which seeded interests connect.
      if (Array.isArray(d.connections)) {
        const hits = d.connections.filter((c: { connected?: boolean }) => c.connected)
        if (hits.length > 0) {
          const phrases = hits.slice(0, 3).map((c: { text: string }) => c.text)
          setInterestConnectMsg(
            `Connected to your ${phrases.length === 1 ? 'interest' : 'interests'}: ${phrases.join(', ')}`,
          )
        }
      }
    } catch (err) {
      console.error('[discovery] save topic failed:', err)
    } finally {
      setSavingTopic(false)
    }
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
  const [sourceLanes, setSourceLanes] = useState<SourceLanes | null>(null)
  const [lanesLoading, setLanesLoading] = useState(false)
  const currentIsSource = currentNode?.source === 'source'

  // Clear the pending Papers-tab seed once the Papers search box has mounted with
  // it (PapersSearch reads defaultQuery only on mount), so it isn't re-applied.
  useEffect(() => {
    if (pendingSourceSearch && discoverySource === 'source' && !currentIsSource) {
      const t = setTimeout(() => setPendingSourceSearch(null), 0)
      return () => clearTimeout(t)
    }
  }, [discoverySource, currentIsSource, pendingSourceSearch])

  useEffect(() => {
    if (!currentNode || currentNode.source !== 'source') {
      setSourceLanes(null)
      return
    }
    const nodeId = currentNode.id
    let cancelled = false
    setLanesLoading(true)
    setSourceLanes(null)
    fetch(`/api/discovery/sources/${nodeId}/citations`)
      .then((r) => (r.ok ? r.json() : { lanes: null }))
      .then((data: { lanes: SourceLanes | null }) => {
        if (!cancelled) setSourceLanes(data.lanes)
      })
      .catch(() => {
        if (!cancelled) setSourceLanes(null)
      })
      .finally(() => {
        if (!cancelled) setLanesLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId])

  // Flatten the lanes into a laneId → chip lookup so the branch panel can render
  // the selected chips (pendingLinks holds laneIds for source nodes) and resolve
  // them on "Branch into N".
  const chipsById = useMemo(() => {
    const map = new Map<string, SourceChip>()
    if (sourceLanes) {
      for (const lane of Object.values(sourceLanes)) {
        for (const chip of lane) map.set(chip.laneId, chip)
      }
    }
    return map
  }, [sourceLanes])

  // ── Home screen state — true on every fresh mount ──────────────────────────
  const [showHome, setShowHome] = useState(true)

  // ── Resizable panel ────────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: panelWidth }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [panelWidth],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = dragRef.current.startX - e.clientX
      setPanelWidth(Math.min(MAX_PANEL, Math.max(MIN_PANEL, dragRef.current.startWidth + dx)))
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── Shared modals (rendered over whichever screen is active) ────────────────

  const modals = (
    <>
      {dialog}
      {/* "+N KP" earned pill (first-visit / reflection / topic-lock awards) */}
      {kpPill && (
        <div
          key={kpPill.nonce}
          className="pointer-events-none absolute top-4 left-1/2 z-[60] -translate-x-1/2 rounded-sm border border-[#F5C518]/50 bg-[#F5C518]/15 px-4 py-2 font-pixel text-[9px] text-[#F5C518] shadow-lg"
        >
          +{kpPill.amount} KP
        </div>
      )}
      {/* Topic-change confirmation — the confirmed path is a batch LLM sweep
          re-checking every source's relevance against the new topic, so once
          submitted it shows a Vega labeled loader instead of a button-sized spinner. */}
      {topicConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            {savingTopic ? (
              <LabeledLoader
                label="Vega is re-checking your papers…"
                sublabel="This can take up to 30 seconds."
                tone="vega"
                fill="inline"
              />
            ) : (
              <>
                <h3 className="font-pixel text-[9px] text-white">Change research topic?</h3>
                <div className="text-[13px] text-white/70 leading-relaxed flex flex-col gap-2">
                  <p>
                    You&apos;re changing your topic to{' '}
                    <span className="text-[#F5C518] font-medium">&ldquo;{topicConfirm.newTopic}&rdquo;</span>.
                  </p>
                  <p>
                    You have{' '}
                    <span className="text-white font-medium">{topicConfirm.paperCount} source{topicConfirm.paperCount !== 1 ? 's' : ''}</span>{' '}
                    in your literature review. Sources that aren&apos;t relevant to your new topic will be removed. Sources that apply to both topics will be kept.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setTopicConfirm(null)}
                    className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 hover:border-white/40 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveTopic(topicConfirm.newTopic, true)}
                    className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    Change topic
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Wipe result notification */}
      {topicWipeResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border border-orange-500/40 rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3">
          <span className="text-orange-400 text-base shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-[8px] text-orange-300">
              {topicWipeResult.removedCount} source{topicWipeResult.removedCount !== 1 ? 's' : ''} removed
            </p>
            {topicWipeResult.removedTitles.length > 0 && (
              <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                {topicWipeResult.removedTitles.slice(0, 3).join(', ')}
                {topicWipeResult.removedTitles.length > 3 && ` and ${topicWipeResult.removedTitles.length - 3} more`}
              </p>
            )}
          </div>
          <button
            onClick={() => setTopicWipeResult(null)}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Promote-to-Literature-Review result (#13) */}
      {promoteMsg && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3 ${
            promoteMsg.ok ? 'border-green-500/40' : 'border-red-500/40'
          }`}
        >
          <span className={`text-base shrink-0 ${promoteMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {promoteMsg.ok ? '✓' : '⚠'}
          </span>
          <p className="flex-1 min-w-0 text-[12px] text-white/80 leading-relaxed">{promoteMsg.text}</p>
          <button
            onClick={() => setPromoteMsg(null)}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* #11: "New tree" transient hint pill — bottom-center like the topic-connection
          toast below, clear of the source-toggle header bar (it used to sit top-4 and
          covered the Wiki/YouTube/Papers/Discovery Tree buttons). */}
      {newTreeHint && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-[60] -translate-x-1/2 rounded-sm border border-[#F5C518]/50 bg-[#F5C518]/15 px-4 py-2 font-pixel text-[8px] text-[#F5C518] shadow-lg">
          Next source you open starts a new tree
        </div>
      )}

      {/* Topic ↔ interest connection (#2) — local overlap, no LLM */}
      {interestConnectMsg && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border border-[#F5C518]/40 rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3">
          <span className="text-[#F5C518] text-base shrink-0">★</span>
          <p className="flex-1 min-w-0 text-[12px] text-white/80 leading-relaxed">{interestConnectMsg}</p>
          <button
            onClick={() => setInterestConnectMsg(null)}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )

  // ── Home screen ─────────────────────────────────────────────────────────────
  if (showHome) {
    return (
      <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white">
        {modals}
        {/* Minimal top bar on home */}
        <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4 shrink-0">
          <span className="font-pixel text-[10px] text-white">🔭 Discovery</span>
        </header>

        {!hydrated ? (
          // Hydration gate: without this, "🚀 Start Exploring" (hasExisting=false)
          // flashes for a returning user with a real tree, and starred/interests
          // sections render empty — the audit's "masquerades as the new-user empty
          // state" bug. Skeleton chips/cards instead of the real (still-loading) data.
          <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-6" data-testid="discovery-home-skeleton">
            <div className="text-center flex flex-col items-center gap-3">
              <PixelSkeleton variant="pill" h="h-10" w="w-10" />
              <PixelSkeleton variant="line" h="h-4" w="w-40" />
            </div>
            <PixelSkeleton variant="box" h="h-24" w="w-full" />
            <div className="flex flex-wrap gap-2">
              <PixelSkeleton variant="pill" h="h-7" w="w-24" />
              <PixelSkeleton variant="pill" h="h-7" w="w-28" />
              <PixelSkeleton variant="pill" h="h-7" w="w-20" />
            </div>
            <PixelSkeleton variant="box" h="h-12" w="w-full" />
          </div>
        ) : loadError ? (
          // A failed hydrate must never render the first-run home — a returning
          // team on flaky wifi would think their tree is gone (BLK-7).
          <div className="max-w-md mx-auto w-full px-6 py-16 flex flex-col items-center gap-4 text-center">
            <p className="font-pixel text-[9px] text-red-300">
              Couldn&apos;t load your discovery tree — check your connection.
            </p>
            <button
              onClick={() => void hydrate()}
              className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <DiscoveryHome
            starredNodes={starredNodes}
            hasExisting={nodes.length > 0}
            finalTopic={finalTopic}
            onSetFinalTopic={saveTopic}
            onContinue={() => setShowHome(false)}
            onOpenStarred={(nodeId) => {
              navigateToNode(nodeId)
              setShowHome(false)
            }}
            interests={interests}
            currentUserId={currentUserId}
            onAddInterest={addInterest}
            onRemoveInterest={removeInterest}
            onSeedInterest={seedFromInterest}
          />
        )}
      </div>
    )
  }

  // ── Main explorer layout (handles the empty case too: search a Wikipedia
  //    topic, or toggle to YouTube and paste a link) ──────────────────────────
  return (
    <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white">
      {modals}

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <button
          onClick={() => setShowHome(true)}
          title="Back to Discovery Home"
          className="flex items-center gap-1 font-pixel text-[8px] text-white/50 hover:text-white/90 transition-colors shrink-0 border border-white/15 rounded-sm px-2.5 py-1.5"
        >
          ← Back
        </button>

        <TopicSearch
          onSelect={startExploration}
          placeholder="Search another starting topic…"
          className="flex-1 max-w-xs"
        />

        {/* Source toggle: Wikipedia reader ⇄ YouTube viewer ⇄ Papers ⇄ #11 full-window tree */}
        <div className="flex items-center rounded-sm border border-white/15 overflow-hidden shrink-0">
          <button
            onClick={() => { setDiscoverySource('wikipedia'); setView('explore') }}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              view === 'explore' && discoverySource === 'wikipedia' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            📄 Wiki
          </button>
          <button
            onClick={() => { setDiscoverySource('youtube'); setView('explore') }}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              view === 'explore' && discoverySource === 'youtube' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            ▶ YouTube
          </button>
          <button
            onClick={() => { setDiscoverySource('source'); setView('explore') }}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              view === 'explore' && discoverySource === 'source' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            📄 Papers
          </button>
          <button
            onClick={() => setView('tree')}
            data-testid="tree-tab"
            aria-label="Discovery Tree tab"
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              view === 'tree' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            🌳 Discovery Tree
          </button>
        </div>

        {starredNodes.length > 0 && (
          <span className="font-pixel text-[7px] text-white/40 hidden sm:block">
            <span className="text-[#F5C518]">★</span> {starredNodes.length} starred
          </span>
        )}

        {/* ── #11: "New tree" — the next opened/added source starts a fresh root ── */}
        <button
          onClick={() => {
            startNewTree()
            setView('explore')
            setNewTreeHint(true)
          }}
          data-testid="new-tree-btn"
          aria-label="Start a new tree"
          className={`font-pixel text-[7px] px-2.5 py-1.5 rounded-sm border transition-colors shrink-0 ${
            newTreePending
              ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
              : 'border-[#F5C518]/40 text-[#F5C518]/70 hover:border-[#F5C518] hover:text-[#F5C518]'
          }`}
        >
          {newTreePending ? '● NEW TREE PENDING' : '➕ New tree'}
        </button>

        <button
          onClick={async () => {
            if (await confirm({ title: 'Start over', message: 'Start over? This will clear your discovery tree.', confirmLabel: 'Start over', tone: 'danger' })) reset()
          }}
          className="ml-auto font-pixel text-[7px] text-white/35 hover:text-red-400 transition-colors"
        >
          Start over
        </button>
      </header>

      {/* ── Final topic bar ── */}
      <div className="border-b border-[#F5C518]/20 bg-[#F5C518]/[0.06] px-4 py-2.5 shrink-0">
        {editingTopic ? (
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">🎯</span>
            <input
              autoFocus
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && topicDraft.trim()) saveTopic(topicDraft.trim())
                if (e.key === 'Escape') setEditingTopic(false)
              }}
              placeholder="State your final research topic…"
              className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 rounded-sm px-2.5 py-1.5 outline-none focus:border-[#F5C518]/60"
            />
            <BusyButton
              busy={savingTopic}
              busyLabel="Saving…"
              showSpinner={false}
              onClick={() => topicDraft.trim() && saveTopic(topicDraft.trim())}
              disabled={!topicDraft.trim()}
              className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] rounded-sm px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              Save
            </BusyButton>
            <button onClick={() => setEditingTopic(false)} className="font-pixel text-[7px] text-white/40 hover:text-white/70">
              Cancel
            </button>
          </div>
        ) : finalTopic ? (
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">🎯</span>
            <span className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest shrink-0">Final topic</span>
            <span className="text-sm text-white/90 flex-1 truncate">{finalTopic}</span>
            <button
              onClick={() => { setTopicDraft(finalTopic); setEditingTopic(true) }}
              className="font-pixel text-[7px] text-white/40 hover:text-white/70 shrink-0"
            >
              Change
            </button>
          </div>
        ) : !topicLoaded ? (
          // False-prompt fix: don't show "Choose your final research topic"
          // until the /api/discovery/topic fetch actually resolves null.
          <PixelSkeleton variant="line" h="h-4" w="w-56" />
        ) : (
          <button
            onClick={() => { setTopicDraft(currentNode?.title ?? ''); setEditingTopic(true) }}
            className="flex items-center gap-2 font-pixel text-[8px] text-[#F5C518]/80 hover:text-[#F5C518] transition-colors"
          >
            <span className="text-sm">🎯</span>
            Choose your final research topic
          </button>
        )}
      </div>

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
              <DiscoveryTree
                nodes={nodes}
                currentNodeId={currentNodeId}
                onNavigate={navigateToNode}
                onDelete={async (nodeId) => {
                  const target = nodes.find((n) => n.id === nodeId)
                  const ok = await confirm({
                    title: 'Delete node',
                    message: `Delete “${target?.title ?? 'this node'}” and all of its children? This can’t be undone.`,
                    confirmLabel: 'Delete',
                    tone: 'danger',
                  })
                  if (ok) deleteSubtree(nodeId)
                }}
                onToggleStar={toggleStar}
                onPromote={handlePromote}
                onSetInterest={setInterest}
                promotingId={promotingId}
              />
            </div>
          </div>
          <div className="w-[320px] shrink-0 overflow-hidden">
            <DiscoveryTopicList nodes={nodes} currentNodeId={currentNodeId} onNavigate={navigateToNode} />
          </div>
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Wikipedia reader, YouTube viewer, or Papers (search/reader) ── */}
        <div className="flex-1 overflow-y-auto min-w-0 border-r border-white/10">
          {discoverySource === 'source' ? (
            <div className="h-full">
              {/* Search list stays mounted (hidden beneath the reader) so returning
                  via "← Results" preserves the query + results the student browsed. */}
              <div className={papersView === 'reader' && currentIsSource ? 'hidden' : 'h-full'}>
                <PapersSearch
                  // A one-tap interest seed (#2) prefills the Papers search box; it
                  // takes priority over the topic default, then clears.
                  defaultQuery={pendingSourceSearch ?? finalTopic ?? ''}
                  onPick={addSourceFromSearch}
                />
              </div>
              {papersView === 'reader' && currentIsSource && (
                <SourceReader
                  node={currentNode}
                  lanes={sourceLanes}
                  lanesLoading={lanesLoading}
                  pendingLinks={pendingLinks}
                  onChipToggle={togglePendingLink}
                  onStar={() => currentNode && toggleStar(currentNode.id)}
                  onSaveReflection={saveReflection}
                  onBack={() => setPapersView('search')}
                />
              )}
            </div>
          ) : discoverySource === 'youtube' ? (
            <YouTubeViewer
              videoId={currentNode?.source === 'youtube' ? currentNode.videoId : undefined}
              title={currentNode?.source === 'youtube' ? currentNode.title : undefined}
              onAddUrl={addVideoFromUrl}
            />
          ) : (
            <WikiReader
              title={currentNode?.source === 'wikipedia' ? currentNode.title : ''}
              pendingLinks={pendingLinks}
              starred={currentNode?.starred ?? false}
              onLinkToggle={togglePendingLink}
              onStar={() => currentNode && toggleStar(currentNode.id)}
            />
          )}
        </div>

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
        <aside className="shrink-0 flex flex-col border-l border-white/10 overflow-hidden" style={{ width: panelWidth }}>

          {/* Tree visualization */}
          <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
            <p className="font-pixel text-[7px] uppercase tracking-widest text-white/40 px-2 mb-2 shrink-0">
              Discovery Tree
            </p>
            <div className="flex-1 min-h-0">
              <DiscoveryTree
                nodes={nodes}
                currentNodeId={currentNodeId}
                onNavigate={navigateToNode}
                onDelete={async (nodeId) => {
                  const target = nodes.find((n) => n.id === nodeId)
                  const ok = await confirm({
                    title: 'Delete node',
                    message: `Delete “${target?.title ?? 'this node'}” and all of its children? This can’t be undone.`,
                    confirmLabel: 'Delete',
                    tone: 'danger',
                  })
                  if (ok) deleteSubtree(nodeId)
                }}
                onToggleStar={toggleStar}
                onPromote={handlePromote}
                onSetInterest={setInterest}
                promotingId={promotingId}
              />
            </div>
          </div>

          {/* ── Starred topics mini-list (only when there are starred nodes) ── */}
          {starredNodes.length > 0 && (
            <div className="border-t border-white/10 shrink-0 bg-[#F5C518]/[0.04]">
              <div className="px-3 py-2">
                <p className="font-pixel text-[7px] uppercase tracking-widest text-[#F5C518]/70 mb-1.5">
                  ★ Starred
                </p>
                <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                  {starredNodes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => navigateToNode(n.id)}
                      className={`text-left text-xs px-2 py-1.5 rounded-sm transition-colors truncate ${
                        n.id === currentNodeId
                          ? 'bg-[#F5C518]/15 text-[#F5C518]'
                          : 'hover:bg-[#F5C518]/10 text-white/70'
                      }`}
                    >
                      ★ {n.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Branch selection panel (source / Wikipedia; YouTube branches by paste) ── */}
          {discoverySource === 'source' ? (
            <div className="border-t border-white/10 p-4 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-pixel text-[7px] uppercase tracking-widest text-white/40">
                  Branch selections
                </p>
                <span className={`font-pixel text-[8px] tabular-nums ${pendingLinks.length === 2 ? 'text-[#F5C518]' : 'text-white/40'}`}>
                  {pendingLinks.length} / 2
                </span>
              </div>

              {[0, 1].map((i) => {
                const chip = pendingLinks[i] ? chipsById.get(pendingLinks[i]) : undefined
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors ${
                      pendingLinks[i]
                        ? 'border-[#F5C518]/40 bg-[#F5C518]/5'
                        : 'border-dashed border-white/15 bg-white/[0.02] text-white/40'
                    }`}
                  >
                    <span className={`shrink-0 text-base ${pendingLinks[i] ? 'text-[#F5C518]' : 'text-white/30'}`}>
                      {pendingLinks[i] ? '✓' : '○'}
                    </span>
                    <span className="truncate flex-1 text-xs text-white/80">
                      {pendingLinks[i]
                        ? chip?.title ?? pendingLinks[i]
                        : <span className="italic text-white/30">pick a citation below</span>}
                    </span>
                    {pendingLinks[i] && (
                      <button
                        onClick={() => togglePendingLink(pendingLinks[i])}
                        className="ml-auto shrink-0 text-white/40 hover:text-red-400 transition-colors leading-none"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}

              {!currentIsSource ? (
                <p className="font-pixel text-[7px] text-white/40 leading-loose">
                  📄 Open a paper, then pick up to 2 of its citations to branch.
                </p>
              ) : (
                <BusyButton
                  busy={branching}
                  busyLabel="Branching…"
                  onClick={() => {
                    const chips = pendingLinks
                      .map((id) => chipsById.get(id))
                      .filter((c): c is SourceChip => !!c)
                    handleBranchSources(chips)
                  }}
                  disabled={pendingLinks.length === 0}
                  className="w-full rounded-sm py-2.5 font-pixel text-[8px] transition-all
                    bg-[#F5C518] text-[#0d1b2e]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {pendingLinks.length === 0
                    ? 'Select citations to branch'
                    : `Branch into ${pendingLinks.length === 1 ? '1 source' : '2 sources'} →`}
                </BusyButton>
              )}
            </div>
          ) : discoverySource === 'youtube' ? (
            <div className="border-t border-white/10 p-4 shrink-0">
              <p className="font-pixel text-[7px] text-white/40 leading-loose">
                ▶ Paste a YouTube link in the player to branch from the current node.
              </p>
            </div>
          ) : (
          <div className="border-t border-white/10 p-4 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-pixel text-[7px] uppercase tracking-widest text-white/40">
                Branch selections
              </p>
              <span className={`font-pixel text-[8px] tabular-nums ${pendingLinks.length === 2 ? 'text-[#F5C518]' : 'text-white/40'}`}>
                {pendingLinks.length} / 2
              </span>
            </div>

            {[0, 1].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors ${
                  pendingLinks[i]
                    ? 'border-[#F5C518]/40 bg-[#F5C518]/5'
                    : 'border-dashed border-white/15 bg-white/[0.02] text-white/40'
                }`}
              >
                <span className={`shrink-0 text-base ${pendingLinks[i] ? 'text-[#F5C518]' : 'text-white/30'}`}>
                  {pendingLinks[i] ? '✓' : '○'}
                </span>
                <span className="truncate flex-1 text-xs text-white/80">
                  {pendingLinks[i] ?? <span className="italic text-white/30">click a link in the article</span>}
                </span>
                {pendingLinks[i] && (
                  <button
                    onClick={() => togglePendingLink(pendingLinks[i])}
                    className="ml-auto shrink-0 text-white/40 hover:text-red-400 transition-colors leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={branchAndContinue}
              disabled={pendingLinks.length === 0}
              className="w-full rounded-sm py-2.5 font-pixel text-[8px] transition-all
                bg-[#F5C518] text-[#0d1b2e]
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:brightness-110 active:scale-[0.98]"
            >
              {pendingLinks.length === 0
                ? 'Select links to branch'
                : `Branch into ${pendingLinks.length === 1 ? '1 article' : '2 articles'} →`}
            </button>
          </div>
          )}
        </aside>
      </div>
      )}
    </div>
  )
}

export default DiscoveryFeature
