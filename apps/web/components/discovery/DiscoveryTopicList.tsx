'use client'

import { useMemo } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'
import { nodeTreeIndices } from '@/components/discovery/DiscoveryTree'
import { type InterestLevel, INTEREST_META } from '@/lib/discovery/interest'

// #11: same tier palette + shape cue as the tree's swatch — shared with
// DiscoveryTree.tsx via lib/discovery/interest.ts. This list only needs the
// glyph + color + label, plus the unmarked ('none') case the tree doesn't have.
type TierKey = InterestLevel | 'none'

const TIER_ORDER: TierKey[] = ['high', 'mid', 'low', 'none']

const TIER_DISPLAY: Record<TierKey, { glyph: string; color: string; label: string }> = {
  ...INTEREST_META,
  none: { glyph: '○', color: 'rgba(255,255,255,0.4)', label: 'Unmarked' },
}

interface Props {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  onNavigate: (id: string) => void
}

interface Row {
  node: DiscoveryNode
  treeIndex: number
}

/**
 * #11: the right-side panel of the full-window Discovery Tree view. Groups
 * EVERY topic across every tree color-major then tree-minor: all green (high)
 * from tree 1, then tree 2, …, down through orange, red, and finally the
 * unmarked remainder at the very bottom.
 */
export function DiscoveryTopicList({ nodes, currentNodeId, onNavigate }: Props) {
  const treeIndexById = useMemo(() => nodeTreeIndices(nodes), [nodes])

  const sections = useMemo(() => {
    const byTier: Record<TierKey, Row[]> = { high: [], mid: [], low: [], none: [] }
    for (const n of nodes) {
      const tier: TierKey = (n.interestLevel as InterestLevel | null | undefined) ?? 'none'
      byTier[tier].push({ node: n, treeIndex: treeIndexById.get(n.id) ?? 0 })
    }
    for (const tier of TIER_ORDER) {
      byTier[tier].sort((a, b) => a.treeIndex - b.treeIndex || a.node.addedAt - b.node.addedAt)
    }
    return TIER_ORDER.map((tier) => ({ tier, rows: byTier[tier] })).filter((s) => s.rows.length > 0)
  }, [nodes, treeIndexById])

  if (nodes.length === 0) {
    return (
      <div data-testid="topic-list" className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <span className="text-2xl">🌱</span>
        <p className="font-pixel text-[8px] text-white/50 leading-loose">
          No topics yet — open a source to grow a tree.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="topic-list" className="flex flex-col h-full overflow-y-auto bg-[#0d1b2e]">
      <p className="font-pixel text-[7px] uppercase tracking-widest text-white/40 px-3 pt-3 pb-2 shrink-0">
        All topics
      </p>
      {sections.map(({ tier, rows }) => {
        const display = TIER_DISPLAY[tier]
        // Sub-group rows (already tree-index-sorted) by tree for the faint
        // "Tree N" subheadings within each tier section.
        const byTree: { treeIndex: number; rows: Row[] }[] = []
        for (const row of rows) {
          const last = byTree[byTree.length - 1]
          if (last && last.treeIndex === row.treeIndex) last.rows.push(row)
          else byTree.push({ treeIndex: row.treeIndex, rows: [row] })
        }

        return (
          <div key={tier} data-tier={tier} className="border-t border-white/10 first:border-t-0">
            <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
              <span style={{ color: display.color }} className="text-sm leading-none" aria-hidden>
                {display.glyph}
              </span>
              <p className="font-pixel text-[7px] uppercase tracking-widest text-white/60">
                {display.label}
              </p>
            </div>
            {byTree.map(({ treeIndex, rows: treeRows }) => (
              <div key={treeIndex} className="px-3 pb-2">
                <p className="font-pixel text-[7px] text-white/40 mb-1">Tree {treeIndex + 1}</p>
                <div className="flex flex-col gap-0.5">
                  {treeRows.map(({ node }) => (
                    <button
                      key={node.id}
                      data-tree-index={treeIndex}
                      onClick={() => onNavigate(node.id)}
                      className={`text-left text-xs px-2 py-1.5 rounded-sm transition-colors truncate flex items-center gap-2 ${
                        node.id === currentNodeId
                          ? 'bg-[#F5C518]/15 text-[#F5C518]'
                          : 'hover:bg-white/5 text-white/70'
                      }`}
                    >
                      <span style={{ color: display.color }} className="shrink-0 leading-none" aria-hidden>
                        {display.glyph}
                      </span>
                      <span className="truncate">{node.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
