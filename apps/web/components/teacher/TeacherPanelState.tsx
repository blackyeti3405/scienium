'use client'

import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'

/**
 * Shared loading-skeleton / load-error blocks for a teacher tab panel
 * (TeacherReports, TeacherRoster) — identical markup between the two,
 * differing only in the skeleton row count.
 */
export function TeacherPanelState({
  loading,
  error,
  skeletonRows,
}: {
  loading: boolean
  error: string | null
  skeletonRows: number
}) {
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <PixelSkeleton variant="line" h="h-3" w="w-24" />
          <PixelSkeleton variant="box" h="h-20" w="w-full" />
        </div>
        <div className="space-y-3">
          <PixelSkeleton variant="line" h="h-3" w="w-20" />
          <PanelListSkeleton rows={skeletonRows} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="border border-dashed border-red-400/25 rounded-lg py-12 text-center space-y-1">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return null
}
