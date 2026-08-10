import { describe, it, expect } from 'vitest'
import { computeScatter, hash, placeSlot, SLOT, WEIGHTED } from '@/lib/lab/decoration'
import { ALL_CELLS, STEP_X as STEP_X_EQUIV, STEP_Y as STEP_Y_EQUIV, buildingArtBox } from '@/lib/plot'
import { DECOR, DECOR_SCALE, type DecorId } from '@/lib/sprites/manifest'

/**
 * Regression guard for the signed-shift crash: `hash()` is an UNSIGNED 32-bit
 * value, but a signed `>>` on any hash >= 2^31 yields a negative number, and JS
 * keeps the sign through `%` (`-19 % 8 === -3`), so `WEIGHTED[-3]` was undefined
 * and the lab page threw reading `.w` off it — crashing for ~37% of slots. These
 * pin every hash-derived index/jitter into range so the regression can't return.
 */

// A wide coordinate + seed sweep so we hit the >= 2^31 hash values that broke it.
// Slot indices are SIGNED (measured from the viewport centre), so the sweep runs
// negative-through-positive — negative coords are the normal case now, not an
// edge case, and `hash` must stay unsigned for them too.
const SEEDS = [0, 1, 2, 7, 42, 1337, 99999]
const SPAN = 60 // 60×60 slots × 7 seeds = 25,200 samples
const LO = -SPAN / 2
const HI = SPAN / 2

describe('decoration hash', () => {
  it('always returns a non-negative 32-bit unsigned int', () => {
    for (const seed of SEEDS) {
      for (let r = LO; r < HI; r++) {
        for (let c = LO; c < HI; c++) {
          const h = hash(c, r, seed)
          expect(Number.isInteger(h)).toBe(true)
          expect(h).toBeGreaterThanOrEqual(0)
          expect(h).toBeLessThanOrEqual(0xffffffff)
        }
      }
    }
  })

  it('actually produces hashes >= 2^31 in the sweep (the values that broke it)', () => {
    let sawHigh = false
    for (const seed of SEEDS) {
      for (let r = LO; r < HI && !sawHigh; r++) {
        for (let c = LO; c < HI; c++) {
          if (hash(c, r, seed) >= 0x80000000) { sawHigh = true; break }
        }
      }
    }
    // If this fails the sweep no longer exercises the bug's precondition.
    expect(sawHigh).toBe(true)
  })
})

describe('decoration placeSlot', () => {
  it('never yields an out-of-range WEIGHTED index or an undefined sprite id', () => {
    const w = SLOT * SPAN
    const h = SLOT * SPAN
    let placedCount = 0
    for (const seed of SEEDS) {
      for (let r = LO; r < HI; r++) {
        for (let c = LO; c < HI; c++) {
          const placed = placeSlot(c, r, seed, w, h)
          if (!placed) continue
          placedCount++
          // The exact index expression the crash came from.
          const idx = (hash(c, r, seed) >>> 3) % WEIGHTED.length
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(WEIGHTED.length)
          // The real invariant: the resolved sprite id is a defined WEIGHTED entry.
          expect(WEIGHTED).toContain(placed.id)
          expect(placed.id).toBeDefined()
          // Jitter/position are always finite, and centre-relative: anything
          // returned must lie inside the half-extents (plus the sprite margin).
          expect(Number.isFinite(placed.x)).toBe(true)
          expect(Number.isFinite(placed.y)).toBe(true)
          expect(Math.abs(placed.x)).toBeLessThanOrEqual(w / 2 + 24)
          expect(Math.abs(placed.y)).toBeLessThanOrEqual(h / 2 + 40)
        }
      }
    }
    // Sanity: the sweep actually placed a meaningful number of items (~70% of
    // in-bounds slots), so the assertions above weren't vacuously skipped.
    expect(placedCount).toBeGreaterThan(1000)
  })

  it('is deterministic for a given (c, r, seed)', () => {
    const a = placeSlot(3, 5, 42, 1000, 1000)
    const b = placeSlot(3, 5, 42, 1000, 1000)
    expect(a).toEqual(b)
  })
})

