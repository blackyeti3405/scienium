/**
 * Field Codex (Feature F13) — track index + lazy loader.
 *
 * Content is authored as DATA under `./content/<slug>.json` (one `CodexTrack`
 * per file); `pnpm --filter web codex:build`
 * (`./scripts/build-codex-tracks.mjs`) generates the thin, typed wrapper
 * `./tracks/<slug>.ts` for each — a `@generated` re-export that is the
 * code-split boundary. This keeps ~270-lesson tracks out of TypeScript (each
 * wrapper is ~10 lines, not ~29,000). This index is the ONLY eager import: it
 * exports the lightweight `CODEX_TRACKS` summary list (for the "browse full
 * library" view) plus `loadTrack`, a thin wrapper over a static `import()`
 * map so Next code-splits every track into its own chunk — mirrors
 * `lib/data-terminal/charts-guide.ts`'s `loadChartField` exactly.
 *
 * Do NOT import a `./tracks/*` module eagerly from panel code — always go
 * through `loadTrack` (or the LOADERS map in a test) so a track's full
 * lesson content is only fetched once a student actually opens it. Do NOT
 * hand-edit a `./tracks/*.ts` wrapper — edit the JSON and re-run codex:build.
 *
 * Taxonomy note: track slugs are 1:1 with the 29 Data Terminal Charts-Guide
 * fields (`lib/data-terminal/charts-guide.ts` `CHART_FIELDS`), per the
 * canonical brief source `.claude/codex-pipeline/TAXONOMY.md`. The six
 * lab-type "home" tracks from the original F13 build were retired in favor
 * of this field taxonomy — see `.claude/pipeline/changes-F13-taxonomy-reconcile.md`.
 */

import type { CodexTrack } from './types'
import type { LabType } from '@/lib/phase'

export type { CodexTrack } from './types'

export interface CodexTrackSummary {
  slug: string
  label: string
  home: boolean
  labType?: LabType
  branchCount: number
  lessonCount: number
}

/**
 * Summary metadata for every shipped track — kept in sync with the real
 * modules by `__tests__/content-shape.test.ts` (which loads every module and
 * asserts these counts match exactly). This cycle ships only the flagship
 * field, `gait-biomechanics` (full depth: an 8-unit / 48-lesson deep-authored
 * Core plus the 5 canonical TAXONOMY.md subfield branches — the complete,
 * exhaustive set of gait-biomechanics' subfields — each now deep-authored
 * (clinical-pathological-gait 7 units/42 lessons, prosthetics-orthotics-gait
 * 8 units/49 lessons, footwear-surface-biomechanics 7 units/45 lessons,
 * balance-stability-fall-risk 7 units/42 lessons, wearable-gait-sensing 8
 * units/48 lessons) — 274 lessons total; see
 * `.claude/pipeline/changes-gait-deepen.md` for the branch re-author that
 * replaced the original 5 shallow subfield branches, and the final append to
 * that same log for the removal of the off-taxonomy legacy Sports
 * Biomechanics branch (salvaged to
 * `.claude/codex-pipeline/salvage/sports-biomechanics-legacy.ts`)); plus the
 * now also fully-branched `acoustics-sound` (8-unit / 48-lesson deep-authored
 * Core plus all 5 canonical TAXONOMY.md subfield branches —
 * architectural-room-acoustics 8 units/47 lessons,
 * musical-acoustics-instruments 8 units/48 lessons,
 * noise-control-soundproofing 8 units/48 lessons, psychoacoustics-hearing 8
 * units/48 lessons, ultrasound-vibration 8 units/48 lessons — 287 lessons
 * total; see `.claude/pipeline/changes-acoustics-core.md` for Core and
 * `.claude/pipeline/changes-acoustics-subfields.md` for the branch splice);
 * plus the now also fully-branched `astronomy-astrophysics` (8-unit /
 * 48-lesson deep-authored Core — the sky and its objects, light as data,
 * telescopes, photometry, diagnostic plots, distance/inference, landmark
 * work and open debates, and applications — plus all 5 canonical
 * TAXONOMY.md subfield branches: cosmology 7 units/42 lessons, exoplanets 7
 * units/42 lessons, galactic-extragalactic 8 units/49 lessons,
 * observational-methods-timedomain 8 units/45 lessons, stellar-astrophysics
 * 8 units/45 lessons — 271 lessons total; see
 * `.claude/pipeline/changes-astronomy-core.md` for Core and
 * `.claude/pipeline/changes-astronomy-subfields.md` for the branch splice).
 * The remaining 27 fields in TAXONOMY.md are authored later via
 * `.claude/codex-pipeline/` the same way — append here + to LOADERS below.
 */
