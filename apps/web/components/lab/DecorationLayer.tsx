'use client'

import { useMemo, useRef } from 'react'
import { DECOR, DECOR_SCALE } from '@/lib/sprites/manifest'
import { computeScatter, type BlockedCell } from '@/lib/lab/decoration'
import { useElementSize } from '@/lib/hooks/useElementSize'

// A dense, seeded scatter of nature objects on top of the grass — shrubs, tufts,
// rocks — so the world reads lush (Stardew-style) rather than an empty lawn. Sits
// BELOW the building plot (z-index 0 vs the plot's 1), and any slot covered by a
// placed building is dropped so nothing grows through a wall. The pure
// slot→sprite placement math lives in lib/lab/decoration.ts (unit-tested).

/** Stable default so the memo below doesn't re-run on every parent render. */
const EMPTY: readonly BlockedCell[] = []

export function DecorationLayer({
  seed = 1,
  blocked = EMPTY,
}: {
  seed?: number
  /** Tiles holding a building, as offsets from the cluster centre. */
  blocked?: readonly BlockedCell[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { w, h } = useElementSize(ref)
  const items = useMemo(() => computeScatter(w, h, seed, blocked), [w, h, seed, blocked])

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
