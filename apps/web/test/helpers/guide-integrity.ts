import { describe, expect, it } from 'vitest'

/**
 * ONE content-integrity contract for the seven authored guide datasets.
 *
 * `stats-guide`, `data-quality-guide`, `methods-guide`, `plot-guide`,
 * `charts-guide`, `research-guide` and `abstract-guide` each re-authored the
 * same six assertions — unique ids, slug-safe ids, category ∈ CATEGORIES, the
 * category round-trip, required fields non-empty, definitions that are real
 * prose — for ~146 near-identical cases across seven files. Same failure
 * coverage, one implementation.
 *
 * What deliberately did NOT move here: everything specific to one dataset (a
 * `datasetCsv` whose column counts line up, an `exampleSvg` with no `<script>`,
 * the Reading Order's non-linearity). Those stay in their own files — this
 * helper is for the assertions that were literally the same seven times.
 *
 * Row COUNTS are a floor (`minEntries`), never an equality. A count pin fails
 * on every legitimate content addition and catches nothing the unique-id and
 * round-trip checks miss. The one exception in the repo is
 * `lib/fairs/rubric-anchors.test.ts`, where 10 = 5 criteria × 2 tracks is a
 * genuine structural contract and stays an exact assertion in its own file.
 */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Crude but effective: prose ends sentences; a tooltip is one fragment. */
function sentenceCount(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
}

export interface GuideIntegrityOptions {
  /** Field holding the entry's stable slug. Default `'id'`. */
  idField?: string
  /** Field holding the entry's category/field key, when the dataset has one. */
  categoryField?: string
  /** Every legal category value. Round-tripped in BOTH directions against the data. */
  categories?: readonly string[]
  /** Fields that must be a non-empty string on every entry. */
  requiredFields: readonly string[]
  /** Fields that must read as real prose (2+ sentences) on every entry. */
  proseFields?: readonly string[]
  /** Floor on the row count — never an exact pin. */
  minEntries?: number
}

type Entry = Record<string, unknown>

/**
 * Registers the shared integrity suite for one dataset. Call at module scope
 * from the dataset's own test file, alongside its dataset-specific cases.
 */
export function describeGuideIntegrity(
  name: string,
  entries: readonly unknown[],
  opts: GuideIntegrityOptions,
): void {
  const idField = opts.idField ?? 'id'
  const rows = entries as readonly Entry[]
  const str = (row: Entry, field: string): string => {
    const value = row[field]
    expect(typeof value, `${name}: ${field} is not a string`).toBe('string')
    return value as string
  }

  describe(`${name} — content integrity`, () => {
    it(`has at least ${opts.minEntries ?? 1} entries`, () => {
      expect(rows.length).toBeGreaterThanOrEqual(opts.minEntries ?? 1)
    })

    it(`every ${idField} is unique`, () => {
      const ids = rows.map((r) => str(r, idField))
      expect(new Set(ids).size).toBe(ids.length)
    })

    it(`every ${idField} is slug-safe (lowercase, digits, single hyphens)`, () => {
      for (const r of rows) expect(str(r, idField)).toMatch(SLUG_RE)
    })

    it.each(opts.requiredFields)('every entry has a non-empty %s', (field) => {
      for (const r of rows) {
        expect(str(r, field).trim().length, `${name}: empty ${field} on ${r[idField]}`).toBeGreaterThan(0)
      }
    })

    it.each(opts.proseFields ?? [])('every %s is real prose (2+ sentences)', (field) => {
      for (const r of rows) {
        expect(
          sentenceCount(str(r, field)),
          `${name}: one-line ${field} on ${r[idField]}`,
        ).toBeGreaterThanOrEqual(2)
      }
    })

    if (opts.categoryField && opts.categories) {
      const field = opts.categoryField
      const legal = new Set(opts.categories)

      it(`every ${field} is one of the declared categories`, () => {
        for (const r of rows) {
          expect(legal.has(str(r, field)), `${name}: unknown ${field} on ${r[idField]}`).toBe(true)
        }
      })

      // Both directions: an unused category is a stale filter chip that returns
      // nothing, which is as broken as an entry filed under a category the UI
      // has no chip for.
      it('categories round-trip: none unused, none undeclared', () => {
        const inData = new Set(rows.map((r) => str(r, field)))
        expect([...legal].filter((c) => !inData.has(c)), 'declared but unused').toEqual([])
        expect([...inData].filter((c) => !legal.has(c)), 'used but undeclared').toEqual([])
      })
    }
  })
}
