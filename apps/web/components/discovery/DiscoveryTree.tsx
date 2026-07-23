'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'
import { TIER_META } from '@/lib/discovery/credibility'
import { type InterestLevel, INTEREST_META, nextInterest } from '@/lib/discovery/interest'

// ── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 170
const NODE_H = 40
const H_GAP = 14
const V_GAP = 54
const PAD = 16

export interface LayoutNode extends DiscoveryNode {
  x: number
  y: number
}

// ── Tree layout ─────────────────────────────────────────────────────────────
// Exported so other views (the #11 full-window Discovery Tree tab, the topic
// list) can reuse the SAME multi-root layout instead of re-deriving it.
export function computeLayout(nodes: DiscoveryNode[]): LayoutNode[] {
  if (nodes.length === 0) return []

  const byId: Record<string, DiscoveryNode> = {}
  const childrenOf: Record<string, string[]> = {}
  const roots: string[] = []

  for (const n of nodes) {
    byId[n.id] = n
    if (!n.parentId) roots.push(n.id)
    else (childrenOf[n.parentId] ??= []).push(n.id)
  }

  function subtreeW(id: string): number {
    const ch = childrenOf[id] ?? []
    if (ch.length === 0) return NODE_W
    const childTotal = ch.reduce((sum, cid) => sum + subtreeW(cid) + H_GAP, -H_GAP)
    return Math.max(NODE_W, childTotal)
  }

  const result: LayoutNode[] = []

  function layout(id: string, left: number, top: number) {
    const sw = subtreeW(id)
    const cx = left + sw / 2
    result.push({ ...byId[id], x: cx - NODE_W / 2, y: top })
    const ch = childrenOf[id] ?? []
    let childLeft = left
    for (const cid of ch) {
      layout(cid, childLeft, top + NODE_H + V_GAP)
      childLeft += subtreeW(cid) + H_GAP
    }
  }

  let rootLeft = PAD
  for (const rid of roots) {
    layout(rid, rootLeft, PAD)
    rootLeft += subtreeW(rid) + H_GAP * 2
  }

  return result
}

// ── #11: which "tree" (root-derived forest) each node belongs to ────────────
// Walks `parentId` up to the root for every node, then assigns a stable 0-based
// index by root order (first-seen order in `nodes`, matching the layout's
// left-to-right root order). Used by `DiscoveryTopicList`'s color-major/
// tree-minor grouping — kept here so root-walking logic lives in one place.
export function nodeTreeIndices(nodes: DiscoveryNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const rootIndexById = new Map<string, number>()
  let nextRootIndex = 0

  function rootOf(id: string): string {
    let cur = byId.get(id)
    const seen = new Set<string>()
    while (cur?.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id)
      cur = byId.get(cur.parentId)
    }
    return cur?.id ?? id
  }

  const result = new Map<string, number>()
  for (const n of nodes) {
    const rid = rootOf(n.id)
    if (!rootIndexById.has(rid)) rootIndexById.set(rid, nextRootIndex++)
    result.set(n.id, rootIndexById.get(rid)!)
  }
  return result
}

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  onNavigate: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onToggleStar: (nodeId: string) => void
  /** #13: promote a starred, unpromoted source node into the Literature Review. */
  onPromote?: (nodeId: string) => void
  /** #11: cycle a node's interest tier (unset → high → mid → low → unset). */
  onSetInterest?: (nodeId: string, level: InterestLevel | null) => void
  /** Node id currently mid-promote — the pill shows "Promoting…" and ignores clicks. */
  promotingId?: string | null
}

interface ContextMenu {
  nodeId: string
  nodeTitle: string
  x: number
  y: number
}

