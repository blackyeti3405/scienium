'use client'

import { useEffect, useRef, useState } from 'react'
import { DECOR, DECOR_SCALE, type DecorId } from '@/lib/sprites/manifest'

// A dense, seeded scatter of nature objects on top of the grass — trees, bushes,
// shrubs, tufts, flowers, rocks — so the world reads lush (Stardew-style) rather
// than an empty lawn. Sits BELOW the building plot (z-index 0 vs the plot's 1) and
// leaves a central clearing so it never covers the buildings.

// Weighted mix: low leafy shrubs + varied rocks (no trees). Repeats set the
// frequency (more entries = more common) — shrubs a bit more common than rocks.
const WEIGHTED: DecorId[] = [
  'shrub_mound', 'shrub_mound', 'shrub_round', 'shrub_round', 'shrub_fern', 'shrub_berry',
  'rock_round', 'rock_crag', 'rock_cluster', 'rock_slab',
]

/** Stable hash of a slot coordinate + seed. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393) ^ (y * 668265263) ^ (seed * 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const SLOT = 90 // px between scatter slots (smaller = denser)

interface Placed {
  id: DecorId
  x: number // ground anchor (bottom-centre)
  y: number
}

export function DecorationLayer({ seed = 1 }: { seed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = dims
  const items: Placed[] = []
  if (w > 0 && h > 0) {
    const cols = Math.ceil(w / SLOT) + 1
    const rows = Math.ceil(h / SLOT) + 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hsh = hash(c, r, seed)
        if (hsh % 100 < 30) continue // ~30% empty slots
        const jx = ((hsh >> 8) % SLOT) - SLOT / 2 // jitter off the grid
        const jy = ((hsh >> 15) % SLOT) - SLOT / 2
        const x = c * SLOT + jx
        const y = r * SLOT + jy
        if (x < -24 || x > w + 24 || y < 0 || y > h + 40) continue
        // Dispersed throughout — no clearing. The building plot (z-index 1) renders
        // ON TOP of this layer (z-index 0), so a placed building simply covers the
        // shrubs/rocks under its footprint.
        items.push({ id: WEIGHTED[(hsh >> 3) % WEIGHTED.length], x, y })
      }
    }
    items.sort((a, b) => a.y - b.y) // back-to-front: paint higher-on-screen first
  }

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
