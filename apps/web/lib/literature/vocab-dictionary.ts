/**
 * Vocabulary Builder — the GROUNDED definition index. Adapts the four
 * existing authored reference sources (already in-tree, never re-authored
 * here) into one lookup keyed by normalized term/alias text:
 *
 *   - `RESEARCH_GLOSSARY` (lib/literature/research-guide.ts, `{id, term, aliases?, definition}`)
 *   - `STATS_GUIDE` / `METHODS` / `DATA_QUALITY_GUIDE` (content/data-terminal/*.ts,
 *     all `{id, title, aliases?, definition}`)
 *
 * These four sources share the same effective shape, so ONE adapter covers
 * all of them. The Field Codex is deliberately NOT a source here — its
 * `Lesson` type is `sections: {heading, body}[]` prose with no term-keyed
 * structure, so pulling a "definition" out of it would be an unverifiable,
 * mis-attributable step (rejected by the plan).
 *
 * On a key collision, first-registered wins with this precedence:
 * `research_glossary` > `stats_guide` > `methods_guide` > `data_quality_guide`
 * (the research glossary is written for exactly this reading context).
 *
 * Pure, DB-free, LLM-free — the index is built once at module load.
 */

import { RESEARCH_GLOSSARY } from './research-guide'
import { STATS_GUIDE } from '@/content/data-terminal/stats-guide'
import { METHODS } from '@/content/data-terminal/methods-guide'
import { DATA_QUALITY_GUIDE } from '@/content/data-terminal/data-quality-guide'

export type GroundedSource = 'research_glossary' | 'stats_guide' | 'methods_guide' | 'data_quality_guide'

export interface GroundedEntry {
  key: string
  term: string
  aliases: string[]
  definition: string
  source: GroundedSource
  entryId: string
}

/** Lowercase, whitespace-collapsed lookup key. Deliberately independent of
 *  `canonicalKey` in vocab.ts (which imports this module) — keeping this
 *  module's key normalization local avoids a circular import. */
function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Strips a trailing parenthetical from a guide title, e.g.
 *  "P-value (statistical significance)" → "P-value". */
function stripTrailingParenthetical(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function buildIndex(): Map<string, GroundedEntry> {
  const index = new Map<string, GroundedEntry>()

  function register(term: string, aliases: string[], definition: string, source: GroundedSource, entryId: string) {
    const cleanTerm = term.trim()
    if (!cleanTerm) return
    const entry: GroundedEntry = { key: normalizeKey(cleanTerm), term: cleanTerm, aliases, definition, source, entryId }
    const keys = [cleanTerm, ...aliases].map(normalizeKey)
    for (const k of keys) {
      if (k && !index.has(k)) index.set(k, entry)
    }
  }

  for (const g of RESEARCH_GLOSSARY) {
    register(g.term, g.aliases ?? [], g.definition, 'research_glossary', g.id)
  }
  for (const s of STATS_GUIDE) {
    register(stripTrailingParenthetical(s.title), s.aliases ?? [], s.definition, 'stats_guide', s.id)
  }
  for (const m of METHODS) {
    register(stripTrailingParenthetical(m.title), [], m.definition, 'methods_guide', m.id)
  }
  for (const d of DATA_QUALITY_GUIDE) {
    register(stripTrailingParenthetical(d.title), d.aliases ?? [], d.definition, 'data_quality_guide', d.id)
  }

  return index
}

/** Canonical lookup key → entry, built once at module load from
 *  RESEARCH_GLOSSARY + STATS_GUIDE + METHODS + DATA_QUALITY_GUIDE. */
export const GROUNDED_INDEX: ReadonlyMap<string, GroundedEntry> = buildIndex()
