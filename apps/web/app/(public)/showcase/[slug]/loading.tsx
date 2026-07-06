import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Route-level fallback for an individual showcase page — known layout (hero
 * + quad chart + abstract section), seconds-class fetch.
 */
export default function ShowcaseLoading() {
  return (
    <article className="sc-show">
      <header className="sc-show__hero flex flex-col gap-3">
        <PixelSkeleton variant="pill" h="h-5" w="w-24" />
        <PixelSkeleton variant="line" h="h-9" w="w-3/4" />
        <div className="flex items-center gap-3 mt-1">
          <PixelSkeleton variant="line" h="h-3" w="w-32" />
          <PixelSkeleton variant="line" h="h-3" w="w-20" />
        </div>
      </header>

      <div className="sc-show__quad">
        <PixelSkeleton variant="box" h="h-96" w="w-full" />
      </div>

      <section className="sc-show__section flex flex-col gap-2">
        <PixelSkeleton variant="line" h="h-5" w="w-32" />
        <PixelSkeleton variant="line" h="h-3" w="w-full" />
        <PixelSkeleton variant="line" h="h-3" w="w-full" />
        <PixelSkeleton variant="line" h="h-3" w="w-2/3" />
      </section>
    </article>
  )
}
