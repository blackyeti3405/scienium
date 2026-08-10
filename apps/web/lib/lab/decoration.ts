import { DECOR, DECOR_SCALE, type DecorId } from '@/lib/sprites/manifest'
import type { ArtBox } from '@/lib/plot'

// Pure placement math for the lab's nature-scatter layer (see
// components/lab/DecorationLayer.tsx). Kept DB-free and React-free so the
// slot→sprite index + jitter can be unit-tested — a regression guard for the
// signed-shift crash below.

// Weighted mix: low leafy shrubs + varied rocks (no trees). Repeats set the
// frequency (more entries = more common) — shrubs a bit more common than rocks.
export const WEIGHTED: DecorId[] = [
  'shrub_mound', 'shrub_mound', 'shrub_round', 'shrub_round', 'shrub_fern', 'shrub_berry',
  'rock_round', 'rock_crag', 'rock_cluster', 'rock_slab',
]

/** px between scatter slots (smaller = denser). */
export const SLOT = 90

export interface Placed {
  id: DecorId
  x: number // ground anchor (bottom-centre)
  y: number
}

/** Stable unsigned 32-bit hash of a slot coordinate + seed. */
export function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393) ^ (y * 668265263) ^ (seed * 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * The art box of a placed building, as an offset rect from the cluster centre.
 * Build one per placed building with `buildingArtBox(gx, gy)` from lib/plot.
 */
export type BlockedCell = ArtBox

/**
 * Whether a decor sprite anchored at (x, y) overlaps a building's art.
 *
 * Both are plain rects: the decor's art spans its own width either side of the
 * anchor and rises `dh` above it (DecorationLayer draws it at `left: x - dw/2,
 * top: y - dh`). Testing art-vs-art rather than anchor-vs-tile is the point —
 * the tile diamond is much smaller than the sprite standing on it.
 */
function overlapsBuilding(
  x: number,
  y: number,
  dw: number,
  dh: number,
  blocked: readonly BlockedCell[],
): boolean {
  const ax0 = x - dw / 2
  const ax1 = x + dw / 2
  const ay0 = y - dh
  const ay1 = y
  for (const b of blocked) {
    if (ax1 > b.x0 && ax0 < b.x1 && ay1 > b.y0 && ay0 < b.y1) return true
  }
  return false
}

/**
 * Decide the sprite + jittered position for one grid slot, or `null` when the
 * slot is empty (~30%) or the jittered anchor falls outside the visible area.
 *
 * `c`/`r` are SIGNED slot indices measured from the viewport CENTRE, and the
 * returned x/y are offsets from that centre — not absolute pixels. This is what
 * keeps the scatter still when the window resizes: the building cluster is
 * centre-anchored (`calc(50% + Npx)` in LabPlot), so a ground layer indexed from
 * the top-left slides sideways underneath it on every resize. Indexed from the
 * centre, slot (c,r) keeps the same sprite at the same offset forever, and
 * resizing only reveals or culls slots at the edges.
 *
 * All bit-extractions use UNSIGNED shifts (`>>>`): `hash()` returns a full
 * unsigned 32-bit value, but `>>` coerces to Int32 first — any hash >= 2^31
 * shifts NEGATIVE, and JS keeps the sign through `%` (-19 % 8 === -3). A signed
 * shift here made `WEIGHTED[-3]` undefined and the reading component threw on
 * `d.w`, crashing the whole lab page for ~37% of slots. The unit test pins this.
 */
export function placeSlot(
  c: number,
  r: number,
  seed: number,
  w: number,
  h: number,
  blocked: readonly BlockedCell[] = [],
): Placed | null {
  const hsh = hash(c, r, seed)
  if (hsh % 100 < 30) return null // ~30% empty slots
  const jx = ((hsh >>> 8) % SLOT) - SLOT / 2 // jitter off the grid
  const jy = ((hsh >>> 15) % SLOT) - SLOT / 2
  const x = c * SLOT + jx
  const y = r * SLOT + jy
  const halfW = w / 2
  const halfH = h / 2
  if (x < -halfW - 24 || x > halfW + 24) return null
  if (y < -halfH || y > halfH + 40) return null
  const id = WEIGHTED[(hsh >>> 3) % WEIGHTED.length]
  // Ground clears where a building stands: no shrub growing through a wall.
  const d = DECOR[id]
  if (overlapsBuilding(x, y, d.w * DECOR_SCALE, d.h * DECOR_SCALE, blocked)) return null
  return { id, x, y }
}

/**
 * The full seeded scatter for a `w`×`h` area, back-to-front sorted (higher on
 * screen painted first). Slots are walked outward from the centre and converted
 * to absolute pixels here, so the caller still gets plain top-left coordinates.
 */
export function computeScatter(
  w: number,
  h: number,
  seed: number,
  blocked: readonly BlockedCell[] = [],
): Placed[] {
  const items: Placed[] = []
  if (w <= 0 || h <= 0) return items
  const cx = Math.round(w / 2)
  const cy = Math.round(h / 2)
  const halfCols = Math.ceil(w / 2 / SLOT) + 1
  const halfRows = Math.ceil(h / 2 / SLOT) + 1
  for (let r = -halfRows; r <= halfRows; r++) {
    for (let c = -halfCols; c <= halfCols; c++) {
      const placed = placeSlot(c, r, seed, w, h, blocked)
      if (placed) items.push({ id: placed.id, x: cx + placed.x, y: cy + placed.y })
    }
  }
  items.sort((a, b) => a.y - b.y) // back-to-front: paint higher-on-screen first
  return items
}