// ── Component ───────────────────────────────────────────────────────────────
export function DiscoveryTree({
  nodes,
  currentNodeId,
  onNavigate,
  onDelete,
  onToggleStar,
  onPromote,
  onSetInterest,
  promotingId,
}: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  const laid = useMemo(() => computeLayout(nodes), [nodes])
  const laidById = useMemo(() => Object.fromEntries(laid.map((n) => [n.id, n])), [laid])

  // Close context menu on any outside click
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('click', close, { once: true })
    return () => document.removeEventListener('click', close)
  }, [contextMenu])

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <span className="text-3xl">🌱</span>
        <p className="font-pixel text-[8px] text-white/50 leading-loose">Your discovery tree<br/>will appear here</p>
        <p className="font-pixel text-[7px] text-white/40">Search a topic above to start exploring</p>
      </div>
    )
  }

  const svgW = Math.max(...laid.map((n) => n.x + NODE_W)) + PAD
  // #11: the interest swatch + the pre-existing "+ Lit Review" pill both draw
  // slightly below the node body — pad enough that the bottom-most row's
  // controls aren't clipped by the svg's own bounding box.
  const svgH = Math.max(...laid.map((n) => n.y + NODE_H)) + PAD + 8

  return (
    <>
      <div style={{ overflowX: 'auto', overflowY: 'auto', width: '100%', height: '100%' }}>
        <svg width={svgW} height={svgH} aria-label="Discovery tree" className="block">

          {/* ── Edges ── */}
          {laid
            .filter((n) => n.parentId && laidById[n.parentId])
            .map((n) => {
              const p = laidById[n.parentId!]
              const x1 = p.x + NODE_W / 2
              const y1 = p.y + NODE_H
              const x2 = n.x + NODE_W / 2
              const y2 = n.y
              const cy = (y1 + y2) / 2
              return (
                <path
                  key={`edge-${n.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1.5}
                />
              )
            })}

          {/* ── Nodes ── */}
          {laid.map((n) => {
            const isCurrent = n.id === currentNodeId

            // Truncate to fit the title zone (after left star, before right ✓).
            // Academic titles blow past the trunc — the full title lives in the
            // reader; the tree gets a platform prefix + a tier-colored dot.
            const isSource = n.source === 'source'
            const isArticle = n.source === 'article'
            const platformPrefix =
              n.platform === 'arxiv' ? 'arXiv: ' : n.platform === 'pubmed' ? 'PubMed: ' : '📄 '
            const maxChars = n.source === 'youtube' ? 12 : isSource || isArticle ? 10 : 15
            const truncated = n.title.length > maxChars ? n.title.slice(0, maxChars - 1) + '…' : n.title
            const label =
              (n.source === 'youtube' ? '▶ ' : isArticle ? '📰 ' : isSource ? platformPrefix : '') + truncated
            const tierColor = isSource && n.credibilityTier ? TIER_META[n.credibilityTier].color : null
            // #13: a starred, not-yet-promoted source node can be promoted to the
            // Literature Review. Wiki/YouTube + non-starred + already-promoted → no control.
            const canPromote = isSource && n.starred && !n.paperId && !!onPromote
            const isPromoted = isSource && !!n.paperId
            const isPromotingThis = promotingId === n.id

            // Colour palette (dark game theme)
            const bodyFill = isCurrent
              ? '#F5C518'
              : n.explored
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.03)'
            const bodyStroke = isCurrent ? '#F5C518' : 'rgba(255,255,255,0.18)'
            const textFill = isCurrent ? '#0d1b2e' : 'rgba(255,255,255,0.85)'
            const starFill = n.starred
              ? '#F5C518'
              : isCurrent
              ? 'rgba(13,27,46,0.45)'
              : 'rgba(255,255,255,0.4)'
            const checkFill = isCurrent
              ? 'rgba(13,27,46,0.55)'
              : 'rgba(255,255,255,0.4)'

            return (
              <g
                key={n.id}
                onClick={() => onNavigate(n.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ nodeId: n.id, nodeTitle: n.title, x: e.clientX, y: e.clientY })
                }}
                className="cursor-pointer group"
                role="button"
                aria-label={`Navigate to ${n.title}`}
              >
                {/* Hover ring */}
                <rect
                  x={n.x - 2} y={n.y - 2}
                  width={NODE_W + 4} height={NODE_H + 4} rx={8}
                  fill="transparent"
                  className="group-hover:fill-white/10 transition-colors"
                />

                {/* Node body */}
                <rect
                  x={n.x} y={n.y}
                  width={NODE_W} height={NODE_H} rx={6}
                  fill={bodyFill} stroke={bodyStroke} strokeWidth={1.5}
                />

                {/* ── Star toggle button (always visible, left side) ── */}
                <g
                  onClick={(e) => { e.stopPropagation(); onToggleStar(n.id) }}
                  style={{ cursor: 'pointer' }}
                  aria-label={n.starred ? 'Unstar' : 'Star'}
                >
                  {/* Invisible hit area for easier clicking */}
                  <rect
                    x={n.x + 2} y={n.y + 3}
                    width={18} height={NODE_H - 6} rx={3}
                    fill="transparent"
                  />
                  <text
                    x={n.x + 7} y={n.y + 26}
                    fontSize={13}
                    fill={starFill}
                    className="select-none pointer-events-none"
                  >
                    {n.starred ? '★' : '☆'}
                  </text>
                </g>

                {/* ── Delete button (always visible, next to the star) ── */}
                <g
                  onClick={(e) => { e.stopPropagation(); onDelete(n.id) }}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label={`Delete ${n.title} and all children`}
                  className={`transition-colors ${isCurrent ? 'text-[#0d1b2e] hover:text-red-700' : 'text-white/40 hover:text-red-400'}`}
                >
                  {/* Invisible hit area for easier clicking */}
                  <rect
                    x={n.x + 20} y={n.y + 3}
                    width={18} height={NODE_H - 6} rx={3}
                    fill="transparent"
                  />
                  {/* Trash-can glyph (monochrome, drawn) */}
                  <g
                    transform={`translate(${n.x + 29}, ${n.y + 21})`}
                    className="pointer-events-none"
                    stroke="currentColor"
                    fill="none"
                    strokeLinecap="round"
                  >
                    <path d="M -5 -4 H 5 M -2 -6 H 2" strokeWidth={1.4} />
                    <path d="M -4 -3 L -3.2 6 L 3.2 6 L 4 -3" strokeWidth={1.2} strokeLinejoin="round" />
                    <path d="M -1.3 -1 V 4 M 1.3 -1 V 4" strokeWidth={0.9} />
                  </g>
                </g>

                {/* ── #11: interest swatch — click-to-cycle, bottom-left corner so it
                    never overlaps the right-side tier dot / "+ Lit Review" pill / ✓.
                    Color + a distinct shape (accessibility: color is never the only
                    signal). unset = hollow outline ring; high/mid/low = filled
                    shape + color, both with a thin dark stroke for contrast on the
                    gold "current" node body. ── */}
                {(() => {
                  const level = n.interestLevel ?? null
                  const meta = level ? INTEREST_META[level] : null
                  const cx = n.x + 6
                  const cy = n.y + NODE_H + 8
                  const upcoming = nextInterest(level)
                  const upcomingLabel = upcoming
                    ? INTEREST_META[upcoming].label
                    : 'unmarked'
                  const currentLabel = meta ? meta.label : 'unmarked'
                  return (
                    <g
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetInterest?.(n.id, upcoming)
                      }}
                      style={{ cursor: onSetInterest ? 'pointer' : 'default' }}
                      role="button"
                      aria-label={`Set interest for "${n.title}" (currently ${currentLabel.toLowerCase()})`}
                      data-node-id={n.id}
                      data-interest={level ?? 'none'}
                    >
                      <title>
                        {meta ? meta.label : 'Mark interest'} — click to set {upcomingLabel.toLowerCase()}
                      </title>
                      {/* Invisible hit area — larger than the glyph for easy tapping */}
                      <circle cx={cx} cy={cy} r={9} fill="transparent" />
                      {!meta ? (
                        // unset: hollow outline ring
                        <circle
                          cx={cx} cy={cy} r={5}
                          fill="none"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth={1.3}
                        />
                      ) : meta.shape === 'circle' ? (
                        // high: filled circle ●
                        <circle
                          cx={cx} cy={cy} r={5}
                          fill={meta.color}
                          stroke="rgba(0,0,0,0.35)"
                          strokeWidth={0.75}
                        />
                      ) : meta.shape === 'triangle' ? (
                        // mid: filled triangle ▲
                        <path
                          d={`M ${cx} ${cy - 5.5} L ${cx + 5.2} ${cy + 4} L ${cx - 5.2} ${cy + 4} Z`}
                          fill={meta.color}
                          stroke="rgba(0,0,0,0.35)"
                          strokeWidth={0.75}
                        />
                      ) : (
                        // low: filled square ■
                        <rect
                          x={cx - 4.3} y={cy - 4.3}
                          width={8.6} height={8.6}
                          fill={meta.color}
                          stroke="rgba(0,0,0,0.35)"
                          strokeWidth={0.75}
                        />
                      )}
                    </g>
                  )
                })()}

                {/* Tier dot (source nodes only) — credibility at a glance */}
                {tierColor && (
                  <circle
                    cx={n.x + NODE_W - 15}
                    cy={n.y + 11}
                    r={4}
                    fill={tierColor}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={0.5}
                    className="pointer-events-none"
                  >
                    <title>{n.credibilityTier ? TIER_META[n.credibilityTier].label : ''}</title>
                  </circle>
                )}

                {/* Title text — offset after the left star + delete buttons */}
                <text
                  x={n.x + 42} y={n.y + 25}
                  fontSize={11.5}
                  fontWeight={isCurrent ? '600' : '400'}
                  fill={textFill}
                  className="select-none pointer-events-none"
                >
                  {label}
                </text>

                {/* Explored ✓ badge (right side) */}
                {n.explored && (
                  <text
                    x={n.x + NODE_W - 15} y={n.y + 26}
                    fontSize={10}
                    fill={checkFill}
                    className="select-none pointer-events-none"
                  >
                    ✓
                  </text>
                )}

                {/* ── Promote-to-Literature-Review control (#13) — starred source
                    nodes not yet promoted. A small gold pill under the node. ── */}
                {canPromote && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isPromotingThis) onPromote!(n.id)
                    }}
                    style={{ cursor: isPromotingThis ? 'default' : 'pointer' }}
                    role="button"
                    aria-busy={isPromotingThis}
                    aria-label={`Promote ${n.title} to Literature Review`}
                  >
                    <rect
                      x={n.x + NODE_W - 78} y={n.y + NODE_H - 1}
                      width={78} height={16} rx={4}
                      fill="rgba(245,197,24,0.15)"
                      stroke="#F5C518"
                      strokeWidth={1}
                      opacity={isPromotingThis ? 0.6 : 1}
                    />
                    <text
                      x={n.x + NODE_W - 39} y={n.y + NODE_H + 10}
                      fontSize={8}
                      textAnchor="middle"
                      fill="#F5C518"
                      className="select-none pointer-events-none"
                    >
                      {isPromotingThis ? 'Promoting…' : '+ Lit Review'}
                    </text>
                  </g>
                )}

                {/* Promoted marker (#13) — replaces the control once promoted. */}
                {isPromoted && (
                  <text
                    x={n.x + NODE_W - 39} y={n.y + NODE_H + 10}
                    fontSize={8}
                    textAnchor="middle"
                    fill="rgba(74,222,128,0.85)"
                    className="select-none pointer-events-none"
                    aria-label="In Literature Review"
                  >
                    ✓ In Lit Review
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Context menu ── */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1320] border border-white/15 rounded-sm shadow-xl py-1 min-w-[200px]"
        >
          <div className="px-3 py-1.5 border-b border-white/10">
            <p className="font-pixel text-[7px] text-white/40 truncate max-w-[176px]">
              {contextMenu.nodeTitle}
            </p>
          </div>
          <button
            className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 hover:bg-red-500/15 text-red-400 transition-colors"
            onClick={() => { onDelete(contextMenu.nodeId); setContextMenu(null) }}
          >
            <span aria-hidden>🗑</span>
            Delete node &amp; all children
          </button>
        </div>
      )}
    </>
  )
}
