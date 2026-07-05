/**
 * Data Terminal "Charts Guide" (Feature F13) — a static, authored reference
 * library of 250 chart-type concepts spanning the science-fair fields
 * students in this game work in, spread across 29 per-field
 * modules under `./charts/<field-slug>.ts` (~20KB of inline SVG per chart,
 * 250 charts total ≈ 5MB — far too much to ship as one eager module).
 *
 * This index module is the ONLY eager import: it exports the lightweight
 * `CHART_FIELDS` list (for populating the field dropdown) and
 * `loadChartField`, a thin wrapper over a static `import()` map so Next
 * code-splits every field into its own chunk, fetched only when a student
 * actually selects that field.
 *
 * Assembled from generator+reviewer verified JSON content (see
 * .claude/pipeline for the generation process); these modules are
 * themselves the source of truth from here on — content is typed constants
 * rendered client-side, nothing fetched from an API, nothing persisted.
 * Mirrors the `stats-guide.ts` pattern (Feature F12).
 *
 * Every entry's `exampleSvg` is a static, build-time authored inline SVG
 * string (viewBox-sized, matplotlib-rendered) with no <script> content — see
 * charts-guide.test.ts for the invariant that guards this before it is ever
 * rendered via dangerouslySetInnerHTML.
 */

export interface ChartDataNeeded {
  name: string
  unit: string
}

export interface ChartConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "astro-hr-diagram"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  /** Science-fair field this chart type is most associated with. */
  field: string
  /** The specific plot/chart type name (e.g. "Scatter plot (log-log)"). */
  plotType: string
  /** What the chart is and how to read it. */
  description: string
  /** What raw data you need to collect to build this chart, as structured (name, unit) pairs. */
  dataNeeded: ChartDataNeeded[]
  /** What the chart reveals / how to interpret it. */
  whatItTellsYou: string
  /** Inline SVG markup for a static example render of the chart. */
  exampleSvg: string
}

/** One entry per field module — drives the Charts Guide field dropdown. Sorted by label. */
export const CHART_FIELDS: { slug: string; label: string; count: number }[] = [
  { slug: 'acoustics-sound', label: "Acoustics / Sound", count: 7 },
  { slug: 'astronomy-astrophysics', label: "Astronomy / Astrophysics", count: 9 },
  { slug: 'chemistry', label: "Chemistry", count: 11 },
  { slug: 'classical-mechanics-physics', label: "Classical Mechanics / Physics", count: 10 },
  { slug: 'clinical-medicine-pharmacology', label: "Clinical Medicine / Pharmacology", count: 8 },
  { slug: 'computer-science-algorithms', label: "Computer Science / Algorithms", count: 7 },
  { slug: 'data-science-ml-metrics', label: "Data Science / ML Metrics", count: 10 },
  { slug: 'ecology', label: "Ecology", count: 10 },
  { slug: 'electronics-electrical-engineering', label: "Electronics / Electrical Engineering", count: 10 },
  { slug: 'environmental-earth-science', label: "Environmental / Earth Science", count: 10 },
  { slug: 'epidemiology-medicine', label: "Epidemiology / Medicine", count: 9 },
  { slug: 'fluid-dynamics-aerodynamics', label: "Fluid Dynamics / Aerodynamics", count: 10 },
  { slug: 'gait-biomechanics', label: "Gait Biomechanics", count: 11 },
  { slug: 'genetics-genomics', label: "Genetics / Genomics", count: 6 },
  { slug: 'geology-seismology', label: "Geology / Seismology", count: 9 },
  { slug: 'immunology-microbiology', label: "Immunology / Microbiology", count: 7 },
  { slug: 'materials-science', label: "Materials Science", count: 10 },
  { slug: 'meteorology-climate', label: "Meteorology / Climate", count: 7 },
  { slug: 'molecular-cell-biology', label: "Molecular & Cell Biology", count: 7 },
  { slug: 'neuroscience', label: "Neuroscience", count: 10 },
  { slug: 'nutrition-food-science', label: "Nutrition / Food Science", count: 7 },
  { slug: 'oceanography-limnology', label: "Oceanography / Limnology", count: 7 },
  { slug: 'optics-photonics', label: "Optics / Photonics", count: 7 },
  { slug: 'plant-science-agriculture', label: "Plant Science / Agriculture", count: 7 },
  { slug: 'psychology-behavioral-science', label: "Psychology / Behavioral Science", count: 9 },
  { slug: 'renewable-energy', label: "Renewable Energy", count: 7 },
  { slug: 'robotics-control-systems', label: "Robotics / Control Systems", count: 8 },
  { slug: 'signal-processing', label: "Signal Processing", count: 10 },
  { slug: 'sports-exercise-physiology', label: "Sports / Exercise Physiology", count: 10 },
]

