import { describe, it, expect } from 'vitest'
import { computeScatter, hash, placeSlot, SLOT, WEIGHTED } from '@/lib/lab/decoration'

/**
 * Regression guard for the signed-shift crash: `hash()` is an UNSIGNED 32-bit
 * value, but a signed `>>` on any hash >= 2^31 yields a negative number, and JS
 * keeps the sign through `%` (`-19 % 8 === -3`), so `WEIGHTED[-3]` was undefined
 * and the lab page threw reading `.w` off it — crashing for ~37% of slots. These
 * pin every hash-derived index/jitter into range so the regression can't return.
 */

// A wide coordinate + seed sweep so we hit the >= 2^31 hash values that broke it.
const SEEDS = [0, 1, 2, 7, 42, 1337, 99999]
const SPAN = 60 // 60×60 slots × 7 seeds = 25,200 samples

describe('decoration hash', () => {
  it('always returns a non-negative 32-bit unsigned int', () => {
    for (const seed of SEEDS) {
      for (let r = 0; r < SPAN; r++) {
        for (let c = 0; c < SPAN; c++) {
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
      for (let r = 0; r < SPAN && !sawHigh; r++) {
        for (let c = 0; c < SPAN; c++) {
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
      for (let r = 0; r < SPAN; r++) {
        for (let c = 0; c < SPAN; c++) {
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
          // Jitter/position are always finite.
          expect(Number.isFinite(placed.x)).toBe(true)
          expect(Number.isFinite(placed.y)).toBe(true)
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
