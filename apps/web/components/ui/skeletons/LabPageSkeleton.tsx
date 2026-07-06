import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Route-level `/lab` (and `(dashboard)` layout) fallback — the app's home
 * surface, shown on every login. Mirrors `StatusStrip` + `LabPlot` + the
 * bottom-left/bottom-right FAB rail so the scene reads as "arriving", not a
 * blank wait, while the team/currency/plot query resolves server-side.
 */
export function LabPageSkeleton() {
  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0d1b2e]"
      data-testid="lab-page-skeleton"
    >
      {/* Status strip */}
      <div className="status-strip">
        <div className="status-strip__left">
          <PixelSkeleton variant="pill" h="h-5" w="w-24" />
          <PixelSkeleton variant="line" h="h-3" w="w-16" />
        </div>
        <div className="status-strip__right">
          <PixelSkeleton variant="pill" h="h-4" w="w-12" />
          <PixelSkeleton variant="pill" h="h-4" w="w-12" />
          <PixelSkeleton variant="pill" h="h-4" w="w-12" />
          <PixelSkeleton variant="pill" h="h-4" w="w-16" />
        </div>
      </div>

      {/* Plot area — faint tile-grid pattern behind a centered placeholder cluster. */}
      <div className="relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <PixelSkeleton variant="box" h="h-32" w="w-32" className="opacity-60" />
        </div>

        {/* FAB rail — bottom-right shop/arrange, bottom-left activity/feedback. */}
        <div className="absolute bottom-[18px] right-[18px] flex items-center gap-2">
          <PixelSkeleton variant="pill" h="h-12" w="w-16" />
          <PixelSkeleton variant="pill" h="h-12" w="w-16" />
        </div>
        <div className="absolute bottom-[18px] left-[18px] flex flex-col gap-2">
          <PixelSkeleton variant="pill" h="h-12" w="w-16" />
          <PixelSkeleton variant="pill" h="h-12" w="w-16" />
        </div>
      </div>
    </div>
  )
}
