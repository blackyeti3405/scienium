/**
 * The Data Terminal's dataset shape — the spine under all three lanes
 * (Sheets / Lab / Code). Pure, DOM-free, no Prisma import, so both the client
 * grid and the API routes validate against exactly the same rules.
 *
 * See docs/architecture/data-terminal-revamp-plan.md §1–2.
 *
 * The load-bearing idea, taken from GraphPad Prism: a column's ROLE and a
 * dataset's TABLE TYPE are not cosmetic. They carry the experimental design, so
 * error bars can be DERIVED rather than configured and the analyses can refuse
 * to offer something the data cannot support. A Column table can never be
 * handed a correlation because its columns are groups, not a continuous x.
 */

// ─── Column shape ────────────────────────────────────────────────────────────

export type ColumnType = 'number' | 'text' | 'date'

/**
 * What a column MEANS, not what it contains.
 *
 * - `x`      the independent/continuous variable (time, dose, concentration)
 * - `y`      a measured value; in a Column table each y column IS a group
 * - `yErr`   pre-computed error for the y column named by `pairedWith`
 * - `xErr`   ditto on the x axis
 * - `group`  a grouping factor in LONG/tidy layout (one row per observation)
 * - `label`  row titles / subject ids / category names — never plotted as data
 * - `ignore` present in the file, excluded from every analysis and chart
 */
export type ColumnRole = 'x' | 'y' | 'yErr' | 'xErr' | 'group' | 'label' | 'ignore'

export type TableType =
  | 'xy'
  | 'column'
  | 'grouped'
  | 'contingency'
  | 'nested'
  | 'parts_of_whole'
  | 'multiple_variables'

export interface ColumnSpec {
  /**
   * Stable identity. Charts, analyses and formulas all reference columns by id
   * rather than by name, so renaming a column in the grid cannot silently break
   * a saved figure — the one thing a name-keyed design gets wrong every time.
   */
  id: string
  name: string
  unit?: string
  type: ColumnType
  role: ColumnRole
  /**
   * Replicate columns in WIDE layout: three side-by-side measurements of the
   * same condition, Prism's subcolumns. Points at the id of the `y` column they
   * replicate. Depth is exactly one — a subcolumn may not itself have subcolumns.
   *
   * Wide (`subcolumnOf`) and long (`role: 'group'`) are both supported on
   * purpose: wide is how data is recorded on paper, long is how software wants
   * it, and students arrive with both.
   */
  subcolumnOf?: string
  /** The `y` column this error column belongs to (`yErr` / `xErr` only). */
  pairedWith?: string
  /** Origin's Set Values — see `formula.ts`. Recomputed, never hand-edited. */
  formula?: string
}

/** A cell. `null` is a genuinely missing observation, never a zero. */
export type CellValue = string | number | null
export type DataRow = CellValue[]

export interface DatasetShape {
  columns: ColumnSpec[]
  rows: DataRow[]
}

// ─── Caps ────────────────────────────────────────────────────────────────────

/** Datasets one lab may hold. A refused create returns 409. */
export const MAX_DATASETS_PER_TEAM = 50
/** Rows one dataset may hold. Far past any classroom dataset. */
export const MAX_ROWS_PER_DATASET = 5_000
/** Columns one dataset may hold, replicate subcolumns included. */
export const MAX_COLUMNS_PER_DATASET = 40
export const MAX_DATASET_NAME = 120
export const MAX_COLUMN_NAME = 60
export const MAX_UNIT = 20
/** Longest a single text cell may be — a pasted paragraph is not a datum. */
export const MAX_CELL_TEXT = 200

/**
 * Byte ceiling for a dataset's `columns` + `rows` as stored. The row/column
 * caps above bound the SHAPE, but 5 000 × 40 cells of 200-character text is
 * ~40 MB, so a shape-legal dataset can still be absurd. Checked against the
 * serialized JSON, which is what actually hits Postgres.
 */
export const MAX_DATASET_BYTES = 2 * 1024 * 1024

// ─── Table types ─────────────────────────────────────────────────────────────

export interface TableTypeSpec {
  key: TableType
  label: string
  /** One line, shown in the picker — plain language, no statistics jargon. */
  blurb: string
  /** Roles selectable on this table type. Order is the dropdown order. */
  roles: ColumnRole[]
  /** Wide replicate subcolumns are meaningful here. */
  allowsReplicates: boolean
}

