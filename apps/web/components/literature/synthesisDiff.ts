import type { SynthesisMatrixResponse } from './synthesisApi'
import { cellKey } from './synthesisSlug'

/**
 * Name what actually moved between two snapshots of one synthesis matrix.
 *
 * The stale-grid 409 (P1-R13) told the student "your grid changed" and stopped
 * there. On a shared grid that is the least useful half of the message: the
 * student has to hunt for the edit before they can decide whether to re-check.
 * The client already reloads the fresh matrix in that branch, so both snapshots
 * are in hand — the diff costs one pass over the cells and no extra request.
 *
 * Returns null when nothing describable differs. The 409 branch also covers
 * client-side refusals ("some cells could not be saved", "already being
 * checked") where the grid did NOT move; those get no appended detail rather
 * than an invented one.
 */
export function describeGridChange(
  before: SynthesisMatrixResponse | null,
  after: SynthesisMatrixResponse | null,
): string | null {
  if (!before || !after) return null

  const parts: string[] = []

  const beforeCols = new Map(before.columns.map((c) => [c.id, c.label]))
  const afterCols = new Map(after.columns.map((c) => [c.id, c.label]))

  const added = after.columns.filter((c) => !beforeCols.has(c.id))
  const removed = before.columns.filter((c) => !afterCols.has(c.id))
  const renamed = after.columns.filter((c) => beforeCols.has(c.id) && beforeCols.get(c.id) !== c.label)

  for (const c of added) parts.push(`the ${quote(c.label)} column was added`)
  for (const c of removed) parts.push(`the ${quote(c.label)} column was removed`)
  for (const c of renamed) parts.push(`${quote(beforeCols.get(c.id)!)} was renamed to ${quote(c.label)}`)

  const beforePapers = new Map(before.papers.map((p) => [p.id, p.title]))
  const afterPapers = new Map(after.papers.map((p) => [p.id, p.title]))

  const papersAdded = after.papers.filter((p) => !beforePapers.has(p.id))
  const papersRemoved = before.papers.filter((p) => !afterPapers.has(p.id))

  for (const p of papersAdded) parts.push(`${quote(shorten(p.title))} was added as a source`)
  for (const p of papersRemoved) parts.push(`${quote(shorten(p.title))} was removed`)

  // Cells are only comparable where BOTH the paper and the column survived —
  // a cell that vanished with its column is already reported as the column.
  const beforeCells = new Map(before.cells.map((c) => [cellKey(c.paperId, c.columnId), c.text]))
  const changed: { paperId: string; columnId: string }[] = []
  for (const c of after.cells) {
    if (!beforePapers.has(c.paperId) || !beforeCols.has(c.columnId)) continue
    if ((beforeCells.get(cellKey(c.paperId, c.columnId)) ?? '') !== c.text) {
      changed.push({ paperId: c.paperId, columnId: c.columnId })
    }
  }
  // A cell emptied to '' server-side has no row in `after.cells` at all, so the
  // reverse direction has to be walked too.
  const afterCells = new Set(after.cells.map((c) => cellKey(c.paperId, c.columnId)))
  for (const c of before.cells) {
    if (!afterPapers.has(c.paperId) || !afterCols.has(c.columnId)) continue
    if (!afterCells.has(cellKey(c.paperId, c.columnId)) && c.text.trim() !== '') {
      changed.push({ paperId: c.paperId, columnId: c.columnId })
    }
  }

  if (changed.length === 1) {
    const [only] = changed
    const col = afterCols.get(only!.columnId) ?? beforeCols.get(only!.columnId)
    const paper = afterPapers.get(only!.paperId) ?? beforePapers.get(only!.paperId)
    parts.push(
      col && paper
        ? `the ${quote(col)} cell for ${quote(shorten(paper))} was edited`
        : 'one cell was edited',
    )
  } else if (changed.length > 1) {
    parts.push(`${changed.length} cells were edited`)
  }

  if (parts.length === 0) return null
  return `Changed: ${joinPhrases(parts)}.`
}

/** Two named changes is enough to orient on; past that, count the rest. */
function joinPhrases(parts: string[]): string {
  if (parts.length <= 2) return parts.join(' and ')
  return `${parts.slice(0, 2).join(', ')}, and ${parts.length - 2} other change${
    parts.length - 2 === 1 ? '' : 's'
  }`
}

function quote(s: string): string {
  return `“${s}”`
}

/** Paper titles are full academic titles — long enough to bury the sentence. */
function shorten(title: string, max = 40): string {
  const t = title.trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}