export const CODEX_TRACKS: CodexTrackSummary[] = [
  { slug: 'acoustics-sound', label: 'Acoustics / Sound', home: false, branchCount: 5, lessonCount: 287 },
  { slug: 'astronomy-astrophysics', label: 'Astronomy / Astrophysics', home: false, branchCount: 5, lessonCount: 271 },
  { slug: 'chemistry', label: 'Chemistry', home: false, branchCount: 5, lessonCount: 258 },
  { slug: 'gait-biomechanics', label: 'Gait Biomechanics', home: false, branchCount: 5, lessonCount: 274 },
]

type CodexTrackSlug = (typeof CODEX_TRACKS)[number]['slug']

/**
 * Static per-track dynamic-import map. Each entry is a literal `import()`
 * call so Next/webpack can statically discover and code-split every track
 * module at build time — do not replace with a computed template-string
 * import (not statically analyzable).
 */
const LOADERS: Record<CodexTrackSlug, () => Promise<{ default: CodexTrack }>> = {
  'acoustics-sound': () => import('./tracks/acoustics-sound'),
  'astronomy-astrophysics': () => import('./tracks/astronomy-astrophysics'),
  'chemistry': () => import('./tracks/chemistry'),
  'gait-biomechanics': () => import('./tracks/gait-biomechanics'),
}

/**
 * Ordered list of the field slugs (from TAXONOMY.md) most relevant to each
 * lab type — replaces the retired `HOME_TRACK_BY_LABTYPE` six-home-track map.
 * Used for default routing/ordering when a team has no study plan yet. This
 * list intentionally includes fields that have no module yet (only
 * `gait-biomechanics` is built this cycle) — every consumer MUST filter
 * against `CODEX_TRACKS` (e.g. via `labTypeFields`) before using a slug, so
 * the map degrades gracefully as more fields are authored without another
 * code change here. Domains per lab type per docs/SPEC.md §4.
 */
export const LABTYPE_FIELDS: Record<LabType, string[]> = {
  // BioCore — Biology / Environmental Science: life sciences, ecology, genetics.
  biocore: ['molecular-cell-biology', 'genetics-genomics', 'ecology', 'immunology-microbiology', 'plant-science-agriculture'],
  // ChemWorks — Chemistry: reactions, materials, formulations.
  chemworks: ['chemistry', 'materials-science', 'nutrition-food-science', 'environmental-earth-science', 'clinical-medicine-pharmacology'],
  // Volt Lab — Engineering, Electronics, Physical Systems.
  volt_lab: ['electronics-electrical-engineering', 'robotics-control-systems', 'signal-processing', 'materials-science', 'classical-mechanics-physics'],
  // TerraBase — Earth Science: climate, geology, earth systems.
  terrabase: ['environmental-earth-science', 'geology-seismology', 'meteorology-climate', 'oceanography-limnology', 'ecology'],
  // MindFrame — Social / Cognitive Science: behavior, psychology, data.
  mindframe: ['psychology-behavioral-science', 'neuroscience', 'data-science-ml-metrics', 'epidemiology-medicine', 'sports-exercise-physiology'],
  // Axiom — Math / Physics / Astronomy: pure & applied math/physics, astronomy.
  axiom: ['classical-mechanics-physics', 'astronomy-astrophysics', 'computer-science-algorithms', 'fluid-dynamics-aerodynamics', 'optics-photonics'],
}

/**
 * `LABTYPE_FIELDS[labType]` filtered down to slugs that actually have a
 * shipped `CODEX_TRACKS` entry, in the same relevance order — the "degrades
 * gracefully" seam every consumer should call instead of using
 * `LABTYPE_FIELDS` raw. Returns `[]` once none of a lab type's preferred
 * fields are built yet (callers should fall back to some other default, e.g.
 * the flagship, in that case).
 */
export function labTypeFields(labType: LabType): string[] {
  const builtSlugs = new Set(CODEX_TRACKS.map((t) => t.slug))
  return LABTYPE_FIELDS[labType].filter((slug) => builtSlugs.has(slug))
}

/**
 * Lazily loads one track's full content. Throws on an unknown slug (mirrors
 * `loadChartField`) — callers (routes, panel) should validate the slug
 * against `CODEX_TRACKS` first if they want a friendlier error.
 */
export async function loadTrack(slug: string): Promise<CodexTrack> {
  const loader = LOADERS[slug as CodexTrackSlug]
  if (!loader) {
    throw new Error(`Unknown codex track slug: ${slug}`)
  }
  const mod = await loader()
  return mod.default
}
