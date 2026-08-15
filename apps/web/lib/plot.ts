/**
 * Isometric lab plot — the buildable grid shared by the renderer (LabPlot),
 * the placement interaction, and the server-side placement validation.
 *
 * The plot is a finite diamond of 1×1 cells addressed by integer (gx, gy), with
 * the central Operations Hub gateway at (0, 0). The screen transform matches the
 * cluster the scene already used (lib/gateways.ts header):
 *
 *   dx = (gx − gy) · STEP_X     dy = (gx + gy) · STEP_Y
 *   depth (draw order) = gx + gy   — higher = nearer the viewer = drawn on top
 *
 * Every building (gateway + economy) occupies exactly one cell, so occupancy is
 * just a set of "gx,gy" keys and a placement is valid when the target cell is on
 * the grid and unoccupied. This module is the single source of that math so the
 * client ghost preview and the server check can never drift apart.
 */

/** Half-extent of the square (gx, gy) range: cells span [−RADIUS, RADIUS]². */
export const PLOT_RADIUS = 3

/**
 * Isometric spacing between adjacent cells, in screen px (true 2:1). A tile diamond
 * is deliberately ~35% LARGER than a building's footprint (FOOT_HALF_Y below), so
 * buildings sit centred in their tile with breathing room / gaps between neighbours
 * rather than packed edge-to-edge. The base footprint is the gateway cube's:
 * art/iso.py HALF=22, QUART=11 source px @2× = 44×22 — the tiles here are bigger.
 */
export const STEP_X = 68
export const STEP_Y = 34
/**
 * Half-height (display px) of the standard building FOOTPRINT — the gateway cube's
 * QUART=11 source px @2×. Used to anchor a building so its footprint centroid lands
 * on the tile centre; kept separate from STEP_Y so changing the tile size (gaps)
 * never pushes buildings off-centre.
 */
export const FOOT_HALF_Y = 22
/** Nudge the cluster up slightly so tall front buildings stay optically centred. */
export const CLUSTER_Y = -12

export interface IsoPos {
  gx: number
  gy: number
}

/** Stable string key for a cell, for Set/Map occupancy lookups. */
export function cellKey(gx: number, gy: number): string {
  return `${gx},${gy}`
}

/** Whether a cell is inside the buildable plot. */
export function isOnGrid(gx: number, gy: number): boolean {
  return (
    Number.isInteger(gx) &&
    Number.isInteger(gy) &&
    Math.abs(gx) <= PLOT_RADIUS &&
    Math.abs(gy) <= PLOT_RADIUS
  )
}

/** Cell → pixel offset from the cluster centre. */
export function cellToScreen(gx: number, gy: number): { dx: number; dy: number } {
  return { dx: (gx - gy) * STEP_X, dy: (gx + gy) * STEP_Y }
}

/** Pixel offset from the cluster centre → nearest cell (inverse of cellToScreen). */
export function screenToCell(px: number, py: number): IsoPos {
  const a = px / STEP_X // gx − gy
  const b = py / STEP_Y // gx + gy
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) }
}

/** Iso depth — higher draws on top (nearer the viewer). */
export function depth(gx: number, gy: number): number {
  return gx + gy
}

/** Every cell in the plot, row-major. Useful for drawing the grid overlay. */
export const ALL_CELLS: readonly IsoPos[] = (() => {
  const cells: IsoPos[] = []
  for (let gy = -PLOT_RADIUS; gy <= PLOT_RADIUS; gy++) {
    for (let gx = -PLOT_RADIUS; gx <= PLOT_RADIUS; gx++) {
      cells.push({ gx, gy })
    }
  }
  return cells
})()

/**
 * Whether a 1×1 building may occupy (gx, gy): on the grid and not already taken.
 * `occupied` is the set of cell keys held by every OTHER building (exclude the one
 * being moved before calling, so a building can be dropped back where it started).
 */
export function isPlaceable(gx: number, gy: number, occupied: ReadonlySet<string>): boolean {
  return isOnGrid(gx, gy) && !occupied.has(cellKey(gx, gy))
}

/** SVG polygon points for the diamond outline of a cell centred at (cx, cy). */
export function diamondPoints(cx: number, cy: number): string {
  return [
    `${cx},${cy - STEP_Y}`,
    `${cx + STEP_X},${cy}`,
    `${cx},${cy + STEP_Y}`,
    `${cx - STEP_X},${cy}`,
  ].join(' ')
}

/**
 * Display size of a plot building sprite: every gateway and economy building is
 * a 64px source rendered at PLOT_SCALE 2 (see LabPlot).
 */
export const BUILDING_PX = 128

/** An axis-aligned box in cluster-centre space. */
export interface ArtBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * The box a building's ART actually occupies, as an offset rect from the cluster
 * centre — NOT its tile.
 *
 * A sprite is anchored bottom-centre on the tile's FRONT vertex, so its art
 * reaches ~(BUILDING_PX − FOOT_HALF_Y) above the tile centre and FOOT_HALF_Y
 * below it, a half-sprite either side. The tile diamond is far smaller and
 * narrows to a point top and bottom, so culling ground decor against the diamond
 * alone leaves shrubs poking out beside every building — which is exactly what it
 * did. Ground decor draws UNDER the plot, so anything inside this box is either
 * already hidden or is the bug; clearing all of it is safe.
 */
export function buildingArtBox(gx: number, gy: number): ArtBox {
  const { dx, dy } = cellToScreen(gx, gy)
  const anchorY = CLUSTER_Y + dy + FOOT_HALF_Y
  return {
    x0: dx - BUILDING_PX / 2,
    x1: dx + BUILDING_PX / 2,
    y0: anchorY - BUILDING_PX,
    y1: anchorY,
  }
}
