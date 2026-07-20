'use client'

import { TopicSearch } from '@/components/discovery/TopicSearch'
import type { DiscoverySource } from '@/stores/discoveryStore'

const SOURCE_TABS: [DiscoverySource, string][] = [
  ['wikipedia', '📄 Wiki'],
  ['youtube', '▶ YouTube'],
  ['source', '📄 Papers'],
  ['article', '📰 Articles'],
]

/**
 * Explorer top bar: back-to-home, the topic search box, the source toggle
 * (Wiki / YouTube / Papers / full-window tree), the starred counter, and the
 * "New tree" / "Start over" actions. Pure presentation — extracted verbatim
 * from `DiscoveryFeature`.
 */
export function DiscoveryHeader({
  view,
  discoverySource,
  starredCount,
  newTreePending,
  onBack,
  onSearchSelect,
  onSelectSource,
  onSelectTreeView,
  onNewTree,
  onStartOver,
}: {
  view: 'explore' | 'tree'
  discoverySource: DiscoverySource
  starredCount: number
  newTreePending: boolean
  onBack: () => void
  onSearchSelect: (title: string) => void
  onSelectSource: (source: DiscoverySource) => void
  onSelectTreeView: () => void
  onNewTree: () => void
  onStartOver: () => void
}) {
  return (
    <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
      <button
        onClick={onBack}
        title="Back to Discovery Home"
        className="flex items-center gap-1 font-pixel text-[8px] text-white/50 hover:text-white/90 transition-colors shrink-0 border border-white/15 rounded-sm px-2.5 py-1.5"
      >
        ← Back
      </button>

      <TopicSearch
        onSelect={onSearchSelect}
        placeholder="Search another starting topic…"
        className="flex-1 max-w-xs"
      />

      {/* Source toggle: Wikipedia reader ⇄ YouTube viewer ⇄ Papers ⇄ #11 full-window tree */}
      <div className="flex items-center rounded-sm border border-white/15 overflow-hidden shrink-0">
        {SOURCE_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onSelectSource(key)}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              view === 'explore' && discoverySource === key ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onSelectTreeView}
          data-testid="tree-tab"
          aria-label="Discovery Tree tab"
          className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
            view === 'tree' ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/50 hover:text-white/80'
          }`}
        >
          🌳 Discovery Tree
        </button>
      </div>

      {starredCount > 0 && (
        <span className="font-pixel text-[7px] text-white/40 hidden sm:block">
          <span className="text-[#F5C518]">★</span> {starredCount} starred
        </span>
      )}

      {/* ── #11: "New tree" — the next opened/added source starts a fresh root ── */}
      <button
        onClick={onNewTree}
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
        onClick={onStartOver}
        className="ml-auto font-pixel text-[7px] text-white/35 hover:text-red-400 transition-colors"
      >
        Start over
      </button>
    </header>
  )
}
