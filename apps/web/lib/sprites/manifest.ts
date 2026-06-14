/**
 * Sprite asset manifest — single source of truth for all game art.
 *
 * Sprites are authored with the pixel-art pipeline under `art/`:
 *   - `art/build_sprites.py` generates the generic gateways, ground tiles, padlock
 *   - `art/recolor.py` palette-swaps each gateway into the 6 lab-type skins
 * Source char-grid JSON lives in `art/src/*.json`; rendered PNGs land in
 * `apps/web/public/sprites/{gateways,tiles,ui}/`. See README "Pixel art" section.
 *
 * The scene reads ONLY from this manifest — never hardcode a sprite path inline.
 *
 * PLACEHOLDER BEHAVIOR
 * Until/if a PNG is missing, <Sprite> renders a labeled colored block using the
 * placeholder color below, at the same dimensions — layout never breaks.
 */

export interface SpriteEntry {
  /** Path relative to /public (leading slash). */
  path: string
  /** Source width in pixels (before CSS scaling). */
  srcWidth: number
  /** Source height in pixels (before CSS scaling). */
  srcHeight: number
  /** CSS display scale multiplier (e.g. 3 means render at 3×). */
  scale: number
  /** Human-readable description for alt text and placeholders. */
  description: string
  /** Placeholder background color (hex) — used when PNG is missing. */
  placeholderColor: string
}

// ─── Gateway buildings ────────────────────────────────────────────────────────
// 7 gateway keys × 7 skins (generic + 6 lab types) = 49 sprites.
// All share 48×48 source @ 3× display. Path: /sprites/gateways/{key}_{skin}.png

export const GATEWAY_KEYS = [
  'discovery',
  'science_fair',
  'literature_review',
  'operations_hub',
  'research_plan',
  'pvp',
  'showcase',
] as const
export type GatewayKey = (typeof GATEWAY_KEYS)[number]

export const GATEWAY_SKINS = [
  'generic',
  'biocore',
  'chemworks',
  'volt_lab',
  'terrabase',
  'mindframe',
  'axiom',
] as const
export type GatewaySkin = (typeof GATEWAY_SKINS)[number]

const GATEWAY_SRC = 64
const GATEWAY_SCALE = 2

const GATEWAY_LABELS: Record<GatewayKey, string> = {
  discovery: 'Discovery building',
  science_fair: 'Science Fair Research building',
  literature_review: 'Literature Review building',
  operations_hub: 'Operations Hub',
  research_plan: 'Research Plan building',
  pvp: 'PvP arena',
  showcase: 'Showcase building',
}

// Placeholder structure color per skin (the wall "mid" tone) — keeps the dev
// fallback visually on-palette before/if a PNG is unavailable.
const SKIN_PLACEHOLDER: Record<GatewaySkin, string> = {
  generic: '#968fbf',
  biocore: '#7fae6e',
  chemworks: '#8090c8',
  volt_lab: '#9098a2',
  terrabase: '#9a8a66',
  mindframe: '#8c82bb',
  axiom: '#5a6498',
}

/** Resolve the sprite for a (gateway, skin) pair. */
export function getGatewaySprite(key: GatewayKey, skin: GatewaySkin): SpriteEntry {
  return {
    path: `/sprites/gateways/${key}_${skin}.png`,
    srcWidth: GATEWAY_SRC,
    srcHeight: GATEWAY_SRC,
    scale: GATEWAY_SCALE,
    description: `${GATEWAY_LABELS[key]} (${skin})`,
    placeholderColor: SKIN_PLACEHOLDER[skin],
  }
}

// ─── Ground tiles ─────────────────────────────────────────────────────────────
// 6 grass tiles, 32×32 source @ 2× display (64px cells). Mostly plain grass;
// a couple carry sparse clutter. The scene tiles these deterministically.

export const GROUND_TILE_IDS = [
  'grass_1',
  'grass_2',
  'grass_3',
  'grass_flower',
  'grass_shrub',
  'grass_bush',
  'grass_fern',
  'grass_tree',
  'grass_pebble',
] as const
export type GroundTileId = (typeof GROUND_TILE_IDS)[number]

export const TILE_SRC = 32
export const TILE_SCALE = 2
/** Displayed cell size in CSS px (TILE_SRC × TILE_SCALE). */
export const TILE_CELL = TILE_SRC * TILE_SCALE

export const GROUND_TILES: Record<GroundTileId, SpriteEntry> = Object.fromEntries(
  GROUND_TILE_IDS.map((id) => [
    id,
    {
      path: `/sprites/tiles/${id}.png`,
      srcWidth: TILE_SRC,
      srcHeight: TILE_SRC,
      scale: TILE_SCALE,
      description: `Grass tile (${id})`,
      placeholderColor: '#57a05c',
    } satisfies SpriteEntry,
  ])
) as Record<GroundTileId, SpriteEntry>

// ─── UI sprites ───────────────────────────────────────────────────────────────

export type UiSpriteKey = 'padlock_closed'

export const UI_SPRITES: Record<UiSpriteKey, SpriteEntry> = {
  padlock_closed: {
    path: '/sprites/ui/padlock_closed.png',
    srcWidth: 16,
    srcHeight: 16,
    scale: 2,
    description: 'Locked',
    placeholderColor: '#f0902a',
  },
}
