'use client'

import { useRef } from 'react'
import { DECOR, DECOR_SCALE } from '@/lib/sprites/manifest'
import { computeScatter } from '@/lib/lab/decoration'
import { useElementSize } from '@/lib/hooks/useElementSize'

// A dense, seeded scatter of nature objects on top of the grass — trees, bushes,
// shrubs, tufts, flowers, rocks — so the world reads lush (Stardew-style) rather
// than an empty lawn. Sits BELOW the building plot (z-index 0 vs the plot's 1) and
// leaves a central clearing so it never covers the buildings. The pure slot→sprite
// placement math lives in lib/lab/decoration.ts (unit-tested regression guard).

export function DecorationLayer({ seed = 1 }: { seed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { w, h } = useElementSize(ref)
  const items = computeScatter(w, h, seed)

  return (
    <div ref={ref} aria-hidden className="decor-layer">
      {items.map((it, i) => {
        const d = DECOR[it.id]
        const dw = d.w * DECOR_SCALE
        const dh = d.h * DECOR_SCALE
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={d.path}
            alt=""
            width={dw}
            height={dh}
            draggable={false}
            style={{
              position: 'absolute',
              left: Math.round(it.x - dw / 2),
              top: Math.round(it.y - dh),
              width: dw,
              height: dh,
              imageRendering: 'pixelated',
            }}
          />
        )
      })}
    </div>
  )
}
