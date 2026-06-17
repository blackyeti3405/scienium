'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'

// ── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 152
const NODE_H = 40
const H_GAP = 14
const V_GAP = 54
const PAD = 16

interface LayoutNode extends DiscoveryNode {
  x: number
  y: number
}

// ── Tree layout ─────────────────────────────────────────────────────────────
function computeLayout(nodes: DiscoveryNode[]): LayoutNode[] {
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

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  nodes: DiscoveryNode[]
  currentNodeId: string | null
  onNavigate: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onToggleStar: (nodeId: string) => void
}

interface ContextMenu {
  nodeId: string
  nodeTitle: string
  x: number
  y: number
}

// ── Component ───────────────────────────────────────────────────────────────
export function DiscoveryTree({ nodes, currentNodeId, onNavigate, onDelete, onToggleStar }: Props) {
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
        <p className="font-pixel text-[7px] text-white/30">Search a topic above to start exploring</p>
      </div>
    )
  }

  const svgW = Math.max(...laid.map((n) => n.x + NODE_W)) + PAD
  const svgH = Math.max(...laid.map((n) => n.y + NODE_H)) + PAD

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

            // Truncate to fit the title zone (after left star, before right ✓)
            const maxChars = n.source === 'youtube' ? 12 : 15
            const truncated = n.title.length > maxChars ? n.title.slice(0, maxChars - 1) + '…' : n.title
            const label = (n.source === 'youtube' ? '▶ ' : '') + truncated

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

                {/* Title text — offset after left star */}
                <text
                  x={n.x + 22} y={n.y + 25}
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
