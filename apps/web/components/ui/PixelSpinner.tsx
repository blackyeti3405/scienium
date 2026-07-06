/**
 * The app's standard spinner glyph — a pixel-native "⟳" that ticks through 8
 * discrete frames (`steps(8)`) instead of rotating smoothly, matching the
 * house pixel aesthetic. Replaces every ad-hoc spinner instance (lucide
 * spinner icons and the raw `animate-spin` ⟳ spans this was promoted from).
 */

const SIZE_PX: Record<PixelSpinnerSize, number> = {
  xs: 10,
  sm: 14,
  md: 16,
  lg: 20,
}

const TONE_CLASS: Record<PixelSpinnerTone, string> = {
  chrome: 'text-white/40',
  gold: 'text-[#F5C518]',
  vega: 'text-[#7ff2e3]',
}

export type PixelSpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
export type PixelSpinnerTone = 'chrome' | 'gold' | 'vega'

export function PixelSpinner({
  size = 'md',
  tone = 'chrome',
  className = '',
}: {
  size?: PixelSpinnerSize
  tone?: PixelSpinnerTone
  className?: string
}) {
  const px = SIZE_PX[size]
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`px-spin inline-block leading-none select-none ${TONE_CLASS[tone]} ${className}`}
      style={{
        fontSize: px,
        animation: 'px-spin 0.8s steps(8) infinite',
      }}
    >
      ⟳
    </span>
  )
}
