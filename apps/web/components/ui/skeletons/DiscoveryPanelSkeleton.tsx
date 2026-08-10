import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Mirrors `DiscoveryHome`'s real first paint, block for block, so the panel does
 * not reflow when the data lands.
 *
 * The measurements are taken from the component itself, not guessed:
 *   wrapper   max-w-2xl · px-6 · py-10 · space-y-8   (DiscoveryHome:159)
 *   hero      text-5xl emoji + mb-2, 14px title, 8px blurb  (:162-167)
 *   accordion space-y-2, 4 rows, each px-5 py-4 on 9px text (:220-232, ITEMS = 4)
 *   interests bordered card, px-5 py-4                       (:261)
 *   CTA       full-width button, py-3.5 on 9px text          (:317)
 *
 * Anything conditional (the final-topic card, starred topics) is deliberately
 * absent: a new lab has neither, and drawing a placeholder for something that
 * usually is not there is the mismatch this file exists to remove.
 */
/**
 * The body alone, for `DiscoveryHomeScreen`'s hydration gate — that screen draws
 * the real header itself and only the body is pending. Sharing this with the
 * chunk-load skeleton above is the point: the panel must not change shape
 * between "chunk loading" and "data loading" and then again on real content.
 */
export function DiscoveryPanelSkeletonBody() {
  return (
    <div className="h-full overflow-y-auto" data-testid="discovery-home-skeleton">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Hero — 48px glyph, title, two-line blurb. */}
        <div className="flex flex-col items-center gap-3">
          <PixelSkeleton variant="box" h="h-12" w="w-12" />
          <PixelSkeleton variant="line" h="h-3.5" w="w-44" />
          <div className="flex flex-col items-center gap-1.5">
            <PixelSkeleton variant="line" h="h-2" w="w-64" />
            <PixelSkeleton variant="line" h="h-2" w="w-56" />
            <PixelSkeleton variant="line" h="h-2" w="w-40" />
          </div>
        </div>

        {/* Accordion — exactly the four collapsed rows ITEMS renders. */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-[50px]" w="w-full" />
          ))}
        </div>

        {/* Team interests card — heading, blurb, input row. */}
        <div className="rounded-sm border border-white/10 bg-white/[0.02] px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <PixelSkeleton variant="line" h="h-2" w="w-32" />
            <PixelSkeleton variant="line" h="h-2" w="w-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <PixelSkeleton variant="line" h="h-2.5" w="w-full" />
            <PixelSkeleton variant="line" h="h-2.5" w="w-5/6" />
            <PixelSkeleton variant="line" h="h-2.5" w="w-1/2" />
          </div>
          <div className="flex flex-wrap gap-2">
            <PixelSkeleton variant="pill" h="h-8" w="w-24" />
            <PixelSkeleton variant="pill" h="h-8" w="w-28" />
            <PixelSkeleton variant="pill" h="h-8" w="w-20" />
          </div>
          <div className="flex gap-2">
            <PixelSkeleton variant="box" h="h-9" w="w-full" />
            <PixelSkeleton variant="box" h="h-9" w="w-16" />
          </div>
        </div>

        {/* Start Exploring */}
        <PixelSkeleton variant="box" h="h-11" w="w-full" />
      </div>
    </div>
  )
}

/** Full panel: the real header bar plus the body above. */
export function DiscoveryPanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e]" data-testid="discovery-panel-skeleton">
      {/* Same bar as DiscoveryHomeScreen renders, so it never shifts. */}
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4 shrink-0">
        <PixelSkeleton variant="line" h="h-4" w="w-28" />
      </header>
      <DiscoveryPanelSkeletonBody />
    </div>
  )
}
