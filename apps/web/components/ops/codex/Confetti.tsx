'use client'

/**
 * Field Codex — pass-only confetti. A single short burst of pixel squares
 * (gold + emerald, on-brand) fired once when a lesson is passed. Purely
 * decorative delight for a RARE event (≤3 lesson passes/day), so expressive
 * motion is warranted — but it's short, non-looping, pointer-inert, and fully
 * removed under `prefers-reduced-motion` (the `.codex-confetti` layer is
 * `display:none` there; see globals.css). Self-contained: no dependency.
 *
 * Piece targets are DETERMINISTIC (derived from index) so the spread is even
 * and there's no hydration/randomness concern — the layer only mounts on the
 * client after a pass.
 */

import type { CSSProperties } from 'react'

const COLORS = ['#F5C518', '#ffe566', '#34d399']

const PIECES = Array.from({ length: 18 }, (_, i) => {
  const t = i / 17 // 0..1 across the fan
  const angleDeg = -58 + t * 116 // fan out ±58° from straight down
  const dist = 150 + ((i * 41) % 120) // 150–270px throw
  const rad = (angleDeg * Math.PI) / 180
  return {
    i,
    dx: Math.round(Math.sin(rad) * dist),
    dy: Math.round(Math.cos(rad) * dist * 0.85 + 44), // biased downward, like falling confetti
    r: ((i * 67) % 360) - 180,
    delay: (i % 6) * 20,
    color: COLORS[i % COLORS.length],
    size: 5 + (i % 3) * 2,
  }
})

export function Confetti() {
  return (
    <div className="codex-confetti pointer-events-none absolute left-1/2 top-6 -translate-x-1/2" aria-hidden>
      {PIECES.map((p) => (
        <span
          key={p.i}
          className="codex-confetti-piece"
          style={
            {
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--r': `${p.r}deg`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
