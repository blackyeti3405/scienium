import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Generic gateway-panel frame: header eyebrow line + tab-strip pills + body
 * blocks. Doubles as the `next/dynamic` fallback in `lib/featureRegistry.tsx`
 * (chunk load) and as the default while an Operations Hub tab's mount fetch
 * runs — rendering the same skeleton for both makes chunk-load + data-load
 * read as one continuous wait instead of two flickers.
 */
export function HubPanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white p-6 gap-6" data-testid="hub-panel-skeleton">
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <PixelSkeleton key={i} variant="pill" h="h-6" w="w-20" />
        ))}
      </div>
      <PixelSkeleton variant="line" h="h-3" w="w-40" />
      <div className="flex flex-col gap-3 max-w-2xl w-full mx-auto">
        <PixelSkeleton variant="box" h="h-24" w="w-full" />
        <PixelSkeleton variant="box" h="h-16" w="w-full" />
        <PixelSkeleton variant="box" h="h-16" w="w-full" />
      </div>
    </div>
  )
}
