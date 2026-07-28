/**
 * Pure parse/serialize helpers for the Data Terminal.
 * No React, no DOM — fully unit-testable.
 */

export interface MeasurementRow {
  id: string
  x: number
  y: number
  series: string
  note: string | null
}

export interface ParsedPoints {
  points: { x: number; y: number; series?: string; note?: string }[]
  skipped: number
}

const MAX_POINTS = 500
const MAX_SERIES = 40
const MAX_NOTE = 200

/**
 * Parse pasted spreadsheet text (tab or comma separated) into measurement points.
 * Reads RFC-4180 quoting, so `toCsv`'s own output round-trips (see
 * `csv-roundtrip.test.ts`); the reader itself is `parseDelimited` below.
 * Column order: x, y, series?, note?
 * A leading header row whose first two cells are non-numeric is detected and skipped.
 * Rows where x or y are blank or non-numeric are dropped and counted in `skipped`.
 * Returns at most 500 points; overflow rows are counted in `skipped`.
 */
export function parsePastedPoints(text: string): ParsedPoints {
  const points: { x: number; y: number; series?: string; note?: string }[] = []
  let skipped = 0

  const rows = parseDelimited(text)
  let firstDataLine = 0

  // Detect and skip a header row: first non-empty line whose BOTH first two cells are non-numeric.
  // If only one cell is non-numeric the row is a bad data row (counted in skipped below), not a header.
  for (let i = 0; i < rows.length; i++) {
    if (isBlankRow(rows[i])) continue
    const cells = rows[i]
    const x = toNumber(cells[0])
    const y = toNumber(cells[1])
    if (!Number.isFinite(x) && !Number.isFinite(y)) {
      // Both cells non-numeric — treat as header and skip silently
      firstDataLine = i + 1
    }
    break
  }

  for (let i = firstDataLine; i < rows.length; i++) {
    if (isBlankRow(rows[i])) continue

    const cells = rows[i]
    const x = toNumber(cells[0])
    const y = toNumber(cells[1])

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      skipped++
      continue
    }

    if (points.length >= MAX_POINTS) {
      skipped++
      continue
    }

    const point: { x: number; y: number; series?: string; note?: string } = { x, y }

    const rawSeries = (cells[2] ?? '').trim()
    if (rawSeries) {
      point.series = rawSeries.slice(0, MAX_SERIES)
    }

    const rawNote = (cells[3] ?? '').trim()
    if (rawNote) {
      point.note = rawNote.slice(0, MAX_NOTE)
    }

    points.push(point)
  }

  return { points, skipped }
}

/**
 * Minimal RFC-4180 reader (P2-S13). `toCsv` below quotes commas, quotes and
 * newlines, so a line-at-a-time `split(',')` could not read back this app's own
 * export: a note containing a comma shifted into the series column, and one
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
 * Parse a cell to a number. An empty or whitespace-only cell is NaN (not 0) so a
 * row with a blank x or y (e.g. a stray `,2`) is dropped, not read as the point 0.
 */
function toNumber(cell: string | undefined): number {
  const trimmed = (cell ?? '').trim()
  if (trimmed === '') return NaN
  return Number(trimmed)
}

/**
 * Serialize an experiment's measurements to RFC-4180 CSV.
 * Header: xLabel, yLabel, series, note
 * Fields containing comma, double-quote, newline, or tab are wrapped in double
 * quotes; embedded double quotes are escaped as "".
 * Line endings are CRLF per RFC-4180.
 */
export function toCsv(experiment: {
  xLabel: string
  yLabel: string
  measurements: MeasurementRow[]
}): string {
  const rows: string[] = [
    [experiment.xLabel, experiment.yLabel, 'series', 'note'].map(csvField).join(','),
  ]

  for (const m of experiment.measurements) {
    rows.push(
      [
        String(m.x),
        String(m.y),
        m.series ?? '',
        m.note ?? '',
      ]
        .map(csvField)
        .join(','),
    )
  }

  return rows.join('\r\n') + '\r\n'
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
 * The tab is not RFC-4180's business but is ours: `parsePastedPoints` accepts
 * tab-separated spreadsheet paste as well as CSV, so an unquoted tab anywhere in
 * a note would re-delimit our own export on re-import (P2-S13). Quoting is
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