type ChartFieldSlug = (typeof CHART_FIELDS)[number]['slug']

/**
 * Static per-field dynamic-import map. Each entry is a literal `import()`
 * call so Next/webpack can statically discover and code-split every field
 * module at build time — do not replace this with a computed template
 * string import, which cannot be statically analyzed.
 */
const LOADERS: Record<ChartFieldSlug, () => Promise<{ default: ChartConcept[] }>> = {
  'acoustics-sound': () => import('./charts/acoustics-sound'),
  'astronomy-astrophysics': () => import('./charts/astronomy-astrophysics'),
  'chemistry': () => import('./charts/chemistry'),
  'classical-mechanics-physics': () => import('./charts/classical-mechanics-physics'),
  'clinical-medicine-pharmacology': () => import('./charts/clinical-medicine-pharmacology'),
  'computer-science-algorithms': () => import('./charts/computer-science-algorithms'),
  'data-science-ml-metrics': () => import('./charts/data-science-ml-metrics'),
  'ecology': () => import('./charts/ecology'),
  'electronics-electrical-engineering': () => import('./charts/electronics-electrical-engineering'),
  'environmental-earth-science': () => import('./charts/environmental-earth-science'),
  'epidemiology-medicine': () => import('./charts/epidemiology-medicine'),
  'fluid-dynamics-aerodynamics': () => import('./charts/fluid-dynamics-aerodynamics'),
  'gait-biomechanics': () => import('./charts/gait-biomechanics'),
  'genetics-genomics': () => import('./charts/genetics-genomics'),
  'geology-seismology': () => import('./charts/geology-seismology'),
  'immunology-microbiology': () => import('./charts/immunology-microbiology'),
  'materials-science': () => import('./charts/materials-science'),
  'meteorology-climate': () => import('./charts/meteorology-climate'),
  'molecular-cell-biology': () => import('./charts/molecular-cell-biology'),
  'neuroscience': () => import('./charts/neuroscience'),
  'nutrition-food-science': () => import('./charts/nutrition-food-science'),
  'oceanography-limnology': () => import('./charts/oceanography-limnology'),
  'optics-photonics': () => import('./charts/optics-photonics'),
  'plant-science-agriculture': () => import('./charts/plant-science-agriculture'),
  'psychology-behavioral-science': () => import('./charts/psychology-behavioral-science'),
  'renewable-energy': () => import('./charts/renewable-energy'),
  'robotics-control-systems': () => import('./charts/robotics-control-systems'),
  'signal-processing': () => import('./charts/signal-processing'),
  'sports-exercise-physiology': () => import('./charts/sports-exercise-physiology'),
}

/**
 * Lazily loads one field's chart concepts. Returns a fresh array reference
 * each call is unnecessary — the underlying module is cached by the JS
 * module loader after the first import, so repeated calls for the same slug
 * are cheap.
 */
export async function loadChartField(slug: string): Promise<ChartConcept[]> {
  const loader = LOADERS[slug as ChartFieldSlug]
  if (!loader) {
    throw new Error(`Unknown chart field slug: ${slug}`)
  }
  const mod = await loader()
  return mod.default
}

// ─── Filtering helper ─────────────────────────────────────────────────────

/**
 * Filters an already-loaded field's charts by a case-insensitive substring
 * match on title/description/plotType. A blank or whitespace-only query
 * behaves like "no query." Pure and side-effect free — unit-testable and
 * reusable by the panel component via `useMemo`.
 */
export function filterCharts(charts: ChartConcept[], query: string): ChartConcept[] {
  const q = query.trim().toLowerCase()
  if (!q) return charts
  return charts.filter((c) => {
    const haystack = [c.title, c.description, c.plotType].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}
