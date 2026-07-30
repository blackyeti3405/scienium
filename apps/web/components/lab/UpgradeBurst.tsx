'use client'

import { cellToScreen, CLUSTER_Y } from '@/lib/plot'

/**
 * Pixel-art upgrade particle: a 7×7 cross/sparkle (thin arms, rounded centre)
 * drawn as one rect per row, shaded top→bottom in stepped greens (a pixel-art
 * green gradient). Rendered crisp (image-rendering: pixelated, shape-rendering:
 * crispEdges in CSS).
 */
const PARTICLE_ROWS: ReadonlyArray<readonly [x: number, w: number, fill: string]> = [
  [2, 1, '#d6ffdd'],
  [1, 3, '#7ff2a0'],
  [0, 5, '#46e06a'],
  [1, 3, '#2bb858'],
  [2, 1, '#147a37'],
]

/**
 * Green particle burst over a just-upgraded building — covers it then
 * dissipates outward. Extracted verbatim from `LabScene`; render with
 * `key={burst.id}` so back-to-back upgrades restart the animation.
 */
export function UpgradeBurst({ gx, gy }: { gx: number; gy: number }) {
  const { dx, dy } = cellToScreen(gx, gy)
  const N = 24
  return (
    <div
      className="upgrade-burst"
      style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${CLUSTER_Y + dy}px)` }}
      aria-hidden="true"
    >
      {Array.from({ length: N }, (_, i) => {
        // Scatter each particle's origin across the building footprint (sx, sy
        // from the tile centre) so they rise from all over it, not one point.
        const sx = Math.round(Math.cos(i * 1.8) * 24)
        const sy = Math.round(-4 + Math.sin(i * 2.3) * 14)
        return (
          // Wrapper does the steady vertical RISE; the inner sprite does a smooth
          // sine SWAY (ease-in-out alternate) — together a smooth snaking curve.
          // A per-particle negative sway delay varies the phase so they don't sync.
          <span
            key={i}
            className="upgrade-burst__p"
            style={{ left: `${sx}px`, top: `${sy}px`, animationDelay: `${(i % 4) * 0.07}s` }}
          >
            <svg
              className="upgrade-burst__spark"
              viewBox="0 0 5 5"
              style={{ animationDelay: `-${(i % 5) * 0.09}s` }}
              aria-hidden="true"
            >
              {PARTICLE_ROWS.map(([x, w, fill], y) => (
                <rect key={y} x={x} y={y} width={w} height={1} fill={fill} />
              ))}
            </svg>
          </span>
        )
      })}
    </div>
  )
}