export const TABLE_TYPES: TableTypeSpec[] = [
  {
    key: 'xy',
    label: 'XY',
    blurb: 'One thing measured against another — time, dose, temperature, concentration.',
    roles: ['x', 'y', 'yErr', 'xErr', 'group', 'label', 'ignore'],
    allowsReplicates: true,
  },
  {
    key: 'column',
    label: 'Column',
    blurb: 'Separate groups you want to compare. Each column is one group.',
    roles: ['y', 'group', 'label', 'ignore'],
    allowsReplicates: false,
  },
  {
    key: 'grouped',
    label: 'Grouped',
    blurb: 'Two things varying at once — treatment and time, species and site.',
    roles: ['y', 'yErr', 'group', 'label', 'ignore'],
    allowsReplicates: true,
  },
  {
    key: 'contingency',
    label: 'Contingency',
    blurb: 'Counts of things in categories — survey answers, yes/no outcomes.',
    roles: ['y', 'label', 'ignore'],
    allowsReplicates: false,
  },
  {
    key: 'nested',
    label: 'Nested',
    blurb:
      'Repeated measurements inside each subject — three leaves from each of four plants. Keeps your n honest.',
    roles: ['y', 'group', 'label', 'ignore'],
    allowsReplicates: false,
  },
  {
    key: 'parts_of_whole',
    label: 'Parts of whole',
    blurb: 'Pieces that add up to a total — percentages, shares, composition.',
    roles: ['y', 'label', 'ignore'],
    allowsReplicates: false,
  },
  {
    key: 'multiple_variables',
    label: 'Multiple variables',
    blurb: 'One row per subject, one column per thing you measured about them.',
    roles: ['y', 'group', 'label', 'ignore'],
    allowsReplicates: false,
  },
]

