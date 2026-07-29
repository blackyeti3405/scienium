/**
 * One-shot conversion from the retired Experiment/Measurement pair to a
 * `Dataset`. Pure, DOM-free, Prisma-free — the whole of the migration's logic
 * lives here so the backfill SCRIPT
 * (scripts/backfill-datasets-from-experiments.mjs) is just I/O around these
 * functions, and so the conversion is proven by unit test rather than by
 * running it against a database that has zero experiments to convert.
 *
 * Each Experiment was a single-x/single-y tracker: an `xLabel`, a `yLabel`, and
 * measurements optionally grouped by a `series` string with a free-text `note`.
 * That maps exactly onto a 4-column XY dataset — see
 * docs/SPEC.md §7.6 (Data Terminal).
 *
 * TYPE-ONLY import on purpose: the backfill script is a bare `node` .mjs that
 * imports this file directly. Native node strips TS types but does NOT resolve
 * the extensionless `./dataset` specifier of a RUNTIME import, so pulling
 * `newColumnId` in as a value would break the script at load. The id scheme is
 * the same stable `c1..cN` `newColumnId` produces for a fresh column list, so it
 * is replicated inline rather than imported.
 */

import type { ColumnSpec, DataRow } from './dataset'

/** The old `experiments` row, as the plain object the script reads via raw SQL. */
export interface BackfillExperiment {
  id: string
  title: string
  description: string
  xLabel: string
  yLabel: string
}

/** One old `measurements` row. `note` is `null` when absent — never `''`. */
export interface BackfillMeasurement {
  series: string
  x: number
  y: number
  note: string | null
}

/** The dataset payload a converted experiment produces — always an XY table. */
export interface BackfilledDataset {
  name: string
  tableType: 'xy'
  columns: ColumnSpec[]
  rows: DataRow[]
}

/**
 * Make a column name unique within the dataset, case-insensitively — the exact
 * rule `validateDataset` enforces, so the output it produces always validates.
 * `xLabel` and `yLabel` both default to "x"/"y" in the old model and can be
 * identical; the second collision becomes "x (2)", "x (3)", …
 */
function dedupeName(base: string, taken: Set<string>): string {
  let candidate = base
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
    candidate = `${base} (${n})`
  }
  taken.add(candidate.toLowerCase())
  return candidate
}

/**
 * Convert one Experiment and its Measurements into a 4-column XY dataset:
 * xLabel→X, yLabel→Y, series→a "Series" group column, note→a "Note" label
 * column. Deterministic (stable `c1..c4` ids, no randomness), so the same input
 * always yields the same dataset — which is what makes it unit-testable and the
 * script safely re-runnable.
 */
export function experimentToDataset(
  exp: BackfillExperiment,
  measurements: BackfillMeasurement[],
): BackfilledDataset {
  const columns: ColumnSpec[] = []
  const taken = new Set<string>()
  const addColumn = (name: string, role: ColumnSpec['role'], type: ColumnSpec['type']): void => {
    columns.push({ id: `c${columns.length + 1}`, name: dedupeName(name, taken), type, role })
  }

  addColumn(exp.xLabel.trim() || 'X', 'x', 'number')
  addColumn(exp.yLabel.trim() || 'Y', 'y', 'number')
  addColumn('Series', 'group', 'text')
  addColumn('Note', 'label', 'text')

  // Column order is [x, y, series, note]; a missing note stays null, never "".
  const rows: DataRow[] = measurements.map((m) => [m.x, m.y, m.series, m.note])

  return {
    name: exp.title.trim() || 'Untitled experiment',
    tableType: 'xy',
    columns,
    rows,
  }
}

/**
 * Where the once-ever idempotency marker for an experiment lives. Carried in the
 * dataset's `sourceFilename` — see the script's comment on why that avoids a
 * schema column for a one-shot backfill.
 */
export function backfillMarker(experimentId: string): string {
  return `backfill:exp:${experimentId}`
}

/**
 * True when this experiment has not been migrated yet. `existingSourceMarkers`
 * is the set of `sourceFilename` values already on the team's datasets, loaded
 * once up front, so a re-run converts only what is missing.
 */
export function needsBackfill(existingSourceMarkers: Set<string>, experimentId: string): boolean {
  return !existingSourceMarkers.has(backfillMarker(experimentId))
}
