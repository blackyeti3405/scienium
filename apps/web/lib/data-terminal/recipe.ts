/**
 * Charts Guide recipe → dataset templates (Phase F).
 *
 * "Where scienium is better" #3: every Charts Guide entry already carries a
 * structured `dataNeeded: {name, unit}[]` and a reference rendering, so "Start
 * from this recipe" can pre-shape a real dataset — the right columns, named and
 * unit-tagged, with a starter chart shaped like the recipe — and drop the
 * student straight into the grid to type or import their numbers.
 *
 * This module is PURE and deterministic: no `Math.random`, no id generation
 * beyond the positional `c1/c2…`/`ch1` a brand-new dataset can't collide with,
 * no DOM, no Prisma. The caller (`ChartsGuidePanel`) hands the result to
 * `createDataset`. Kept as its own tested layer so the mapping — which
 * `dataNeeded` unit becomes a text label, which column becomes X, which table
 * type a plot implies — is verified in isolation.
 */

import {
  defaultRoles,
} from './csv'
import {
  starterColumns,
  MAX_COLUMN_NAME,
  MAX_COLUMNS_PER_DATASET,
  MAX_DATASET_NAME,
  MAX_UNIT,
  type ColumnSpec,
  type ColumnType,
  type TableType,
} from './dataset'
import { blankChart, type SheetsChartSpec, type SheetsChartType } from './sheets-chart'
import type { ChartConcept } from './charts-guide'

export interface RecipeDataset {
  name: string
  tableType: TableType
  columns: ColumnSpec[]
  /** A starter chart shaped like the recipe, when the columns support one. */
  charts?: SheetsChartSpec[]
}

/**
 * Units that name a CATEGORY rather than a measured quantity ("Site or
 * treatment (category)"), so the column holds text labels — not numbers. Typing
 * a site name into a `number` column would coerce to `null` and silently drop
 * the student's own labels, so this decides `text` vs `number` up front. Mirrors
 * the intent of `csv.ts`'s type inference, but keyed off the authored unit
 * (there are no sample values yet) rather than the data.
 */
const CATEGORY_UNITS = new Set([
  'category',
  'categorical',
  'name',
  'names',
  'label',
  'labels',
  'group',
  'groups',
  'type',
  'class',
  'text',
  'id',
])

function inferType(unit: string): ColumnType {
  const u = unit.trim().toLowerCase()
  return u.includes('categor') || CATEGORY_UNITS.has(u) ? 'text' : 'number'
}

/**
 * The unit as stored on the column: dropped for text labels (a category name
 * carries no unit) and for the authored placeholders that mean "no unit", and
 * length-clamped to what the schema accepts.
 */
function cleanUnit(unit: string, type: ColumnType): string | undefined {
  if (type === 'text') return undefined
  const u = unit.trim()
  if (!u || u.toLowerCase() === 'unitless' || u === '-' || u === '—' || u.toLowerCase() === 'n/a') {
    return undefined
  }
  return u.slice(0, MAX_UNIT)
}

/** Which table type a plot implies. Pie/donut are parts-of-whole; everything
 *  else defaults to XY — the most permissive shape (every role available), which
 *  the grid and all three lanes read, and which the student can change later. */
function tableTypeFor(plotType: string): TableType {
  const p = plotType.toLowerCase()
  if (p.includes('pie') || p.includes('donut') || p.includes('doughnut')) return 'parts_of_whole'
  return 'xy'
}

/** The Sheets chart type a plot name implies. */
function chartTypeFor(plotType: string): SheetsChartType {
  const p = plotType.toLowerCase()
  if (p.includes('pie') || p.includes('donut') || p.includes('doughnut')) return 'pie'
  if (p.includes('scatter')) return 'scatter'
  if (p.includes('area')) return 'area'
  if (p.includes('line') || p.includes('curve') || p.includes('trend') || p.includes('over time') || p.includes('vs. time') || p.includes('vs time')) {
    return 'line'
  }
  // bar / column / histogram / box / everything else the grid can draw as bars.
  return 'bar'
}

/** Bound a name, dedupe case-insensitively (the same rule `validateDataset`
 *  enforces), and fall back to a positional name for a blank one. */
function uniqueName(raw: string, index: number, taken: Set<string>): string {
  const base = (raw.trim() || `Column ${index + 1}`).slice(0, MAX_COLUMN_NAME)
  if (!taken.has(base.toLowerCase())) {
    taken.add(base.toLowerCase())
    return base
  }
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`
    const candidate = base.slice(0, MAX_COLUMN_NAME - suffix.length) + suffix
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase())
      return candidate
    }
  }
}

function buildColumns(dataNeeded: { name: string; unit: string }[], tableType: TableType): ColumnSpec[] {
  const taken = new Set<string>()
  const columns: ColumnSpec[] = dataNeeded.slice(0, MAX_COLUMNS_PER_DATASET).map((d, i) => {
    const type = inferType(d.unit)
    const unit = cleanUnit(d.unit, type)
    return {
      id: `c${i + 1}`,
      name: uniqueName(d.name, i, taken),
      type,
      role: 'ignore', // replaced by defaultRoles below
      ...(unit ? { unit } : {}),
    }
  })
  // An empty recipe (no dataNeeded) is a dead end — hand back the same shaped
  // starter columns "New dataset" would, so the student still lands on a table.
  if (columns.length === 0) return starterColumns(tableType)
  // ONE role-assignment policy, shared with CSV import: text → label, the first
  // number → X (when the table type has one), the rest → Y.
  defaultRoles(columns, tableType)
  return columns
}

/**
 * Turn a Charts Guide entry into a ready-to-create dataset: named after the
 * recipe, shaped to the plot's table type, one column per `dataNeeded` entry
 * with roles assigned exactly as a CSV import would, plus a starter chart shaped
 * like the recipe when the columns support one (a numeric column to plot).
 *
 * Deterministic and pure — the caller generates no ids and passes the result
 * straight to `createDataset`.
 */
export function recipeToDataset(concept: ChartConcept): RecipeDataset {
  const tableType = tableTypeFor(concept.plotType)
  const columns = buildColumns(concept.dataNeeded, tableType)
  const name = (concept.title.trim() || 'Chart recipe').slice(0, MAX_DATASET_NAME)

  // `blankChart` picks the X (its role-`x` column, else the first plottable) and
  // the first Y that isn't it — the same defaults the grid uses — so the starter
  // chart is valid by construction. Only emit one when there is something numeric
  // to plot and both axes resolved; otherwise the student builds the chart after
  // entering data.
  const starter = blankChart({ columns, rows: [] }, [])
  const hasNumeric = columns.some((c) => c.type === 'number')
  const charts =
    hasNumeric && starter.xColumnId && starter.yColumnIds.length > 0
      ? [{ ...starter, type: chartTypeFor(concept.plotType), title: name }]
      : undefined

  return { name, tableType, columns, ...(charts ? { charts } : {}) }
}