export function tableTypeSpec(key: TableType): TableTypeSpec {
  const found = TABLE_TYPES.find((t) => t.key === key)
  // Unreachable through the zod-validated routes; a throw beats returning a
  // silently wrong role list that would let an invalid column through.
  if (!found) throw new Error(`Unknown table type: ${key}`)
  return found
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * A structural problem with a dataset, in the student's language.
 * `column` is the offending column's id where one applies.
 */
export interface DatasetIssue {
  message: string
  column?: string
  /**
   * Stable machine tag, so a caller can waive ONE issue without matching on
   * prose. Only issues a caller legitimately needs to single out carry one.
   */
  code?: 'no-columns'
}

/**
 * Structural validation shared by the grid and the API routes.
 *
 * Deliberately structural only: this says the dataset is COHERENT (ids unique,
 * rows rectangular, subcolumns pointing somewhere real), not that it is
 * analyzable. Whether a given analysis may run against it is phase D's job and
 * lives with the analyses, because that answer changes per analysis and this
 * one must not.
 */
export function validateDataset(shape: DatasetShape, tableType: TableType): DatasetIssue[] {
  const issues: DatasetIssue[] = []
  const { columns, rows } = shape
  const spec = tableTypeSpec(tableType)

  if (columns.length === 0) {
    issues.push({ message: 'A dataset needs at least one column.', code: 'no-columns' })
  }
  if (columns.length > MAX_COLUMNS_PER_DATASET) {
    issues.push({
      message: `A dataset holds at most ${MAX_COLUMNS_PER_DATASET} columns (this has ${columns.length}).`,
    })
  }
  if (rows.length > MAX_ROWS_PER_DATASET) {
    issues.push({
      message: `A dataset holds at most ${MAX_ROWS_PER_DATASET.toLocaleString()} rows (this has ${rows.length.toLocaleString()}).`,
    })
  }

  const ids = new Set<string>()
  const names = new Set<string>()
  const byId = new Map(columns.map((c) => [c.id, c]))

  for (const col of columns) {
    if (!col.id) {
      issues.push({ message: 'A column is missing its internal id.' })
    } else if (ids.has(col.id)) {
      issues.push({ message: `Two columns share the id "${col.id}".`, column: col.id })
    }
    ids.add(col.id)

    const name = col.name.trim()
    if (!name) {
      issues.push({ message: 'Every column needs a name.', column: col.id })
    } else if (name.length > MAX_COLUMN_NAME) {
      issues.push({
        message: `Column names are at most ${MAX_COLUMN_NAME} characters.`,
        column: col.id,
      })
    } else if (names.has(name.toLowerCase())) {
      // Case-insensitive: two columns called "Mass" and "mass" are
      // indistinguishable in a formula and in a chart legend.
      issues.push({ message: `Two columns are both called "${name}".`, column: col.id })
    }
    names.add(name.toLowerCase())

    if ((col.unit ?? '').length > MAX_UNIT) {
      issues.push({ message: `Units are at most ${MAX_UNIT} characters.`, column: col.id })
    }

    if (!spec.roles.includes(col.role)) {
      issues.push({
        message: `A ${spec.label} table has no "${col.role}" columns. Choose one of: ${spec.roles.join(', ')}.`,
        column: col.id,
      })
    }

    if (col.subcolumnOf !== undefined) {
      const parent = byId.get(col.subcolumnOf)
      if (!spec.allowsReplicates) {
        issues.push({
          message: `A ${spec.label} table does not use replicate subcolumns.`,
          column: col.id,
        })
      } else if (!parent) {
        issues.push({ message: 'This replicate points at a column that no longer exists.', column: col.id })
      } else if (parent.id === col.id) {
        issues.push({ message: 'A column cannot be its own replicate.', column: col.id })
      } else if (parent.role !== 'y') {
        issues.push({ message: 'Replicates may only sit under a Y column.', column: col.id })
      } else if (parent.subcolumnOf !== undefined) {
        // Depth is exactly one. Deeper nesting has no meaning in any table type
        // here and would make "which column is this a replicate of" recursive.
        issues.push({ message: 'A replicate cannot itself have replicates.', column: col.id })
      }
    }

    if (col.role === 'yErr' || col.role === 'xErr') {
      const partner = col.pairedWith ? byId.get(col.pairedWith) : undefined
      if (!partner) {
        issues.push({
          message: 'An error column must say which column it belongs to.',
          column: col.id,
        })
      } else if (partner.role !== (col.role === 'yErr' ? 'y' : 'x')) {
        issues.push({
          message: `A ${col.role} column must belong to a ${col.role === 'yErr' ? 'Y' : 'X'} column.`,
          column: col.id,
        })
      }
    }
  }

  // An XY table with two x columns is not a dataset with a mistake in it — it
  // is two datasets. Caught here because every XY analysis assumes one x.
  if (tableType === 'xy') {
    const xs = columns.filter((c) => c.role === 'x')
    if (xs.length > 1) {
      issues.push({ message: 'An XY table has exactly one X column.', column: xs[1]!.id })
    }
  }

  const width = columns.length
  const ragged = rows.findIndex((r) => r.length !== width)
  if (ragged !== -1) {
    issues.push({
      message: `Row ${ragged + 1} has ${rows[ragged]!.length} values but the table has ${width} columns.`,
    })
  }

  return issues
}

/** Serialized size of what will actually be stored, in bytes. */
export function datasetByteSize(shape: DatasetShape): number {
  return new TextEncoder().encode(JSON.stringify({ columns: shape.columns, rows: shape.rows }))
    .byteLength
}

// ─── Cell coercion ───────────────────────────────────────────────────────────

/**
 * A cell read as a number, or `null` when it is not one.
 *
 * Blank is `null`, NOT zero — the difference between "the plant did not grow"
 * and "nobody measured that day" is the whole of a missing-data policy, and
 * collapsing them is how a mean silently drops toward zero.
 */
export function numericCell(value: CellValue): number | null {
  if (value === null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** One column's values as numbers, missing cells dropped. */
export function numericColumn(shape: DatasetShape, columnId: string): number[] {
  const index = shape.columns.findIndex((c) => c.id === columnId)
  if (index === -1) return []
  const out: number[] = []
  for (const row of shape.rows) {
    const n = numericCell(row[index] ?? null)
    if (n !== null) out.push(n)
  }
  return out
}

/**
 * Coerce a raw cell to the column's declared type, clamping text length.
 * Values that cannot be coerced become `null` rather than throwing — a single
 * unparseable cell must never cost a student the rest of their import.
 */
export function coerceCell(value: unknown, type: ColumnType): CellValue {
  if (value === null || value === undefined) return null
  if (type === 'number') {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    const trimmed = String(value).trim()
    // `Number('')` is 0, so an empty cell would arrive as a real zero and drag
    // every mean computed from the column toward it. Blank is missing.
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }
  const text = String(value).trim()
  if (text === '') return null
  return text.length > MAX_CELL_TEXT ? text.slice(0, MAX_CELL_TEXT) : text
}

/**
 * The columns a brand-new dataset starts with.
 *
 * A dataset with no columns is a dead end: the grid has nothing to draw and the
 * student's first act has to be an administrative one. Every spreadsheet they
 * have ever opened started with a table, so this one does too — pre-shaped to
 * the table type they just chose, and all of it renameable.
 */
export function starterColumns(tableType: TableType): ColumnSpec[] {
  const make = (id: string, name: string, role: ColumnRole, type: ColumnType = 'number'): ColumnSpec => ({
    id,
    name,
    type,
    role,
  })

  switch (tableType) {
    case 'xy':
      return [make('c1', 'X', 'x'), make('c2', 'Y', 'y')]
    case 'column':
      return [make('c1', 'Group A', 'y'), make('c2', 'Group B', 'y')]
    case 'grouped':
      return [
        make('c1', 'Row', 'label', 'text'),
        make('c2', 'Group A', 'y'),
        make('c3', 'Group B', 'y'),
      ]
    case 'contingency':
      return [
        make('c1', 'Category', 'label', 'text'),
        make('c2', 'Outcome A', 'y'),
        make('c3', 'Outcome B', 'y'),
      ]
    case 'nested':
      // Nested design has THREE columns a student fills row-per-measurement:
      // the Treatment (the factor being compared — role `group`), the Subject
      // (the biological/independent unit measured repeatedly — role `label`,
      // which the role doc defines as "subject ids"), and the measured Value
      // (role `y`). Rows sharing a (Treatment, Subject) are replicate readings
      // of ONE unit — the structure that makes n = subjects, not measurements.
      return [
        make('c1', 'Treatment', 'group', 'text'),
        make('c2', 'Subject', 'label', 'text'),
        make('c3', 'Value', 'y'),
      ]
    case 'parts_of_whole':
      return [make('c1', 'Part', 'label', 'text'), make('c2', 'Amount', 'y')]
    case 'multiple_variables':
      return [
        make('c1', 'Subject', 'label', 'text'),
        make('c2', 'Variable 1', 'y'),
        make('c3', 'Variable 2', 'y'),
      ]
  }
}

/**
 * A number as it should be READ in the grid. The stored value keeps full
 * precision — this is display only, and the cell carries the exact value in its
 * tooltip.
 *
 * Binary floating point makes `4.2 / 3` into `1.4000000000000001`, so a
 * computed column rendered a wall of noise digits that overflowed its cell and
 * made the table unreadable. `toPrecision(12)` is past the point where any
 * real measurement carries information but short of float noise, so it collapses
 * the artefact without touching a genuine value; anything still too long for a
 * column falls back to 6 significant figures, which is how the result would be
 * written up anyway.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return ''

  // An integer is already exact — show it verbatim while it still fits a column.
  // Past that a decimal expansion is a wall of zeros nobody reads, and a lab
  // book would write it in scientific notation.
  if (Number.isInteger(value)) {
    const exact = String(value)
    return exact.length <= 12 ? exact : value.toExponential(4)
  }

  const abs = Math.abs(value)
  if (abs >= 1e9 || abs < 1e-4) return value.toExponential(4)

  const cleaned = String(Number(value.toPrecision(12)))
  return cleaned.length <= 12 ? cleaned : String(Number(value.toPrecision(6)))
}

/** A cell as it should be READ. Numbers go through `formatNumber`. */
export function formatCell(value: CellValue): string {
  if (value === null) return ''
  return typeof value === 'number' ? formatNumber(value) : value
}

/** Column ids are short and opaque; only uniqueness matters. */
export function newColumnId(existing: ColumnSpec[]): string {
  let n = existing.length + 1
  const taken = new Set(existing.map((c) => c.id))
  while (taken.has(`c${n}`)) n++
  return `c${n}`
}
