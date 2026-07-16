import { type DecorId } from '@/lib/sprites/manifest'

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
 * Decide the sprite + jittered position for one grid slot, or `null` when the
 * slot is empty (~30%) or the jittered anchor falls out of bounds.
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
): Placed | null {
  const hsh = hash(c, r, seed)
  if (hsh % 100 < 30) return null // ~30% empty slots
  const jx = ((hsh >>> 8) % SLOT) - SLOT / 2 // jitter off the grid
  const jy = ((hsh >>> 15) % SLOT) - SLOT / 2
  const x = c * SLOT + jx
  const y = r * SLOT + jy
  if (x < -24 || x > w + 24 || y < 0 || y > h + 40) return null
  return { id: WEIGHTED[(hsh >>> 3) % WEIGHTED.length], x, y }
}

/**
 * The full seeded scatter for a `w`×`h` area, back-to-front sorted (higher on
 * screen painted first). Pure — the component just measures its box and renders
 * the result.
 */
export function computeScatter(w: number, h: number, seed: number): Placed[] {
  const items: Placed[] = []
  if (w <= 0 || h <= 0) return items
  const cols = Math.ceil(w / SLOT) + 1
  const rows = Math.ceil(h / SLOT) + 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const placed = placeSlot(c, r, seed, w, h)
      if (placed) items.push(placed)
    }
  }
  items.sort((a, b) => a.y - b.y) // back-to-front: paint higher-on-screen first
  return items
}
