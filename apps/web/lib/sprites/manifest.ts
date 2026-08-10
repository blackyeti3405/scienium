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

import type { LabType } from '@/lib/phase'
import { BUILDING_ANCHORS, GATEWAY_ANCHORS, type SpriteAnchor } from '@/lib/sprites/anchors.generated'
import { SPRITE_VERSIONS } from '@/lib/sprites/versions.generated'

/**
 * Append the sprite's content-hash as a `?v=<hash>` cache-bust token. This makes every
 * sprite URL content-addressed: redraw a sprite and its hash (hence URL) changes, so the
 * browser fetches fresh art instead of a stale immutable-cached copy; unchanged sprites
 * keep their URL and stay cached. The hash map is regenerated at build time
 * (scripts/gen-sprite-versions.mjs). A path with no recorded hash (e.g. a sprite not yet
 * rendered) is returned unversioned so it simply falls back to the placeholder.
 */
function versioned(path: string): string {
  const v = SPRITE_VERSIONS[path]
  return v ? `${path}?v=${v}` : path
}

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
  /**
   * Footprint anchor in SOURCE px (silhouette bottom-centre / ground contact),
   * for placing the sprite on an isometric tile. Absent for non-plot sprites
   * (tiles, UI). See lib/plot.ts + scripts/gen-sprite-anchors.py.
   */
  anchor?: SpriteAnchor
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

/** Human names for the gateways — also the raid target names (PvP snapshot). */
export const GATEWAY_LABELS: Record<GatewayKey, string> = {
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
    path: versioned(`/sprites/gateways/${key}_${skin}.png`),
    srcWidth: GATEWAY_SRC,
    srcHeight: GATEWAY_SRC,
    scale: GATEWAY_SCALE,
    description: `${GATEWAY_LABELS[key]} (${skin})`,
    placeholderColor: SKIN_PLACEHOLDER[skin],
    anchor: GATEWAY_ANCHORS[key],
  }
}

// ─── Economy buildings ────────────────────────────────────────────────────────
// Per-lab-type economy buildings authored by the /pixel-art-pipeline (catalog of
// record: art/building.md). 64×64 source @ 2× display, matching the gateways.
// Path: /sprites/buildings/{labType}/{slug}.png. Only buildings whose sprite has
// actually been rendered are listed here; the rest fall back to the placeholder.

const BUILDING_SRC = 64
const BUILDING_SCALE = 2

/** Slugs of economy buildings that have a rendered sprite, keyed by lab type. */
export const BUILDING_SPRITES: Partial<Record<LabType, readonly string[]>> = {
  volt_lab: [
    'workshop',
    'cnc-mill-shop',
    '3d-printing-shop',
    'pcb-fab',
    'robotics-bay',
    'electronics-bench',
    'mechanical-testing-rig',
    'welding-fabrication',
    'embedded-systems-lab',
    'ai-incubator',
  ],
  biocore: [
    'greenhouse',
    'specimen-vault',
    'microscopy-suite',
    'incubation-chamber',
    'wet-lab',
    'field-station',
    'aquatic-habitat',
    'genetics-sequencing-lab',
    'behavioral-observation-room',
    'bioinformatics-suite',
  ],
  chemworks: [
    'fume-hood-bench',
    'reaction-synthesis-lab',
    'spectroscopy-suite',
    'materials-testing-bay',
    'crystallography-room',
    'distillation-tower',
    'catalysis-lab',
    'polymer-workshop',
    'computational-chemistry-hub',
    'cleanroom-synthesizer',
  ],
  terrabase: [
    'sampling-station',
    'seismograph-array',
    'weather-monitoring-post',
    'geological-core-lab',
    'hydrology-bay',
    'atmospheric-sensor-array',
    'soil-analysis-lab',
    'remote-sensing-hub',
    'climate-modeling-station',
    'deep-earth-observatory',
  ],
  mindframe: [
    'interview-room',
    'survey-distribution-center',
    'behavioral-lab',
    'eye-tracking-suite',
    'statistical-analysis-hub',
    'focus-group-chamber',
    'longitudinal-study-wing',
    'eeg-biofeedback-room',
    'data-visualization-studio',
    'computational-social-science-lab',
  ],
  axiom: [
    'chalkboard-room',
    'computation-cluster',
    'particle-physics-bench',
    'optics-laboratory',
    'quantum-simulation-lab',
    'mathematical-modeling-suite',
    'observatory-dome',
    'theoretical-physics-annex',
    'numerical-methods-hub',
    'cosmology-visualization-theater',
  ],
}

/**
 * Upgrade-stage sprite suffix for a building level. The building visibly evolves at
 * the four LC tier-ups: base (L1–3) → _t2 (L4–6) → _t3 (L7–9) → _t4 (L10–14) →
 * _t5 (L15, fully-evolved). Each stage's PNG physically builds on the previous one.
 */
export function buildingStageSuffix(level: number): string {
  if (level >= 15) return '_t5'
  if (level >= 10) return '_t4'
  if (level >= 7) return '_t3'
  if (level >= 4) return '_t2'
  return ''
}

