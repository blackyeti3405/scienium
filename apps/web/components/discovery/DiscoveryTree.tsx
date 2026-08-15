'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'
import { TIER_META } from '@/lib/discovery/credibility'
import { type InterestLevel, INTEREST_META, nextInterest } from '@/lib/discovery/interest'

// The layout algorithm now lives in `lib/discovery/tree-layout.ts` (REFACTOR2
// §0.7). It is a pure graph algorithm with real failure modes — it could hang
// the tab on a cyclic graph, was quadratic, and silently dropped nodes whose
// parent was missing — and none of that was reachable by a unit test while it
// sat inside a `.tsx`. Re-exported here so existing importers keep working.
export {
  computeLayout,
  nodeTreeIndices,
  NODE_W,
  NODE_H,
  PAD,
  type LayoutNode,
} from '@/lib/discovery/tree-layout'
import { computeLayout, NODE_W, NODE_H, PAD } from '@/lib/discovery/tree-layout'

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

/**
 * Make an SVG `<g>` a real button.
 *
 * Every control in this tree was `role="button"` with a click handler and no
 * `tabIndex` or key handler (REFACTOR2 §0.7: "graph buttons are pointer-only SVG
 * groups without focus/key handlers"). That is worse than leaving the role off:
 * a screen reader announces a button, and it cannot be focused or activated.
 * Delete, star, promote and interest were all unreachable without a mouse.
 *
 * `<g>` is not natively focusable, so `tabIndex` is what puts it in the tab
 * order; Enter and Space are what a button is expected to answer to.
 */
function svgButton(label: string, onActivate: () => void, enabled = true) {
  if (!enabled) return { 'aria-hidden': true as const }
  const activate = (e: { stopPropagation: () => void; preventDefault?: () => void }) => {
    e.stopPropagation()
    e.preventDefault?.()
    onActivate()
  }
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    style: { cursor: 'pointer', outlineOffset: 2 },
    onClick: activate,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') activate(e)
    },
  }
}

/** Menu box used for the viewport clamp; matches the rendered min-width/height. */
const MENU_W = 200
const MENU_H = 84

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
  // The "+ Lit Review" pill draws slightly below the node body — pad enough that
  // the bottom-most row's controls aren't clipped by the svg's own bounding box.
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
                {...svgButton(`Navigate to ${n.title}`, () => onNavigate(n.id))}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ nodeId: n.id, nodeTitle: n.title, x: e.clientX, y: e.clientY })
                }}
                className="cursor-pointer group"
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
                  {...svgButton(
                    n.starred ? `Unstar ${n.title}` : `Star ${n.title}`,
                    () => onToggleStar(n.id),
                  )}
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
                  {...svgButton(`Delete ${n.title} and all children`, () => onDelete(n.id))}
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

                {/* ── #11: interest swatch — click-to-cycle, centred on the node's
                    right edge; the tier dot and ✓ sit above and below it in the
                    same right-hand column.
                    Color + a distinct shape (accessibility: color is never the only
                    signal). unset = hollow outline ring; high/mid/low = filled
                    shape + color, both with a thin dark stroke for contrast on the
                    gold "current" node body. ── */}
                {(() => {
                  const level = n.interestLevel ?? null
                  const meta = level ? INTEREST_META[level] : null
                  const cx = n.x + NODE_W - 14
                  const cy = n.y + NODE_H / 2
                  const upcoming = nextInterest(level)
                  const upcomingLabel = upcoming
                    ? INTEREST_META[upcoming].label
                    : 'unmarked'
                  const currentLabel = meta ? meta.label : 'unmarked'
                  return (
                    <g
                      {...svgButton(
                        `Set interest for "${n.title}" (currently ${currentLabel.toLowerCase()}) — activates ${upcomingLabel.toLowerCase()}`,
                        () => onSetInterest?.(n.id, upcoming),
                        !!onSetInterest,
                      )}
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
                    cx={n.x + NODE_W - 14}
                    cy={n.y + 9}
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

                {/* Explored ✓ badge (right column, under the interest swatch) */}
                {n.explored && (
                  <text
                    x={n.x + NODE_W - 14} y={n.y + 36}
                    fontSize={10}
                    textAnchor="middle"
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
                    {...svgButton(`Promote ${n.title} to Literature Review`, () => {
                      if (!isPromotingThis) onPromote!(n.id)
                    })}
                    aria-busy={isPromotingThis}
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
          // Clamped to the viewport (REFACTOR2 §0.7: "context menu is not
          // viewport-clamped"). Opened near the right or bottom edge — which the
          // tree's horizontal scroll makes ordinary — it rendered partly
          // offscreen with its only action unreachable.
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, Math.max(8, window.innerWidth - MENU_W - 8)),
            top: Math.min(contextMenu.y, Math.max(8, window.innerHeight - MENU_H - 8)),
            zIndex: 9999,
          }}
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
