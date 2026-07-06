/**
 * Shared skeleton block — promoted from the one-off `SkeletonBar` that used to
 * live private to ResearchPlanFeature.tsx. Block styling matches the house
 * "coming, not dead" treatment (`bg-white/5 border border-white/10`); the
 * shimmer sweep is a hard-edged, quantized `repeating-linear-gradient` (chunky
 * pixel scan, not a smooth gloss) that falls back to a plain `animate-pulse`
 * under `prefers-reduced-motion`.
 *
 * Variants:
 *  - `line` — a text row (rounded-sm, thin)
 *  - `box`  — a card/thumb block
 *  - `pill` — a chip/tag (fully rounded)
 */

export type PixelSkeletonVariant = 'line' | 'box' | 'pill'

const VARIANT_CLASS: Record<PixelSkeletonVariant, string> = {
  line: 'rounded-sm',
  box: 'rounded-sm',
  pill: 'rounded-full',
}

export function PixelSkeleton({
  variant = 'box',
  h = 'h-4',
  w = 'w-full',
  shimmer = true,
  className = '',
}: {
  variant?: PixelSkeletonVariant
  /** Tailwind height class, e.g. `h-4`, `h-24`. */
  h?: string
  /** Tailwind width class, e.g. `w-full`, `w-24`. */
  w?: string
  /** Whether to sweep the shimmer band across the block. */
  shimmer?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`px-skel ${shimmer ? 'px-shimmer' : 'animate-pulse'} bg-white/5 border border-white/10 ${VARIANT_CLASS[variant]} ${h} ${w} ${className}`}
    />
  )
}
