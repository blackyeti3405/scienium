import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Route-level fallback for the public gallery SSR fetch (seconds-class, known
 * card-grid layout). Mirrors `.sc-gallery-page` structure: header, filter
 * pills, and a grid of `.sc-gcard`-shaped skeleton cards.
 */
export default function GalleryLoading() {
  return (
    <div className="sc-gallery-page">
      <header className="sc-gallery-page__head">
        <h1 className="sc-gallery-page__title">Project Gallery</h1>
        <p className="sc-gallery-page__sub">
          Real STEM projects, built and published by students on scienium.
        </p>
      </header>

      <nav className="sc-gallery-filters" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <PixelSkeleton key={i} variant="pill" h="h-7" w="w-20" />
        ))}
      </nav>

      <div className="sc-gallery-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="sc-gcard" aria-hidden="true">
            <div className="sc-gcard__thumb">
              <PixelSkeleton variant="box" h="h-full" w="w-full" className="border-0 rounded-none" />
            </div>
            <div className="sc-gcard__body flex flex-col gap-2">
              <PixelSkeleton variant="line" h="h-4" w="w-4/5" />
              <PixelSkeleton variant="line" h="h-3" w="w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
