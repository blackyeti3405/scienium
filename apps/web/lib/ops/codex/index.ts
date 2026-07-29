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
  branchCount: number
  lessonCount: number
}

/**
 * Summary metadata for every shipped track.
 *
 * GENERATED — do not hand-edit this array or the LOADERS map below. Both are
 * regenerated wholesale from `./content/*.json` by
 * `pnpm --filter web codex:merge` (`./scripts/merge-codex-segments.mjs`), which
 * is how `/codex-pipeline` ships a field. `label` is read
 * from each content file; `branchCount`/`lessonCount` are counted from the real
 * data, so they cannot drift from it (`__tests__/content-shape.test.ts` asserts
 * that independently, and `codex:build --check` fails on any registry drift).
 *
 * To add a field, run `/codex-pipeline <field-slug>` — never by editing this
 * file. The remaining fields in `.claude/codex-pipeline/TAXONOMY.md` are authored
 * the same way; `STATUS.md` there tracks what's built.
 *
 * `LABTYPE_FIELDS` further down is the exception: it is an editorial routing
 * decision, not derivable from content, and stays hand-maintained.
 */
export const CODEX_TRACKS: CodexTrackSummary[] = [
  { slug: 'acoustics-sound', label: 'Acoustics / Sound', branchCount: 5, lessonCount: 287 },
  { slug: 'astronomy-astrophysics', label: 'Astronomy / Astrophysics', branchCount: 5, lessonCount: 271 },
  { slug: 'chemistry', label: 'Chemistry', branchCount: 5, lessonCount: 258 },
  { slug: 'classical-mechanics-physics', label: 'Classical Mechanics / Physics', branchCount: 5, lessonCount: 275 },
  { slug: 'clinical-medicine-pharmacology', label: 'Clinical Medicine / Pharmacology', branchCount: 5, lessonCount: 275 },
  { slug: 'computer-science-algorithms', label: 'Computer Science / Algorithms', branchCount: 5, lessonCount: 275 },
  { slug: 'data-science-ml-metrics', label: 'Data Science / ML Metrics', branchCount: 5, lessonCount: 275 },
  { slug: 'ecology', label: 'Ecology', branchCount: 5, lessonCount: 275 },
  { slug: 'electronics-electrical-engineering', label: 'Electronics / Electrical Engineering', branchCount: 5, lessonCount: 275 },
  { slug: 'environmental-earth-science', label: 'Environmental / Earth Science', branchCount: 5, lessonCount: 275 },
  { slug: 'epidemiology-medicine', label: 'Epidemiology / Medicine', branchCount: 5, lessonCount: 275 },
  { slug: 'fluid-dynamics-aerodynamics', label: 'Fluid Dynamics / Aerodynamics', branchCount: 5, lessonCount: 275 },
  { slug: 'gait-biomechanics', label: 'Gait Biomechanics', branchCount: 5, lessonCount: 274 },
]

type CodexTrackSlug = (typeof CODEX_TRACKS)[number]['slug']

/**
 * Static per-track dynamic-import map. GENERATED alongside CODEX_TRACKS above —
 * see that comment. Each entry is a literal `import()` call so Next/webpack can
 * statically discover and code-split every track module at build time; the
 * generator emits literals for exactly this reason, and a computed
 * template-string import (not statically analyzable) would break code-splitting.
 */
const LOADERS: Record<CodexTrackSlug, () => Promise<{ default: CodexTrack }>> = {
  'acoustics-sound': () => import('./tracks/acoustics-sound'),
  'astronomy-astrophysics': () => import('./tracks/astronomy-astrophysics'),
  'chemistry': () => import('./tracks/chemistry'),
  'classical-mechanics-physics': () => import('./tracks/classical-mechanics-physics'),
  'clinical-medicine-pharmacology': () => import('./tracks/clinical-medicine-pharmacology'),
  'computer-science-algorithms': () => import('./tracks/computer-science-algorithms'),
  'data-science-ml-metrics': () => import('./tracks/data-science-ml-metrics'),
  'ecology': () => import('./tracks/ecology'),
  'electronics-electrical-engineering': () => import('./tracks/electronics-electrical-engineering'),
  'environmental-earth-science': () => import('./tracks/environmental-earth-science'),
  'epidemiology-medicine': () => import('./tracks/epidemiology-medicine'),
  'fluid-dynamics-aerodynamics': () => import('./tracks/fluid-dynamics-aerodynamics'),
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
