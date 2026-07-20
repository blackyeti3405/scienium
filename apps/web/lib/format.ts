/** Truncate to `max` chars, appending an ellipsis when cut. */
export function truncate(s: string, max = 140) {
  return s.length > max ? `${s.slice(0, max - 3)}…` : s
}

/** Short local date ("Jan 5, 2026"); em-dash when absent. */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
