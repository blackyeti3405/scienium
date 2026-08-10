import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

export type OpsTabSkeletonVariant = 'card' | 'log' | 'terminal'

/**
 * Layout-mirroring skeleton for Operations Hub tab mounts — variantized per
 * the known shape of each tab so the mount-fetch wait never renders a bare
 * spinner on a fixed layout.
 *
 *  - `card`: prompt card + chip row + disclosure row (Proof of Expertise)
 *  - `log`: the entry composer card (at its real height) + the empty notice
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
        {/* The composer, built inside the REAL `ops-entry-card` so it inherits
            the card's border, radius and shadow. Measured against the live tab:
            the card is ~636px, not the 256px this used to draw — the old
            skeleton showed a small box and then the panel jumped by 380px. */}
        <div className="ops-entry-card">
          <div className="ops-entry-card__head">
            <PixelSkeleton variant="box" h="h-[35px]" w="w-[35px]" />
            <div className="flex flex-col gap-2">
              <PixelSkeleton variant="line" h="h-3.5" w="w-44" />
              <PixelSkeleton variant="line" h="h-2.5" w="w-28" />
            </div>
          </div>
          {/* Real classes supply the padding and gaps; only the control heights
              are set here, and they are MEASURED off the live tab rather than
              guessed. Every `ops-label` is an 11px line with a 9px bottom
              margin, and the four controls are 44 / 149 / 67 / 72px — which is
              how each field lands on its real 64 / 169 / 87 / 92. */}
          <div className="ops-entry-card__body">
            {/* Written out rather than mapped: Tailwind extracts class names
                statically, so a template-built `h-[${n}px]` never reaches the
                CSS and the block silently collapses to zero height. */}
            <div className="ops-field">
              <div className="mb-[9px]"><PixelSkeleton variant="line" h="h-[11px]" w="w-28" /></div>
              <PixelSkeleton variant="box" h="h-[44px]" w="w-full" />
            </div>
            <div className="ops-field">
              <div className="mb-[9px]"><PixelSkeleton variant="line" h="h-[11px]" w="w-28" /></div>
              <PixelSkeleton variant="box" h="h-[149px]" w="w-full" />
            </div>
            <div className="ops-field">
              <div className="mb-[9px]"><PixelSkeleton variant="line" h="h-[11px]" w="w-24" /></div>
              <PixelSkeleton variant="box" h="h-[67px]" w="w-full" />
            </div>
            <div className="ops-field">
              <div className="mb-[9px]"><PixelSkeleton variant="line" h="h-[11px]" w="w-40" /></div>
              {/* The photos control is a single 72x72 `ops-upload-btn` square,
                  NOT a full-width block — measured, after the full-width version
                  read as a huge slab next to a small dropzone. */}
              <PixelSkeleton variant="box" h="h-[72px]" w="w-[72px]" />
            </div>
          </div>
          <div className="ops-entry-card__foot">
            <PixelSkeleton variant="box" h="h-8" w="w-32" />
          </div>
        </div>

        {/* What sits below is the EMPTY state (min-height 150px), not a list of
            entries. Drawing three timeline cards here was inventing content a
            new lab does not have — they then vanished into an empty notice. */}
        <div className="ops-empty">
          <PixelSkeleton variant="line" h="h-3" w="w-40" />
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
