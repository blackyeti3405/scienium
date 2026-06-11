/**
 * Sprite asset manifest — single source of truth for all game art.
 *
 * ASSET SPEC FOR ARTISTS (Aseprite or compatible tool)
 * ────────────────────────────────────────────────────
 * Directory:  apps/web/public/sprites/
 *
 * Lab exterior sprites (lab/ subdirectory):
 *   Dimensions:  48×32 px source → displayed at 3× scale (144×96 CSS px)
 *   Format:      PNG-8 or PNG-32, indexed palette recommended
 *   Naming:      {lab_type}_{size}.png  e.g. generic_small.png, biocore_grown.png
 *   Color depth: 16–32 colors per sprite
 *
 *   Files needed:
 *     generic_small.png    — Used during DISCOVERY & LAB_SELECTION phases
 *     generic_grown.png    — Fallback for grown lab with unknown type
 *     biocore_grown.png
 *     chemworks_grown.png
 *     volt_lab_grown.png
 *     terrabase_grown.png
 *     mindframe_grown.png
 *     axiom_grown.png
 *
 * UI sprites (ui/ subdirectory):
 *   Dimensions:  16×16 px → displayed at 2× scale (32×32 CSS px)
 *
 *   Files needed:
 *     padlock_closed.png   — Nav item locked indicator
 *     padlock_open.png     — Nav item recently unlocked
 *     phase_arrow.png      — Phase progress indicator
 *
 * All sprites rendered with:
 *   image-rendering: pixelated;
 *   image-rendering: crisp-edges;
 *
 * PLACEHOLDER BEHAVIOR
 * Until real PNG files are dropped in, the <Sprite> component renders
 * a labeled colored block using the placeholder color defined here.
 * Real art is a drop-in — no code changes needed.
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

// ─── Lab exterior sprites ─────────────────────────────────────────────────────

export type LabSpriteKey =
  | 'generic_small'
  | 'generic_grown'
  | 'biocore_grown'
  | 'chemworks_grown'
  | 'volt_lab_grown'
  | 'terrabase_grown'
  | 'mindframe_grown'
  | 'axiom_grown'

export const LAB_SPRITES: Record<LabSpriteKey, SpriteEntry> = {
  generic_small: {
    path: '/sprites/lab/generic_small.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'Small generic laboratory',
    placeholderColor: '#7c8a9e',
  },
  generic_grown: {
    path: '/sprites/lab/generic_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'Grown generic laboratory',
    placeholderColor: '#5a6a7e',
  },
  biocore_grown: {
    path: '/sprites/lab/biocore_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'BioCore laboratory — life sciences',
    placeholderColor: '#2d6a4f',
  },
  chemworks_grown: {
    path: '/sprites/lab/chemworks_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'ChemWorks laboratory — chemistry',
    placeholderColor: '#6a2d5a',
  },
  volt_lab_grown: {
    path: '/sprites/lab/volt_lab_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'Volt Lab — engineering & electronics',
    placeholderColor: '#4a5c2d',
  },
  terrabase_grown: {
    path: '/sprites/lab/terrabase_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'TerraBase — earth science',
    placeholderColor: '#8b5e2a',
  },
  mindframe_grown: {
    path: '/sprites/lab/mindframe_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'MindFrame — social & cognitive science',
    placeholderColor: '#2a5a8b',
  },
  axiom_grown: {
    path: '/sprites/lab/axiom_grown.png',
    srcWidth: 48,
    srcHeight: 32,
    scale: 3,
    description: 'Axiom — math, physics & astronomy',
    placeholderColor: '#5a2a8b',
  },
}

// ─── UI sprites ───────────────────────────────────────────────────────────────

export type UiSpriteKey = 'padlock_closed' | 'padlock_open' | 'phase_arrow'

export const UI_SPRITES: Record<UiSpriteKey, SpriteEntry> = {
  padlock_closed: {
    path: '/sprites/ui/padlock_closed.png',
    srcWidth: 16,
    srcHeight: 16,
    scale: 2,
    description: 'Locked',
    placeholderColor: '#888888',
  },
  padlock_open: {
    path: '/sprites/ui/padlock_open.png',
    srcWidth: 16,
    srcHeight: 16,
    scale: 2,
    description: 'Unlocked',
    placeholderColor: '#44bb88',
  },
  phase_arrow: {
    path: '/sprites/ui/phase_arrow.png',
    srcWidth: 16,
    srcHeight: 16,
    scale: 2,
    description: 'Phase progress',
    placeholderColor: '#ffcc44',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { LabType, LabSize } from '@/lib/phase'

/** Returns the lab sprite key for a given (labType, size) pair. */
export function getLabSpriteKey(labType: LabType | null, size: LabSize): LabSpriteKey {
  if (size === 'small') return 'generic_small'
  if (!labType) return 'generic_grown'
  return `${labType}_grown` as LabSpriteKey
}
