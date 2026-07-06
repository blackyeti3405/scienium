/**
 * Determinate + indeterminate progress bar, pixel-styled to match the house
 * gold Card treatment.
 *
 *  - Determinate (`value` given, no `segments`): gold gradient fill over a
 *    `bg-white/10` track, chunky inset border, width transitions in
 *    `steps(4)` for a stepped (not smooth) fill.
 *  - Segmented (`segments={n}`): n discrete cells, each filled solid once its
 *    index falls below `value` (0-100 mapped across n cells) — used for the
 *    5-section research-plan review sweep and future streamed grading.
 *  - Indeterminate (`value` omitted): reuses the existing `@keyframes
 *    indeterminate` sweep unchanged (already the house style).
 */

export function PixelProgressBar({
  value,
  segments,
  className = '',
}: {
  /** 0–100. Omit for an indeterminate sweep. */
  value?: number
  /** Render this many discrete cells instead of a continuous fill. */
  segments?: number
  className?: string
}) {
  const indeterminate = value === undefined
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, value))

  if (segments && segments > 0) {
    const filledCount = Math.round((pct / 100) * segments)
    return (
      <div
        className={`flex gap-1 ${className}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-sm transition-colors duration-200"
            style={{
              background:
                i < filledCount
                  ? 'linear-gradient(#ffe566, #f5c518)'
                  : 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 0 2px #10131f',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`relative h-1.5 w-full overflow-hidden rounded-sm bg-white/10 ${className}`}
      style={{ boxShadow: '0 0 0 2px #10131f inset' }}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div
          className="absolute inset-y-0 w-1/3 rounded-sm"
          style={{
            background: 'linear-gradient(#ffe566, #f5c518)',
            animation: 'indeterminate 1.1s ease-in-out infinite',
          }}
        />
      ) : (
        <div
          className="h-full rounded-sm"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(#ffe566, #f5c518)',
            transition: 'width 0.2s steps(4)',
          }}
        />
      )}
    </div>
  )
}
