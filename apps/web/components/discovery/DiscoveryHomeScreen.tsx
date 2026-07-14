'use client'

import type { ComponentProps } from 'react'
import { DiscoveryHome } from '@/components/discovery/DiscoveryHome'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * The Discovery home screen body: minimal top bar plus the hydration gate
 * (skeleton → load-error retry → `DiscoveryHome`). Pure presentation —
 * extracted verbatim from `DiscoveryFeature`, which still renders the shared
 * modals over it.
 */
export function DiscoveryHomeScreen({
  hydrated,
  loadError,
  onRetry,
  homeProps,
}: {
  hydrated: boolean
  loadError: boolean
  onRetry: () => void
  homeProps: ComponentProps<typeof DiscoveryHome>
}) {
  return (
    <>
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
            onClick={onRetry}
            className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <DiscoveryHome {...homeProps} />
      )}
    </>
  )
}
