'use client'

import type { ComponentProps } from 'react'
import { DiscoveryTree } from '@/components/discovery/DiscoveryTree'
import { BranchSelectionPanel } from '@/components/discovery/BranchSelectionPanel'
import { BusyButton } from '@/components/ui/BusyButton'
import type { DiscoveryNode, DiscoverySource } from '@/stores/discoveryStore'
import type { SourceChip } from '@/lib/discovery/sources'

/**
 * The explorer's right-hand panel: the tree visualization, the starred
 * mini-list, and the per-source branch-selection panel. Pure presentation —
 * extracted verbatim from `DiscoveryFeature` (which still owns the resize
 * width and every handler, shared with the full-window tree view).
 */
export function ExplorerSidePanel({
  width,
  treeProps,
  starredNodes,
  currentNodeId,
  discoverySource,
  currentIsSource,
  pendingLinks,
  chipsById,
  branching,
  onNavigate,
  onTogglePendingLink,
  onBranchSources,
  onBranchAndContinue,
}: {
  width: number
  /** Shared with the full-window tree view — one props object, two mounts. */
  treeProps: ComponentProps<typeof DiscoveryTree>
  starredNodes: DiscoveryNode[]
  currentNodeId: string | null
  discoverySource: DiscoverySource
  currentIsSource: boolean
  pendingLinks: string[]
  chipsById: Map<string, SourceChip>
  branching: boolean
  onNavigate: (nodeId: string) => void
  onTogglePendingLink: (link: string) => void
  onBranchSources: (chips: SourceChip[]) => void
  onBranchAndContinue: () => void
}) {
  return (
    <aside className="shrink-0 flex flex-col border-l border-white/10 overflow-hidden" style={{ width }}>

      {/* Tree visualization */}
      <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
        <p className="font-pixel text-[7px] uppercase tracking-widest text-white/40 px-2 mb-2 shrink-0">
          Discovery Tree
        </p>
        <div className="flex-1 min-h-0">
          <DiscoveryTree {...treeProps} />
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
                  onClick={() => onNavigate(n.id)}
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
        <BranchSelectionPanel
          pendingLinks={pendingLinks}
          labelFor={(laneId) => chipsById.get(laneId)?.title ?? laneId}
          emptyHint="pick a citation below"
          onRemove={onTogglePendingLink}
        >
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
                onBranchSources(chips)
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
        </BranchSelectionPanel>
      ) : discoverySource === 'youtube' ? (
        <div className="border-t border-white/10 p-4 shrink-0">
          <p className="font-pixel text-[7px] text-white/40 leading-loose">
            ▶ Paste a YouTube link in the player to branch from the current node.
          </p>
        </div>
      ) : (
        <BranchSelectionPanel
          pendingLinks={pendingLinks}
          emptyHint="click a link in the article"
          onRemove={onTogglePendingLink}
        >
          <button
            onClick={onBranchAndContinue}
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
        </BranchSelectionPanel>
      )}
    </aside>
  )
}
