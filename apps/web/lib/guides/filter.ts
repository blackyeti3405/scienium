/** Query/category pair every guide panel feeds its module's filter. */
export interface GuideFilter {
  query?: string
  category?: string | null
}

/**
 * The one substring-search implementation behind every guide module's
 * `filter*` export (stats, charts, plots, methods, data quality, research
 * glossary). Case-insensitive substring match over `fields(entry)` joined
 * with spaces, AND-ed with an optional exact category match (via
 * `categoryOf`, for modules whose entries are categorised). A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free.
 * Each module keeps its own thin wrapper so its public signature — and which
 * fields it searches — stays exactly where its tests pin it.
 */
export function filterGuideEntries<T>(
  entries: T[],
  filter: GuideFilter,
  fields: (entry: T) => string[],
  categoryOf?: (entry: T) => string,
): T[] {
  const query = filter.query?.trim().toLowerCase() ?? ''
  const category = filter.category ?? null

  return entries.filter((entry) => {
    if (category && categoryOf && categoryOf(entry) !== category) return false
    if (!query) return true

    return fields(entry).join(' ').toLowerCase().includes(query)
  })
}
