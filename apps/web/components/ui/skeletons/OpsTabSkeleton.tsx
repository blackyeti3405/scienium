import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

export type OpsTabSkeletonVariant = 'card' | 'log' | 'terminal'

/**
 * Layout-mirroring skeleton for Operations Hub tab mounts — variantized per
 * the known shape of each tab so the mount-fetch wait never renders a bare
 * spinner on a fixed layout.
 *
 *  - `card`: prompt card + chip row + disclosure row (Proof of Expertise)
 *  - `log`: entry composer form + a few timeline entry rows
 *  - `terminal`: experiment list rows
 */
export function OpsTabSkeleton({ variant }: { variant: OpsTabSkeletonVariant }) {
  if (variant === 'card') {
    return (
      <div className="ops-tab-body" data-testid="ops-tab-skeleton-card">
        <div className="max-w-2xl mx-auto w-full space-y-5 py-2">
          <div className="flex items-center gap-2">
            <PixelSkeleton variant="pill" h="h-4" w="w-32" />
            <PixelSkeleton variant="pill" h="h-4" w="w-20" />
          </div>
          <PixelSkeleton variant="line" h="h-16" w="w-full" />
          <div className="border-t border-white/10 pt-4 space-y-2">
            <PixelSkeleton variant="line" h="h-3" w="w-16" />
            <PixelSkeleton variant="line" h="h-4" w="w-3/4" />
          </div>
          <PixelSkeleton variant="box" h="h-24" w="w-full" />
          <PixelSkeleton variant="pill" h="h-9" w="w-40" />
        </div>
      </div>
    )
  }

  if (variant === 'log') {
    return (
      <div className="ops-tab-body" data-testid="ops-tab-skeleton-log">
        <PixelSkeleton variant="box" h="h-64" w="w-full" />
        <div className="ops-timeline flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3.5">
              <PixelSkeleton variant="pill" h="h-6" w="w-6" />
              <PixelSkeleton variant="box" h="h-28" w="w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // terminal
  return (
    <div className="ops-tab-body" data-testid="ops-tab-skeleton-terminal">
      <div className="max-w-2xl mx-auto w-full space-y-3 py-2">
        <div className="flex items-center justify-between">
          <PixelSkeleton variant="line" h="h-4" w="w-24" />
          <PixelSkeleton variant="pill" h="h-8" w="w-16" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-12" w="w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