describe('decoration computeScatter', () => {
  it('returns an empty scatter for a zero-size area', () => {
    expect(computeScatter(0, 0, 1)).toEqual([])
    expect(computeScatter(500, 0, 1)).toEqual([])
  })

  it('places the same sprites at the same offsets from centre as the area grows', () => {
    // The resize bug: the ground re-tiled under a centre-anchored lab. Widening
    // the viewport must not move or change any decor already on screen.
    const small = computeScatter(1200, 800, 42)
    const wide = computeScatter(1600, 800, 42)
    const rel = (items: { id: string; x: number; y: number }[], w: number) =>
      items.map((i) => `${i.id}@${i.x - Math.round(w / 2)},${i.y - Math.round(800 / 2)}`)
    const smallRel = new Set(rel(small, 1200))
    const wideRel = new Set(rel(wide, 1600))
    // Every item visible at the smaller width survives unchanged at the larger.
    for (const key of smallRel) expect(wideRel.has(key)).toBe(true)
    // And widening only ever reveals more of the field, never fewer.
    expect(wideRel.size).toBeGreaterThan(smallRel.size)
  })

  it('every placed item has a defined sprite and is sorted back-to-front by y', () => {
    for (const seed of SEEDS) {
      const items = computeScatter(1200, 800, seed)
      expect(items.length).toBeGreaterThan(0)
      for (let i = 0; i < items.length; i++) {
        expect(WEIGHTED).toContain(items[i].id)
        if (i > 0) expect(items[i].y).toBeGreaterThanOrEqual(items[i - 1].y)
      }
    }
  })
})

describe('decoration building clearance', () => {
  const W = 1400
  const H = 900
  const CX = Math.round(W / 2)
  const CY = Math.round(H / 2)

  /** The same mapping LabScene uses to turn a placed cell into a blocked box. */
  const WHOLE_PLOT = ALL_CELLS.map(({ gx, gy }) => buildingArtBox(gx, gy))

  /** Does a placed item's ART overlap the building's art box? */
  const overlapsArt = (
    item: { id: string; x: number; y: number },
    box: { x0: number; y0: number; x1: number; y1: number },
  ) => {
    const d = DECOR[item.id as DecorId]
    const dw = d.w * DECOR_SCALE
    const dh = d.h * DECOR_SCALE
    const x0 = item.x - CX - dw / 2
    const x1 = item.x - CX + dw / 2
    const y0 = item.y - CY - dh
    const y1 = item.y - CY
    return x1 > box.x0 && x0 < box.x1 && y1 > box.y0 && y0 < box.y1
  }

  it('leaves no decor overlapping a placed building', () => {
    for (const seed of SEEDS) {
      for (const item of computeScatter(W, H, seed, WHOLE_PLOT)) {
        for (const box of WHOLE_PLOT) expect(overlapsArt(item, box)).toBe(false)
      }
    }
  })

  it('actually had overlapping decor to remove (guards a vacuous pass above)', () => {
    // Without this, the assertion above would still pass if the scatter simply
    // never put anything near the plot to begin with.
    let overlapping = 0
    for (const seed of SEEDS) {
      for (const item of computeScatter(W, H, seed)) {
        if (WHOLE_PLOT.some((box) => overlapsArt(item, box))) overlapping++
      }
    }
    expect(overlapping).toBeGreaterThan(0)
  })

  it('clears beside a building, not just on its tile', () => {
    // The bug this replaced: culling against the tile DIAMOND let decor sit
    // alongside a building, because the diamond narrows to a point vertically
    // while the 128px sprite stays full width over its whole height.
    const box = buildingArtBox(0, 0)
    expect(box.x1 - box.x0).toBeGreaterThan(STEP_X_EQUIV)
    expect(box.y1 - box.y0).toBeGreaterThan(STEP_Y_EQUIV * 2)
  })

  it('only ever removes decor, never adds or moves any', () => {
    const key = (i: { id: string; x: number; y: number }) => `${i.id}@${i.x},${i.y}`
    for (const seed of SEEDS) {
      const bare = computeScatter(W, H, seed)
      const cleared = computeScatter(W, H, seed, WHOLE_PLOT)
      const bareKeys = new Set(bare.map(key))
      expect(cleared.length).toBeLessThan(bare.length)
      for (const item of cleared) expect(bareKeys.has(key(item))).toBe(true)
    }
  })

  it('is a no-op when nothing is placed', () => {
    expect(computeScatter(W, H, 3, [])).toEqual(computeScatter(W, H, 3))
  })
})
