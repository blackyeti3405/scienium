// Deterministic, local-only citation formatting. NO LLM, NO network — a judge-
// defensible offline transform (see epic §"No AI abuse in research"). The three
// style strings are cheap to store (Citation model) and never an LLM output.
//
// The actual formatting algorithm lives in ./citation-core.mjs — plain JS so
// the dev seeder (scripts/seed-real-lit.mjs, a bare `node` script that can't
// import .ts source) shares the exact same implementation instead of carrying
// its own copy that could silently drift.
import * as core from './citation-core.mjs'

export interface CitationInput {
  title: string
  authors: string[]
  year: number | null
  url?: string | null
}

export interface BuiltCitation {
  year: number | null
  apa: string
  mla: string
  ieee: string
}

/** Extract a 4-digit year from a Date, else the fallback (or null). */
export function parseYear(publishedAt: Date | null, fallback?: number | null): number | null {
  if (publishedAt && !Number.isNaN(publishedAt.getTime())) {
    const y = publishedAt.getUTCFullYear()
    if (y > 0) return y
  }
  return fallback ?? null
}

// ─── APA (7th) — "Last, F. M." · ampersand before final · (Year). ─────────────

export function formatApa(input: CitationInput): string {
  return core.formatApa(input.authors, input.title, input.year, input.url)
}

// ─── MLA (9th) — "Last, First" · "et al." past 3 authors ──────────────────────

export function formatMla(input: CitationInput): string {
  return core.formatMla(input.authors, input.title, input.year, input.url)
}

// ─── IEEE — "F. M. Last" initials-first · reference form ───────────────────────

export function formatIeee(input: CitationInput): string {
  return core.formatIeee(input.authors, input.title, input.year, input.url)
}

/** Single entry point — the promote route + any backfill call this. */
export function buildCitations(input: CitationInput): BuiltCitation {
  return {
    year: input.year,
    apa: formatApa(input),
    mla: formatMla(input),
    ieee: formatIeee(input),
  }
}
