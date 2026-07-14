'use client'

import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/** Loading placeholder for the showcase editor (top bar + two section cards). */
export function EditorSkeleton() {
  return (
    <div className="sc-editor" data-testid="showcase-editor-skeleton">
      <div className="sc-topbar">
        <PixelSkeleton variant="pill" h="h-5" w="w-24" />
        <PixelSkeleton variant="pill" h="h-6" w="w-16" />
      </div>
      <div className="sc-scroll flex flex-col gap-4 p-4">
        <PixelSkeleton variant="box" h="h-2" w="w-full" />
        <div className="ops-entry-card flex flex-col gap-3 p-4">
          <PixelSkeleton variant="line" h="h-4" w="w-40" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
          <PixelSkeleton variant="box" h="h-16" w="w-full" />
          <PixelSkeleton variant="box" h="h-28" w="w-full" />
        </div>
        <div className="ops-entry-card flex flex-col gap-3 p-4">
          <PixelSkeleton variant="line" h="h-4" w="w-48" />
          <div className="grid grid-cols-2 gap-3">
            <PixelSkeleton variant="box" h="h-24" w="w-full" />
            <PixelSkeleton variant="box" h="h-24" w="w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
