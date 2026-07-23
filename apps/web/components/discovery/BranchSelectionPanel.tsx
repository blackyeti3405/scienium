'use client'

import type { ReactNode } from 'react'

/**
 * The "Branch selections" side-panel block: header with the N / 2 counter plus
 * the two selection slots. `DiscoveryFeature` rendered this near-identically
 * twice (Wikipedia links vs source citations); the small differences are the
 * slot label (`labelFor` — the source variant resolves laneIds to chip titles),
 * the empty-slot hint, and the action area (`children` — the branch button, or
 * the "open a paper" nudge).
 */
export function BranchSelectionPanel({
  pendingLinks,
  labelFor = (link) => link,
  emptyHint,
  onRemove,
  children,
}: {
  pendingLinks: string[]
  /** Slot label for a selected link; defaults to the link itself. */
  labelFor?: (link: string) => ReactNode
  /** Italic placeholder shown in an empty slot. */
  emptyHint: string
  onRemove: (link: string) => void
  /** Action area rendered under the slots. */
  children: ReactNode
}) {
  return (
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
          <span className={`shrink-0 text-base ${pendingLinks[i] ? 'text-[#F5C518]' : 'text-white/40'}`}>
            {pendingLinks[i] ? '✓' : '○'}
          </span>
          <span className="truncate flex-1 text-xs text-white/80">
            {pendingLinks[i]
              ? labelFor(pendingLinks[i])
              : <span className="italic text-white/40">{emptyHint}</span>}
          </span>
          {pendingLinks[i] && (
            <button
              onClick={() => onRemove(pendingLinks[i])}
              className="ml-auto shrink-0 text-white/40 hover:text-red-400 transition-colors leading-none"
              title="Remove"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {children}
    </div>
  )
}
