/**
 * Pure parse/serialize helpers for the Data Terminal.
 * No React, no DOM — fully unit-testable.
 *
 * One RFC-4180 tokenizer (`parseDelimited`) feeds the N-column dataset importer
 * (`parseDatasetTable`) and the raw-record reader (`readDelimited`). The
 * tokenizer is the part that is hard to get right, so it is written once.
 */

import {
  coerceCell,
  newColumnId,
  tableTypeSpec,
  MAX_COLUMNS_PER_DATASET,
  MAX_COLUMN_NAME,
  MAX_ROWS_PER_DATASET,
  type ColumnSpec,
  type ColumnType,
  type DataRow,
  type TableType,
} from './dataset'

/**
 * The RFC-4180 reader as raw records, for callers that want cells rather than a
 * typed dataset — the grid's clipboard paste overlays values onto existing
 * columns and must not re-infer types or roles from what was pasted.
 */
export function readDelimited(text: string): string[][] {
  return parseDelimited(text).filter((r) => !isBlankRow(r))
}

/**
 * Minimal RFC-4180 reader (P2-S13). `toDatasetCsv` below quotes commas, quotes
 * and newlines, so a line-at-a-time `split(',')` could not read back this app's
 * own export: a cell containing a comma shifted into the next column, and one
 * containing a newline invented a junk row and truncated a real one.
 *
 * Handles: quoted fields, `""` as an escaped quote, embedded newlines, and CRLF
 * or LF endings. A quote is only special at the START of a field, so an
 * unquoted `he said "hi"` stays literal — pasted spreadsheet text is rarely
 * strict CSV and must not become unreadable for being sloppy.
 *
 * The delimiter is decided ONCE, from the first record, and only counts
 * characters outside quotes — a tab inside a quoted note can no longer flip a
 * comma file into tab mode.
 */
function parseDelimited(text: string): string[][] {
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"' && field === '') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }

  row.push(field)
  rows.push(row)
  return rows
}

/** Tab wins only if one appears OUTSIDE quotes before the first record break. */
function detectDelimiter(text: string): string {
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') i++
        else quoted = false
      }
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === '\t') return '\t'
    else if (ch === '\n' || ch === '\r') break
  }
  return ','
}

/**
 * A blank line — including the empty final record a trailing newline always
 * produces. Matches the old `line.trim()` emptiness check, so blank rows are
 * still skipped silently rather than counted as skipped data.
 */
function isBlankRow(cells: string[]): boolean {
  return cells.length === 1 && cells[0].trim() === ''
}

/**
 * Characters that make Excel/Sheets/LibreOffice treat a cell as a FORMULA rather
 * than text. A student's series/note text lands in a file a teacher opens, so
 * `=cmd|'/c calc'!A1` or `=HYPERLINK("http://evil","click")` would execute (or
 * phish) on open. Prefixing with a single quote forces text interpretation; the
 * quote is not displayed by the spreadsheet.
 *
 * `\t` and `\r` are included because a leading tab/CR can slip past a naive
 * check and still be parsed as the start of a formula by some importers.
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r']

/**
 * True when the whole value is a well-formed number (`-5`, `+2.5`, `1e3`).
 *
 * Such values must NOT be prefixed: a spreadsheet reads them as numbers, not
 * formulas, and quoting them would turn a measurement into text — silently
 * corrupting the teacher's copy of the data. Only a trigger character followed
 * by something that is not purely numeric (`-5 degrees`, `=cmd|…`, `+1+1`) is
 * dangerous.
 */
function isPlainNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

/**
 * Wrap a field in double quotes if it contains comma, quote, newline, or TAB
 * (RFC-4180 plus one), and neutralize spreadsheet formula injection first.
 *
 * Order matters: neutralize BEFORE quoting, so the escaping applies to the
 * value the spreadsheet will actually parse.
 *
 * The tab is not RFC-4180's business but is ours: `parseDatasetTable` accepts
 * tab-separated spreadsheet paste as well as CSV, so an unquoted tab anywhere in
 * a cell would re-delimit our own export on re-import (P2-S13). Quoting is
 * always valid CSV, so this costs nothing downstream.
 */
