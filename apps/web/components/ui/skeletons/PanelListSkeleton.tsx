import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * N generic rows (avatar/title/meta) — for teacher queues, roster, lab side
 * panels, citations, and any other list-of-cards mount fetch with a known
 * row shape.
 */
export function PanelListSkeleton({
  rows = 4,
  className = '',
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="panel-list-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <PixelSkeleton variant="pill" h="h-8" w="w-8" />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <PixelSkeleton variant="line" h="h-3" w="w-2/5" />
            <PixelSkeleton variant="line" h="h-2.5" w="w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
