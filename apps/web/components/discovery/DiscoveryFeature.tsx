'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { TopicSearch } from '@/components/discovery/TopicSearch'
import { WikiReader } from '@/components/discovery/WikiReader'
import { YouTubeViewer } from '@/components/discovery/YouTubeViewer'
import { DiscoveryTree } from '@/components/discovery/DiscoveryTree'
import { DiscoveryHome } from '@/components/discovery/DiscoveryHome'
import type { DiscoverySource } from '@/stores/discoveryStore'

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
    hydrate,
    startExploration,
    addYouTubeVideo,
    navigateToNode,
    togglePendingLink,
    branchAndContinue,
    toggleStar,
    deleteSubtree,
    reset,
  } = useDiscoveryStore()

  // Which source the left pane shows: the Wikipedia reader or the YouTube viewer.
  const [discoverySource, setDiscoverySource] = useState<DiscoverySource>('wikipedia')

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

  // Load the persisted tree from the database on mount.
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // ── Final research topic (stored on the team) ──────────────────────────────
  const [finalTopic, setFinalTopic] = useState<string | null>(null)
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
  }, [])

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
    } catch (err) {
      console.error('[discovery] save topic failed:', err)
    } finally {
      setSavingTopic(false)
    }
  }

  const currentNode = nodes.find((n) => n.id === currentNodeId) ?? null
  const starredNodes = nodes.filter((n) => n.starred)

  // Navigating to a node switches the left pane to match its source.
  useEffect(() => {
    if (currentNode) setDiscoverySource(currentNode.source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId])

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
      {/* Topic-change confirmation */}
      {topicConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
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
                disabled={savingTopic}
                onClick={() => saveTopic(topicConfirm.newTopic, true)}
                className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {savingTopic ? 'Updating…' : 'Change topic'}
              </button>
            </div>
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

        {/* Source toggle: Wikipedia reader ⇄ YouTube viewer */}
        <div className="flex items-center rounded-sm border border-white/15 overflow-hidden shrink-0">
          <button
            onClick={() => setDiscoverySource('wikipedia')}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              discoverySource === 'wikipedia' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            📄 Wiki
          </button>
          <button
            onClick={() => setDiscoverySource('youtube')}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              discoverySource === 'youtube' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            ▶ YouTube
          </button>
        </div>

        {starredNodes.length > 0 && (
          <span className="font-pixel text-[7px] text-white/40 hidden sm:block">
            <span className="text-[#F5C518]">★</span> {starredNodes.length} starred
          </span>
        )}

        <button
          onClick={() => {
            if (confirm('Start over? This will clear your discovery tree.')) reset()
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
            <button
              onClick={() => topicDraft.trim() && saveTopic(topicDraft.trim())}
              disabled={!topicDraft.trim() || savingTopic}
              className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] rounded-sm px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {savingTopic ? 'Saving…' : 'Save'}
            </button>
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
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Wikipedia reader or YouTube viewer ── */}
        <div className="flex-1 overflow-y-auto min-w-0 border-r border-white/10">
          {discoverySource === 'youtube' ? (
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
                onDelete={deleteSubtree}
                onToggleStar={toggleStar}
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

          {/* ── Branch selection panel (Wikipedia only — YouTube branches by paste) ── */}
          {discoverySource === 'youtube' ? (
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
    </div>
  )
}

export default DiscoveryFeature
