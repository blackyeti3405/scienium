/**
 * Synthesis-matrix column-id derivation, extracted from `useSynthesisMatrix`.
 *
 * Column ids PERSIST to the DB and key every cell's text — a collision would
 * silently merge two columns' cells into one. The `taken` walk is what makes
 * a duplicate label ("Methods", "Methods") land on distinct ids.
 */
export function slugifyColumnLabel(label: string, taken: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'column'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** The composite key a cell's draft/text is stored under. */
export function cellKey(paperId: string, columnId: string): string {
  return `${paperId}:${columnId}`
}
