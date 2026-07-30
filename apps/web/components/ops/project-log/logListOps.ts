/**
 * Pure list transforms for the Project Log, extracted from `useProjectLog`.
 *
 * Entry numbers are the lab-notebook identity students cite ("see entry #4")
 * and reference chips render them — a renumbering bug mislabels citations
 * across the whole log. These are the transforms where that can go wrong,
 * pulled out of the hook's setState lambdas so they can be pinned.
 */

interface EntryLike {
  id: string
  entryNumber: number
  links: unknown[]
  backlinks: unknown[]
}

interface FetchedEntryLike {
  id: string
  entryNumber: number
  links?: unknown[] | null
  backlinks?: unknown[] | null
}

/**
 * Append an older page below the loaded list, deduping by id — a create/delete
 * between page fetches shifts the cursor boundary, and a duplicated row would
 * render (and renumber) twice.
 */
export function appendOlderEntries<T extends EntryLike, F extends FetchedEntryLike>(
  prev: T[],
  fetched: F[],
): Array<T | (F & { links: unknown[]; backlinks: unknown[] })> {
  const seen = new Set(prev.map((e) => e.id))
  const older = fetched
    .filter((e) => !seen.has(e.id))
    .map((e) => ({ ...e, links: e.links ?? [], backlinks: e.backlinks ?? [] }))
  return [...prev, ...older]
}

/**
 * Remove a deleted entry and close the numbering gap: every entry above the
 * deleted number shifts down by one, mirroring the server's renumbering, so
 * the list agrees with the next full load without refetching.
 */
export function removeEntryAndRenumber<T extends EntryLike>(prev: T[], deleted: { id: string; entryNumber: number }): T[] {
  return prev
    .filter((e) => e.id !== deleted.id)
    .map((e) => (e.entryNumber > deleted.entryNumber ? { ...e, entryNumber: e.entryNumber - 1 } : e))
}

/**
 * Merge a save response into the list. POST/PATCH responses omit
 * links/backlinks (and PATCH omits entryNumber), so:
 *  - create: prepend with the next number (server value wins when present);
 *  - edit: replace in place, PRESERVING the existing number and links.
 */
export function applySavedEntry<T extends EntryLike>(
  prev: T[],
  saved: Omit<T, 'entryNumber' | 'links' | 'backlinks'> & { entryNumber?: number },
  mode: 'create' | 'edit',
  total: number,
): T[] {
  if (mode === 'create') {
    return [
      { ...saved, entryNumber: saved.entryNumber ?? total + 1, links: [], backlinks: [] } as unknown as T,
      ...prev,
    ]
  }
  return prev.map((e) =>
    e.id === saved.id
      ? ({ ...saved, entryNumber: e.entryNumber, links: e.links, backlinks: e.backlinks } as unknown as T)
      : e,
  )
}
