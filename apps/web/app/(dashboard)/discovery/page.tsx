'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { TopicSearch } from '@/components/discovery/TopicSearch'
import { WikiReader } from '@/components/discovery/WikiReader'
import { DiscoveryTree } from '@/components/discovery/DiscoveryTree'
import { DiscoveryHome } from '@/components/discovery/DiscoveryHome'

// ── Resize constraints ──────────────────────────────────────────────────────
const MIN_PANEL = 240
const MAX_PANEL = 640
const DEFAULT_PANEL = 320

export default function DiscoveryPage() {
  const {
    nodes,
    currentNodeId,
    pendingLinks,
    startExploration,
    navigateToNode,
    togglePendingLink,
    branchAndContinue,
    toggleStar,
    deleteSubtree,
    reset,
  } = useDiscoveryStore()

  const currentNode = nodes.find((n) => n.id === currentNodeId) ?? null
  const starredNodes = nodes.filter((n) => n.starred)

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

  // ── Home screen ─────────────────────────────────────────────────────────────
  if (showHome) {
    return (
      <div className="-m-6 flex flex-col" style={{ height: '100vh' }}>
        {/* Minimal top bar on home */}
        <header className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
          <span className="text-lg font-semibold">🔭 Discovery</span>
        </header>

        <DiscoveryHome
          starredNodes={starredNodes}
          hasExisting={nodes.length > 0}
          onContinue={() => setShowHome(false)}
          onOpenStarred={(nodeId) => {
            navigateToNode(nodeId)
            setShowHome(false)
          }}
        />
      </div>
    )
  }

  // ── Empty explorer state: centred search ────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <div className="-m-6 flex flex-col items-center justify-center h-screen gap-6 px-6">
        <span className="text-5xl">🔭</span>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Topic Discovery</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Type any topic to pull up its Wikipedia page. Click links to branch your exploration tree.
          </p>
        </div>
        <TopicSearch onSelect={startExploration} className="w-full max-w-md" />
        <button
          onClick={() => setShowHome(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Discovery Home
        </button>
      </div>
    )
  }

  // ── Main explorer layout ────────────────────────────────────────────────────
  return (
    <div className="-m-6 flex flex-col" style={{ height: '100vh' }}>

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
        <button
          onClick={() => setShowHome(true)}
          title="Discovery Home"
          className="text-lg font-semibold hover:opacity-70 transition-opacity shrink-0"
        >
          🔭
        </button>

        <TopicSearch
          onSelect={startExploration}
          placeholder="Search another starting topic…"
          className="flex-1 max-w-xs"
        />

        {starredNodes.length > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            <span className="text-yellow-500">★</span> {starredNodes.length} starred
          </span>
        )}

        <button
          onClick={() => {
            if (confirm('Start over? This will clear your discovery tree.')) reset()
          }}
          className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Start over
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Wikipedia reader ── */}
        <div className="flex-1 overflow-y-auto min-w-0 border-r">
          <WikiReader
            title={currentNode?.title ?? ''}
            pendingLinks={pendingLinks}
            starred={currentNode?.starred ?? false}
            onLinkToggle={togglePendingLink}
            onStar={() => currentNode && toggleStar(currentNode.id)}
          />
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={onDividerMouseDown}
          title="Drag to resize"
          className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors flex flex-col items-center justify-center gap-1 group"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          ))}
        </div>

        {/* ── Right: tree + starred + branch panel ── */}
        <aside className="shrink-0 flex flex-col border-l overflow-hidden" style={{ width: panelWidth }}>

          {/* Tree visualization */}
          <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2 shrink-0">
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
            <div className="border-t shrink-0 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-1.5">
                  ★ Starred
                </p>
                <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                  {starredNodes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => navigateToNode(n.id)}
                      className={`text-left text-xs px-2 py-1.5 rounded-md transition-colors truncate ${
                        n.id === currentNodeId
                          ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 font-medium'
                          : 'hover:bg-yellow-500/10 text-foreground'
                      }`}
                    >
                      ★ {n.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Branch selection panel ── */}
          <div className="border-t p-4 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Branch selections
              </p>
              <span className={`text-xs font-medium tabular-nums ${pendingLinks.length === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                {pendingLinks.length} / 2
              </span>
            </div>

            {[0, 1].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  pendingLinks[i]
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-dashed bg-muted/30 text-muted-foreground'
                }`}
              >
                <span className={`shrink-0 text-base ${pendingLinks[i] ? 'text-primary' : ''}`}>
                  {pendingLinks[i] ? '✓' : '○'}
                </span>
                <span className="truncate flex-1 text-xs">
                  {pendingLinks[i] ?? <span className="italic">click a link in the article</span>}
                </span>
                {pendingLinks[i] && (
                  <button
                    onClick={() => togglePendingLink(pendingLinks[i])}
                    className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors leading-none"
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
              className="w-full rounded-md py-2 text-sm font-semibold transition-all
                bg-primary text-primary-foreground
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90 active:scale-[0.98]"
            >
              {pendingLinks.length === 0
                ? 'Select links to branch'
                : `Branch into ${pendingLinks.length === 1 ? '1 article' : '2 articles'} →`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
