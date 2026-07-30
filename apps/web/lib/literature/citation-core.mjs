// Deterministic, local-only citation formatting — the pure algorithm shared by
// lib/literature/citation.ts (typed object-input wrapper, used at runtime) and
// scripts/seed-real-lit.mjs (the dev seeder, which can't import .ts source).
// Plain .mjs so both a Next/TS module and a bare `node` script can import it
// without a build step. Kept in one place so a future MLA/IEEE rule change
// can't apply to one copy and not the other.

/**
 * @typedef {{ last: string, given: string, initials: string, raw: string }} Name
 */

/** Turn given names into space-separated initials with periods ("Jane Q" → "J. Q."). */
export function toInitials(given) {
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
 * @param {string} raw
 * @returns {Name}
 */
export function parseName(raw) {
  const trimmed = (raw ?? '').trim()
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
export function endWithPeriod(s) {
  const t = (s ?? '').trim()
  if (!t) return ''
  return /[.!?]$/.test(t) ? t : `${t}.`
}

// ─── APA (7th) — "Last, F. M." · ampersand before final · (Year). ─────────────

function apaAuthor(n) {
  if (!n.last) return n.raw
  return n.initials ? `${n.last}, ${n.initials}` : n.last
}

/**
 * @param {string[]} authors
 * @param {string} title
 * @param {number | null} year
 * @param {string | null | undefined} url
 */
export function formatApa(authors, title, year, url) {
  const names = authors.map(parseName).filter((n) => n.last || n.raw)
  let authorPart = ''
  if (names.length === 1) {
    authorPart = apaAuthor(names[0])
  } else if (names.length > 1) {
    const formatted = names.map(apaAuthor)
    authorPart = `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`
  }
  const yearPart = year != null ? `(${year}).` : '(n.d.).'
  const titlePart = endWithPeriod(title)
  const parts = [authorPart ? `${authorPart}` : '', yearPart, titlePart].filter(Boolean)
  let out = parts.join(' ')
  if (url) out += ` ${url}`
  return out.trim()
}

// ─── MLA (9th) — "Last, First" · "et al." past 3 authors ──────────────────────

function mlaFullName(n) {
  if (!n.last) return n.raw
  return n.given ? `${n.last}, ${n.given}` : n.last
}

/**
 * @param {string[]} authors
 * @param {string} title
 * @param {number | null} year
 * @param {string | null | undefined} url
 */
export function formatMla(authors, title, year, url) {
  const names = authors.map(parseName).filter((n) => n.last || n.raw)
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
  const titlePart = `"${(title ?? '').trim().replace(/["]/g, '')}."`
  const yearPart = year != null ? `${year}.` : ''
  const parts = [authorPart, titlePart, yearPart].filter(Boolean)
  let out = parts.join(' ')
  if (url) out += ` ${url}`
  return out.trim()
}

// ─── IEEE — "F. M. Last" initials-first · reference form ───────────────────────

function ieeeName(n) {
  if (!n.last) return n.raw
  return n.initials ? `${n.initials} ${n.last}` : n.last
}

/**
 * @param {string[]} authors
 * @param {string} title
 * @param {number | null} year
 * @param {string | null | undefined} url
 */
export function formatIeee(authors, title, year, url) {
  const names = authors.map(parseName).filter((n) => n.last || n.raw)
  let authorPart = ''
  if (names.length === 1) {
    authorPart = ieeeName(names[0])
  } else if (names.length === 2) {
    authorPart = `${ieeeName(names[0])} and ${ieeeName(names[1])}`
  } else if (names.length >= 3) {
    const formatted = names.map(ieeeName)
    authorPart = `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`
  }
  const titlePart = `"${(title ?? '').trim().replace(/["]/g, '')},"`
  const yearPart = year != null ? `${year}.` : ''
  const parts = [authorPart ? `${authorPart},` : '', titlePart, yearPart].filter(Boolean)
  let out = parts.join(' ')
  if (url) out += ` [Online]. Available: ${url}`
  return out.trim()
}
