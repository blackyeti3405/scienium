'use client'

import { useEffect, useRef, useState } from 'react'
import { GROUND_TILES, TILE_CELL, type GroundTileId } from '@/lib/sprites/manifest'

// Most cells are plain grass; clutter is sprinkled on top and graded so the
// field reads like a natural meadow. "Heavy" clutter (bush/shrub) is rarer than
// light clutter (flowers/pebbles), which is rarer than plain grass.
const PLAIN: GroundTileId[] = ['grass_1', 'grass_2']
const LIGHT: GroundTileId[] = ['grass_flower', 'grass_pebble']
const HEAVY: GroundTileId[] = ['grass_bush', 'grass_shrub']

/** Stable hash of a tile coordinate — same (col,row) always yields the same value. */
function hash(col: number, row: number, seed: number): number {
  let h = (col * 73856093) ^ (row * 19349663) ^ (seed * 83492791)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** Deterministically pick a tile for a cell: lush but mostly grass. */
function tileFor(col: number, row: number, seed: number): GroundTileId {
  const h = hash(col, row, seed)
  const r = h % 100
  if (r < 10) return HEAVY[h % HEAVY.length] // ~10% bush/shrub
  if (r < 34) return LIGHT[h % LIGHT.length] // ~24% flowers/pebbles
  return PLAIN[h % PLAIN.length] // ~66% plain grass
}

/**
 * Fills the ENTIRE viewport with the grass tiles. The grid is measured from the
 * container (ResizeObserver) so it always covers the screen — no dark margins.
 * Placement is deterministic (seeded by tile coordinate + a stable per-team
 * seed), so the background never reshuffles or flickers between renders.
 */
export function TileBackground({ seed = 1 }: { seed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ cols: 0, rows: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      setDims({
        cols: Math.ceil(el.clientWidth / TILE_CELL) + 1,
        rows: Math.ceil(el.clientHeight / TILE_CELL) + 1,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cells: { id: GroundTileId; col: number; row: number }[] = []
  for (let row = 0; row < dims.rows; row++) {
    for (let col = 0; col < dims.cols; col++) {
      cells.push({ id: tileFor(col, row, seed), col, row })
    }
  }

  return (
    <div ref={ref} aria-hidden className="tile-bg">
      <div
        className="tile-bg__grid"
        style={{
          gridTemplateColumns: `repeat(${dims.cols}, ${TILE_CELL}px)`,
          gridTemplateRows: `repeat(${dims.rows}, ${TILE_CELL}px)`,
        }}
      >
        {cells.map(({ id, col, row }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${col}-${row}`}
            src={GROUND_TILES[id].path}
            alt=""
            width={TILE_CELL}
            height={TILE_CELL}
            draggable={false}
            style={{ imageRendering: 'pixelated', width: TILE_CELL, height: TILE_CELL }}
          />
        ))}
      </div>
    </div>
  )
}
