import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Route-level fallback for the `(teacher)` group — covers all four teacher
 * pages (roster, validations, showcase moderation, student detail) with a
 * header + list-row skeleton so a slow query never renders a blank screen
 * inside the teacher shell.
 */
export default function TeacherLoading() {
  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-pixel text-[#F5C518] text-xs">⚗ scienium · Teacher</span>
          <div className="flex items-center gap-4">
            <PixelSkeleton variant="line" h="h-3" w="w-16" />
            <PixelSkeleton variant="line" h="h-3" w="w-20" />
            <PixelSkeleton variant="line" h="h-3" w="w-24" />
          </div>
        </div>
        <PixelSkeleton variant="pill" h="h-7" w="w-7" />
      </header>
      <main className="p-6 max-w-5xl mx-auto flex flex-col gap-4">
        <PixelSkeleton variant="line" h="h-5" w="w-48" />
        <PanelListSkeleton rows={5} />
      </main>
    </div>
  )
}