function csvField(value: string): string {
  const needsPrefix = !isPlainNumber(value) && FORMULA_TRIGGERS.some((c) => value.startsWith(c))
  const safe = needsPrefix ? `'${value}` : value
  if (/[",\n\r\t]/.test(safe)) {
    return '"' + safe.replace(/"/g, '""') + '"'
  }
  return safe
}

// ─── N-column dataset import (revamp phase A) ────────────────────────────────

export interface ParsedTable {
  columns: ColumnSpec[]
  rows: DataRow[]
  /** Rows past the cap, dropped. Stated to the student, never silent. */
  droppedRows: number
  /** Columns past the cap, dropped. */
  droppedColumns: number
  /** Whether the first record was consumed as a header. */
  usedHeader: boolean
}

/** Cells that parse as a finite number, over the cells that are not blank. */
function numericShare(values: string[]): number {
  const present = values.filter((v) => v.trim() !== '')
  if (present.length === 0) return 0
  const numeric = present.filter((v) => Number.isFinite(Number(v.trim())))
  return numeric.length / present.length
}

/**
 * Does record 0 look like column titles?
 *
 * The rule: at least one column where the first cell is NOT a number but the
 * rest of that column mostly IS. That is the only evidence that actually
 * distinguishes a header from a first data row, and it is the evidence a person
 * uses. A table whose data is entirely text produces no such column and so gets
 * `false` — which is why the caller can override (the grid offers a "first row
 * is a header" toggle), rather than this guessing harder and being confidently
 * wrong.
 */
function looksLikeHeader(records: string[][]): boolean {
  if (records.length < 2) return false
  // Loop, not spread — same reason as in `parseDatasetTable` below: a spread
  // over 125 000+ records throws RangeError.
  let width = 0
  for (const record of records) {
    if (record.length > width) width = record.length
  }
  for (let c = 0; c < width; c++) {
    const first = (records[0]![c] ?? '').trim()
    if (first === '' || Number.isFinite(Number(first))) continue
    const below = records.slice(1).map((r) => r[c] ?? '')
    if (numericShare(below) >= 0.5) return true
  }
  return false
}

/** A column is numeric when most of its present values parse as numbers. */
function inferType(values: string[]): ColumnType {
  return numericShare(values) >= 0.8 ? 'number' : 'text'
}

/**
 * Default roles, so an import is immediately usable without configuring
 * anything. Text columns become labels; numeric columns take the table type's
 * natural shape — an XY table's first numeric column is the x axis, everything
 * numeric after it is a y. Every role stays editable in the grid afterwards.
 */
export function defaultRoles(columns: ColumnSpec[], tableType: TableType): void {
  const allowed = tableTypeSpec(tableType).roles
  const useX = allowed.includes('x')
  let assignedX = false
  for (const col of columns) {
    if (col.type !== 'number') {
      col.role = allowed.includes('label') ? 'label' : 'ignore'
      continue
    }
    if (useX && !assignedX) {
      col.role = 'x'
      assignedX = true
    } else {
      col.role = 'y'
    }
  }
}

/**
 * Parse pasted or uploaded delimited text into a dataset.
 *
 * This drops NOTHING for being non-numeric: a text column is a legitimate
 * column (subject names, treatment labels, survey answers), and a blank cell is
 * a missing observation that has to survive as `null` rather than becoming a
 * zero. Only rows and columns past the caps are dropped, and both are counted
 * so the caller can say so.
 *
 * `hasHeader` overrides the detection in `looksLikeHeader` when the student
 * tells us; leave it undefined to auto-detect.
 */
export function parseDatasetTable(
  text: string,
  tableType: TableType,
  hasHeader?: boolean,
): ParsedTable {
  const records = parseDelimited(text).filter((r) => !isBlankRow(r))
  if (records.length === 0) {
    return { columns: [], rows: [], droppedRows: 0, droppedColumns: 0, usedHeader: false }
  }

  const usedHeader = hasHeader ?? looksLikeHeader(records)
  const headerRow = usedHeader ? records[0]! : null
  const bodyRecords = usedHeader ? records.slice(1) : records

  // A loop, not `Math.max(...records.map(...))`: V8 caps a spread at roughly
  // 125 000 arguments, and this function exists precisely to ACCEPT over-cap
  // files and report `droppedRows`. A 130 000-row datalogger export threw
  // RangeError instead, which surfaced as the file picker doing nothing at all.
  let rawWidth = 0
  for (const record of records) {
    if (record.length > rawWidth) rawWidth = record.length
  }
  const width = Math.min(rawWidth, MAX_COLUMNS_PER_DATASET)
  const droppedColumns = rawWidth - width

  const keptRecords = bodyRecords.slice(0, MAX_ROWS_PER_DATASET)
  const droppedRows = bodyRecords.length - keptRecords.length

  const columns: ColumnSpec[] = []
  const takenNames = new Set<string>()
  for (let c = 0; c < width; c++) {
    const values = keptRecords.map((r) => r[c] ?? '')
    const rawName = (headerRow?.[c] ?? '').trim()
    columns.push({
      id: newColumnId(columns),
      name: uniqueName(rawName || spreadsheetColumnName(c), takenNames),
      type: inferType(values),
      role: 'ignore', // replaced by defaultRoles below
    })
  }
  defaultRoles(columns, tableType)

  const rows: DataRow[] = keptRecords.map((record) =>
    columns.map((col, c) => coerceCell(record[c] ?? null, col.type)),
  )

  return { columns, rows, droppedRows, droppedColumns, usedHeader }
}

/**
 * Make a header name unique within the import, case-insensitively.
 *
 * Repeated headers are ordinary — three replicate columns all called "Mass" is
 * exactly the wide layout this feature is built around — but `validateDataset`
 * refuses duplicate names, so importing one produced a table that rendered on
 * screen and could never be saved. Suffixing keeps the student's own wording
 * and the meaning ("Mass 2" reads as the second Mass), rather than rejecting
 * the file or renaming it to something they would not recognise.
 */
function uniqueName(base: string, taken: Set<string>): string {
  const trimmed = base.slice(0, MAX_COLUMN_NAME)
  if (!taken.has(trimmed.toLowerCase())) {
    taken.add(trimmed.toLowerCase())
    return trimmed
  }
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`
    const candidate = trimmed.slice(0, MAX_COLUMN_NAME - suffix.length) + suffix
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase())
      return candidate
    }
  }
}

/** A, B, … Z, AA, AB — the fallback name for a column with no header. */
export function spreadsheetColumnName(index: number): string {
  let name = ''
  let n = index
  do {
    name = String.fromCharCode(65 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return name
}

/**
 * Serialize a dataset to RFC-4180 CSV, header included. Shares `csvField`, so
 * formula-injection neutralization and quoting behave exactly as they do for
 * the legacy export — a teacher opens both files in the same spreadsheet.
 */
export function toDatasetCsv(shape: { columns: ColumnSpec[]; rows: DataRow[] }): string {
  const header = shape.columns
    .map((c) => csvField(c.unit ? `${c.name} (${c.unit})` : c.name))
    .join(',')
  const body = shape.rows.map((row) =>
    row.map((cell) => csvField(cell === null ? '' : String(cell))).join(','),
  )
  return [header, ...body].join('\r\n') + '\r\n'
}
