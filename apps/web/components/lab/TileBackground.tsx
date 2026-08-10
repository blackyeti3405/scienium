'use client'

import { useRef } from 'react'
import { GROUND_TILES, TILE_CELL, type GroundTileId } from '@/lib/sprites/manifest'
import { useElementSize } from '@/lib/hooks/useElementSize'

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
 * container (ResizeObserver) so it always covers the screen, with no dark
 * margins. Placement is deterministic (seeded by tile coordinate + a stable
 * per-team seed) AND centre-anchored, so the ground neither reshuffles between
 * renders nor slides under the lab when the window resizes.
 */
export function TileBackground({ seed = 1 }: { seed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { w, h } = useElementSize(ref)

  // Tiles are indexed from the viewport CENTRE, not its top-left corner. The
  // building cluster is centre-anchored, so a top-left-indexed ground grid
  // re-tiles underneath it every time the window resizes — the ground visibly
  // changes behind a lab that hasn't moved. Anchored to the centre, tile (0,0)
  // always sits under the middle of the cluster and a resize only adds or drops
  // tiles at the edges.
  const halfCols = Math.ceil(w / 2 / TILE_CELL) + 1
  const halfRows = Math.ceil(h / 2 / TILE_CELL) + 1

  const cells: { id: GroundTileId; col: number; row: number }[] = []
  for (let row = -halfRows; row <= halfRows; row++) {
    for (let col = -halfCols; col <= halfCols; col++) {
      cells.push({ id: tileFor(col, row, seed), col, row })
    }
  }

  // Tile (col,row) is centred on (centre + col*CELL). Rounded so the grid stays
  // on whole pixels and the art keeps its crisp edges.
  const originX = Math.round(w / 2 - TILE_CELL / 2) - halfCols * TILE_CELL
  const originY = Math.round(h / 2 - TILE_CELL / 2) - halfRows * TILE_CELL

  return (
    <div ref={ref} aria-hidden className="tile-bg">
      <div
        className="tile-bg__grid"
        style={{
          left: originX,
          top: originY,
          gridTemplateColumns: `repeat(${halfCols * 2 + 1}, ${TILE_CELL}px)`,
          gridTemplateRows: `repeat(${halfRows * 2 + 1}, ${TILE_CELL}px)`,
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