/** Resolve the sprite for an economy building, or null if none has been generated. */
export function getBuildingSprite(labType: LabType, slug: string, level = 1): SpriteEntry | null {
  if (!BUILDING_SPRITES[labType]?.includes(slug)) return null
  const suffix = buildingStageSuffix(level)
  return {
    path: versioned(`/sprites/buildings/${labType}/${slug}${suffix}.png`),
    srcWidth: BUILDING_SRC,
    srcHeight: BUILDING_SRC,
    scale: BUILDING_SCALE,
    description: `${slug.replace(/-/g, ' ')} building (${labType})${suffix ? ` (stage ${suffix.slice(2)})` : ''}`,
    placeholderColor: SKIN_PLACEHOLDER[labType],
    anchor: BUILDING_ANCHORS[`${labType}/${slug}`],
  }
}

// ─── Ground tiles ─────────────────────────────────────────────────────────────
// 6 grass tiles, 32×32 source @ 2× display (64px cells). Mostly plain grass;
// a couple carry sparse clutter. The scene tiles these deterministically.

export const GROUND_TILE_IDS = [
  'grass_1',
  'grass_2',
  'grass_flower',
  'grass_pebble',
  'grass_bush',
  'grass_shrub',
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
      path: versioned(`/sprites/tiles/${id}.png`),
      srcWidth: TILE_SRC,
      srcHeight: TILE_SRC,
      scale: TILE_SCALE,
      description: `Grass tile (${id})`,
      placeholderColor: '#57a05c',
    } satisfies SpriteEntry,
  ])
) as Record<GroundTileId, SpriteEntry>

// ─── Nature decorations ───────────────────────────────────────────────────────
// Trees / bushes / shrubs / tufts / flowers / rocks scattered on the grass by
// components/lab/DecorationLayer.tsx to give the world Stardew-style density. Source
// px sizes below (authored by art/build_decor.py); the layer displays them at 2×.

export const DECOR_IDS = [
  'shrub_mound', 'shrub_round', 'shrub_fern', 'shrub_berry',
  'rock_round', 'rock_crag', 'rock_cluster', 'rock_slab',
] as const
export type DecorId = (typeof DECOR_IDS)[number]

export interface DecorEntry {
  path: string
  /** Source width/height in px (displayed at DECOR_SCALE). */
  w: number
  h: number
}
export const DECOR_SCALE = 2

export const DECOR: Record<DecorId, DecorEntry> = {
  shrub_mound: { path: versioned('/sprites/decor/shrub_mound.png'), w: 30, h: 16 },
  shrub_round: { path: versioned('/sprites/decor/shrub_round.png'), w: 22, h: 18 },
  shrub_fern: { path: versioned('/sprites/decor/shrub_fern.png'), w: 24, h: 20 },
  shrub_berry: { path: versioned('/sprites/decor/shrub_berry.png'), w: 26, h: 18 },
  rock_round: { path: versioned('/sprites/decor/rock_round.png'), w: 20, h: 16 },
  rock_crag: { path: versioned('/sprites/decor/rock_crag.png'), w: 24, h: 18 },
  rock_cluster: { path: versioned('/sprites/decor/rock_cluster.png'), w: 28, h: 14 },
  rock_slab: { path: versioned('/sprites/decor/rock_slab.png'), w: 26, h: 13 },
}

// ─── UI sprites ───────────────────────────────────────────────────────────────

export type UiSpriteKey = 'padlock_closed'

export const UI_SPRITES: Record<UiSpriteKey, SpriteEntry> = {
  padlock_closed: {
    path: versioned('/sprites/ui/padlock_closed.png'),
    srcWidth: 16,
    srcHeight: 16,
    scale: 2,
    description: 'Locked',
    placeholderColor: '#f0902a',
  },
}

// ─── PvP spell icons + cast FX ────────────────────────────────────────────────
// Authored by `art/spellfx.py`. Three layers: shape = behaviour, colour = type,
// emblem = the building that granted it. The slug lives on the spell catalog
// (`lib/pvp/spell-catalog.ts`), so nothing here has to know about spells.

const SPELL_ICON_SRC = 32
const SPELL_ICON_SCALE = 2

/** Fallback tint per type, used when a PNG is missing (matches TYPE_COLORS). */
const TYPE_PLACEHOLDER: Record<string, string> = {
  empirical: '#3d8fd6',
  theoretical: '#8a5cd6',
  applied: '#d69432',
}

/**
 * Hotbar icon for a spell. `slug` is `SpellCatalogEntry.icon` — either
 * `sig_<buildingKey>` (signature) or `<shape>_<type>` (shared archetype).
 */
export function getSpellIcon(slug: string, type: string): SpriteEntry {
  return {
    path: versioned(`/sprites/spells/${slug}.png`),
    srcWidth: SPELL_ICON_SRC,
    srcHeight: SPELL_ICON_SRC,
    scale: SPELL_ICON_SCALE,
    description: `${slug.replace(/^sig_/, '').replace(/_/g, ' ')} spell icon`,
    placeholderColor: TYPE_PLACEHOLDER[type] ?? '#8a5cd6',
  }
}

/**
 * In-world cast effect. `blast` and `linger` are 2:1 (64×32) so they lie flat on
 * the isometric ground plane; `impact` is a square screen-space flash. All are
 * stills — the battle screen animates them with CSS.
 */
export type SpellFxKind = 'blast' | 'impact' | 'linger'

export function getSpellFx(kind: SpellFxKind, type: string): SpriteEntry {
  const wide = kind !== 'impact'
  return {
    path: versioned(`/sprites/fx/${kind}_${type}.png`),
    srcWidth: wide ? 64 : 32,
    srcHeight: 32,
    scale: SPELL_ICON_SCALE,
    description: `${kind} cast effect`,
    placeholderColor: TYPE_PLACEHOLDER[type] ?? '#8a5cd6',
  }
}
