// Deterministic, local-only citation formatting. NO LLM, NO network — a judge-
// defensible offline transform (see epic §"No AI abuse in research"). The three
// style strings are cheap to store (Citation model) and never an LLM output.

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

// ─── Name parsing (best-effort; degrade to the raw string, never throw) ───────

interface Name {
  /** Family / last name. */
  last: string
  /** Given names as written (may be empty). */
  given: string
  /** Given-name initials, e.g. "F. M." (may be empty). */
  initials: string
  /** The original raw author string, used as a fallback. */
  raw: string
}

/** Turn given names into space-separated initials with periods ("Jane Q" → "J. Q."). */
function toInitials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const ch = part.replace(/[^A-Za-z]/g, '').charAt(0)
      return ch ? `${ch.toUpperCase()}.` : ''
    })
    .filter(Boolean)
    .join(' ')
}

/**
 * Parse one author string into last/given/initials. Handles the two common forms:
 *   "Last, First M."  → last="Last", given="First M."
 *   "First M. Last"   → last="Last", given="First M."
 * Single-token names (e.g. an organization) keep the whole string as `last`.
 */
function parseName(raw: string): Name {
  const trimmed = raw.trim()
  if (!trimmed) return { last: '', given: '', initials: '', raw }

  if (trimmed.includes(',')) {
    const [lastPart, ...rest] = trimmed.split(',')
    const last = lastPart.trim()
    const given = rest.join(',').trim()
    return { last, given, initials: toInitials(given), raw }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { last: parts[0], given: '', initials: '', raw }
  }
  const last = parts[parts.length - 1]
  const given = parts.slice(0, -1).join(' ')
  return { last, given, initials: toInitials(given), raw }
}

/** Guarantee the title ends with a period (unless it already ends in .?!). */
function endWithPeriod(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return /[.!?]$/.test(t) ? t : `${t}.`
}

// ─── APA (7th) — "Last, F. M." · ampersand before final · (Year). ─────────────

function apaAuthor(n: Name): string {
  if (!n.last) return n.raw
  return n.initials ? `${n.last}, ${n.initials}` : n.last
}

export function formatApa(input: CitationInput): string {
  const names = input.authors.map(parseName).filter((n) => n.last || n.raw)
  let authorPart = ''
  if (names.length === 1) {
    authorPart = apaAuthor(names[0])
  } else if (names.length > 1) {
    const formatted = names.map(apaAuthor)
    authorPart = `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`
  }
  const year = input.year != null ? `(${input.year}).` : '(n.d.).'
  const title = endWithPeriod(input.title)
  const parts = [authorPart ? `${authorPart}` : '', year, title].filter(Boolean)
  let out = parts.join(' ')
  if (input.url) out += ` ${input.url}`
  return out.trim()
}

// ─── MLA (9th) — "Last, First" · "et al." past 3 authors ──────────────────────

function mlaFullName(n: Name): string {
  if (!n.last) return n.raw
  return n.given ? `${n.last}, ${n.given}` : n.last
}

export function formatMla(input: CitationInput): string {
  const names = input.authors.map(parseName).filter((n) => n.last || n.raw)
  let authorPart = ''
  if (names.length === 1) {
    authorPart = endWithPeriod(mlaFullName(names[0]))
  } else if (names.length === 2) {
    // First author inverted, second in natural order.
    const second = names[1].given ? `${names[1].given} ${names[1].last}`.trim() : names[1].last || names[1].raw
    authorPart = endWithPeriod(`${mlaFullName(names[0])}, and ${second}`)
  } else if (names.length >= 3) {
    authorPart = endWithPeriod(`${mlaFullName(names[0])}, et al`)
  }
  const title = `"${input.title.trim().replace(/["]/g, '')}."`
  const year = input.year != null ? `${input.year}.` : ''
  const parts = [authorPart, title, year].filter(Boolean)
  let out = parts.join(' ')
  if (input.url) out += ` ${input.url}`
  return out.trim()
}

// ─── IEEE — "F. M. Last" initials-first · reference form ───────────────────────

function ieeeName(n: Name): string {
  if (!n.last) return n.raw
  return n.initials ? `${n.initials} ${n.last}` : n.last
}

export function formatIeee(input: CitationInput): string {
  const names = input.authors.map(parseName).filter((n) => n.last || n.raw)
  let authorPart = ''
  if (names.length === 1) {
    authorPart = ieeeName(names[0])
  } else if (names.length === 2) {
    authorPart = `${ieeeName(names[0])} and ${ieeeName(names[1])}`
  } else if (names.length >= 3) {
    const formatted = names.map(ieeeName)
    authorPart = `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`
  }
  const title = `"${input.title.trim().replace(/["]/g, '')},"`
  const year = input.year != null ? `${input.year}.` : ''
  const parts = [authorPart ? `${authorPart},` : '', title, year].filter(Boolean)
  let out = parts.join(' ')
  if (input.url) out += ` [Online]. Available: ${input.url}`
  return out.trim()
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
