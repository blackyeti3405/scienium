/**
 * Vocabulary Builder — pure, DB-free, LLM-free CANDIDATE extraction. Terms are
 * lifted mechanically from a paper's own `title`/`abstract`/`fullText`, each
 * carrying either an authored-dictionary definition (see `vocab-dictionary.ts`)
 * or the paper's own verbatim sentence. Nothing here is ever model-generated —
 * this module has no Anthropic dependency.
 *
 * This module produces a CANDIDATE POOL, not a finished deck. Selection and
 * definition-writing happen in `vocab-curate.ts` (one cached LLM call per
 * paper). The split matters: a mechanical detector can find every phrase a
 * paper repeats, but it cannot tell "series elastic actuator" (worth a card)
 * from "foot" (the paper's subject, which the reader already knows). Optimize
 * this stage for RECALL and let curation pick.
 *
 * Four deterministic detectors, run in precedence order:
 *   1. Schwartz-Hearst acronym pairing — the paper's own authors define the
 *      acronym, so the extracted definition is verbatim and grounded at
 *      zero cost. Highest precedence.
 *   2. Authored-dictionary hits — a whole-phrase scan against
 *      `GROUNDED_INDEX` (the ~70 RESEARCH_GLOSSARY terms + the Data
 *      Terminal guides' concepts).
 *   3. Repeated technical phrases (1-3 grams, stopword/boilerplate
 *      filtered, min-frequency gated) — a phrase a paper repeats is that
 *      paper's vocabulary, by construction.
 *   4. Bare acronyms the paper never spells out — jargon by definition, and
 *      the one kind of term a student cannot look up.
 *
 * Four rules here exist because breaking them shipped bad cards (see
 * `vocab.test.ts` — every one has a regression test):
 *
 *  - **Short dictionary terms need case.** Scanning `\bOR\b` case-insensitively
 *    matched every English "or" in a prosthetics paper and ranked "odds ratio"
 *    the #1 term — the false hits are what inflated its frequency. Acronym-like
 *    entries now match case-sensitively, and single-character entries (`n`) are
 *    never scanned at all: no mechanical signal distinguishes a stray letter
 *    from a sample-size symbol.
 *
 *  - **The first occurrence is not the best quote.** Journal front matter has no
 *    sentence terminator, so the header, title, author list, and first abstract
 *    sentence collapse into one giant pseudo-sentence at index 0 — which is the
 *    first "usage" of every title word. Quotes are now chosen by `pickQuote`,
 *    which scores candidates and rejects front matter.
 *
 *  - **Quote matching is whole-word.** `includes()` matched "ROM" inside "from"
 *    and "SEA" inside "research", so acronym cards quoted sentences their term
 *    never appears in — plausibly enough that only a spot check caught it.
 *
 *  - **Page furniture must die before anything is counted.** A publisher's
 *    access banner repeats once per page, which reads to a frequency counter as
 *    the paper's most important phrase. Left in, it ranked "IEEE Xplore" and
 *    "GAZI UNIV" above the paper's actual vocabulary.
 */

import STOPWORDS from './vocab-stopwords.json'
import { GROUNDED_INDEX } from './vocab-dictionary'

// Mirrors grading.ts's PAPER_TEXT_SLICE_CHARS convention — a byte cap on the
// paper text this module ever looks at.
export const VOCAB_TEXT_SLICE_CHARS = 60_000
/** Cards kept per paper — the deck size curation selects down to. */
export const VOCAB_MAX_TERMS_PER_PAPER = 12
/**
 * Candidates handed to curation. Wide enough that a good term can't be crowded
 * out by the paper's high-frequency subject words, small enough to stay one
 * cheap prompt.
 *
 * Sized by what nearly got lost: an acronym the paper uses once (SEA) scores
 * ~2.4 on `log(1 + freq)`, well below a subject word repeated fifty times, yet
 * it is exactly the term a student cannot look up. Each extra slot costs ~30
 * prompt tokens and curation drops what does not belong, so recall is cheap
 * here and a miss is not recoverable downstream.
 */
export const VOCAB_MAX_CANDIDATES = 60
/**
 * Candidate slots reserved for acronyms, which never compete on frequency.
 * A real paper carries a couple of dozen (jang2021 has 27), and the once-used
 * tail is where the value is — SEA, ROM, GRF, and IMU all appear exactly once.
 * Sized to admit essentially all of them; the cap only guards a pathological
 * input, since curation is what decides which are worth a card.
 */
const VOCAB_ACRONYM_SLOTS = 30
const VOCAB_MIN_UNIGRAM_FREQ = 3
export const VOCAB_MIN_NGRAM_FREQ = 2
/**
 * Dictionary entries shorter than this are never scanned. At one character
 * there is no mechanical difference between the statistic `n` and any stray
 * letter n in the text.
 */
const VOCAB_MIN_DICTIONARY_TERM_CHARS = 2

/** Mirrors the `vocab_source` enum in schema.prisma — how a STORED card is attributed. */
export type TermSource =
  | 'research_glossary'
  | 'stats_guide'
  | 'methods_guide'
  | 'data_quality_guide'
  | 'paper_definition'
  | 'paper_context'
  /** Written by `vocab-curate.ts`. Never produced by this module. */
  | 'llm_definition'

/**
 * How a CANDIDATE was found. Deliberately not the same set as `TermSource`:
 * `paper_acronym` is a detection channel, not an attribution — curation folds
 * it into `llm_definition` once it writes the definition, so it never reaches
 * the database and has no `vocab_source` value.
 */
export type ExtractedSource =
  | 'research_glossary'
  | 'stats_guide'
  | 'methods_guide'
  | 'data_quality_guide'
  | 'paper_definition'
  | 'paper_context'
  | 'paper_acronym'

export interface ExtractedTerm {
  /** Canonical dedupe key (see `canonicalKey`). */
  termKey: string
  /** Display surface form. */
  term: string
  /** e.g. the acronym for an expanded term. */
  aliases: string[]
  /**
   * Authored dictionary text, or the paper's own defining sentence. EMPTY for
   * `paper_context` — no grounded definition exists, and curation writes one
   * rather than this module inventing it.
   */
  definition: string
  source: ExtractedSource
  /** Authored-dictionary entry id; null for paper_* sources. */
  sourceEntryId: string | null
  /** VERBATIM sentence from the paper showing the term in use. */
  quote: string | null
  score: number
}

const ENGLISH_STOPWORDS: ReadonlySet<string> = new Set(STOPWORDS.english)
const ACADEMIC_STOPWORDS: ReadonlySet<string> = new Set(STOPWORDS.academic)

// ─── Text normalization ────────────────────────────────────────────────────

/**
 * Slices to `VOCAB_TEXT_SLICE_CHARS`, repairs hyphenated line breaks, drops
 * everything after the LAST references/bibliography heading (reference
 * lists are author-name noise, not vocabulary), strips URLs/DOIs/emails/
 * bracketed numeric citations, and collapses whitespace.
 */
export function normalizePaperText(raw: string): string {
  let text = (raw ?? '').slice(0, VOCAB_TEXT_SLICE_CHARS)

  // Repair hyphenated line breaks: "bio-\nlogy" -> "biology".
  text = text.replace(/([A-Za-z])-\s*\r?\n\s*([a-z])/g, '$1$2')

  // Drop everything from the LAST references/bibliography/works-cited
  // heading onward.
  const headingRe = /^\s*(references|bibliography|works cited)\s*:?\s*$/gim
  let lastIndex = -1
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = headingRe.exec(text))) {
    lastIndex = headingMatch.index
  }
  if (lastIndex >= 0) text = text.slice(0, lastIndex)

  // Drop publisher page furniture BEFORE anything else counts words — these
  // banners repeat once per page and otherwise dominate frequency ranking.
  for (const pattern of PAGE_FURNITURE) text = text.replace(pattern, ' ')

  // Strip URLs, DOIs, emails, and bracketed numeric citations ([12], [3,4]).
  text = text.replace(/https?:\/\/\S+/g, ' ')
  text = text.replace(/\bdoi:\s*\S+/gi, ' ')
  text = text.replace(/\b10\.\d{4,9}\/\S+/g, ' ')
  text = text.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, ' ')
  text = text.replace(/\[\d+(?:[\s,–-]+\d+)*\]/g, ' ')

  // Collapse whitespace.
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Publisher page furniture — stamped onto every page by the download portal or
 * the journal's running header, so it repeats once per page and reads to a
 * frequency counter as the paper's most important vocabulary. Left in, an IEEE
 * paper yields "IEEE Xplore", "GAZI UNIV", "Authorized licensed", and "VOL" as
 * candidate terms, which is how "UPEA" (15 occurrences) lost its pool slot.
 *
 * These banners are standardized per publisher, which is what makes matching
 * them by pattern reasonable rather than over-fitting to one PDF.
 */
const PAGE_FURNITURE: RegExp[] = [
  // "Authorized licensed use limited to: ULAKBIM UASL - GAZI UNIV. Downloaded
  //  on ... from IEEE Xplore. Restrictions apply."
  /Authorized licensed use limited to:[\s\S]{0,200}?Restrictions apply\./gi,
  /Authorized licensed use limited to:[^.]{0,120}\./gi,
  /Downloaded on [^.]{0,100}?from IEEE Xplore[^.]{0,40}\./gi,
  /Restrictions apply\./gi,
  // Running header: "8134 IEEE ROBOTICS AND AUTOMATION LETTERS, VOL. 6, NO. 4, OCTOBER 2021"
  /\b[A-Z][A-Z]+(?:\s+[A-Z]+){0,6},\s*VOL\.\s*\d+,\s*NO\.\s*\d+,\s*[A-Za-z]+\s+\d{4}/g,
  // Copyright/permission lines.
  /©\s*\d{4}\s+IEEE[^.]{0,120}\./gi,
  /Personal use is permitted[^.]{0,160}\./gi,
  /See https?:\/\/[^\s]+ for more information\./gi,
]

const ABBREVIATIONS = ['et al.', 'fig.', 'vs.', 'e.g.', 'i.e.', 'dr.', 'approx.', 'cf.', 'eq.']

/**
 * Splits normalized text into sentences — the quote unit for every card.
 * Guards against splitting mid-abbreviation (`et al.`, `Fig.`, `vs.`, etc.).
 */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentences: string[] = []
  let start = 0
  const boundary = /[.!?]+(?=\s)/g
  let match: RegExpExecArray | null
  while ((match = boundary.exec(normalized))) {
    const endIdx = match.index + match[0].length
    const before = normalized.slice(Math.max(0, match.index - 12), endIdx).toLowerCase()
    const isAbbrev = ABBREVIATIONS.some((a) => before.endsWith(a))
    const rest = normalized.slice(endIdx)
    const nextCharMatch = rest.match(/^\s+(["“(]?[A-Z])/)
    if (!isAbbrev && nextCharMatch) {
      sentences.push(normalized.slice(start, endIdx).trim())
      start = endIdx
    }
  }
  const tail = normalized.slice(start).trim()
  if (tail) sentences.push(tail)
  return sentences.filter(Boolean)
}

/**
 * Canonical dedupe key: lowercase, collapse whitespace, strip a trailing
 * possessive, strip a trailing `s`/`es` plural.
 */
export function canonicalKey(term: string): string {
  let key = term.toLowerCase().trim().replace(/\s+/g, ' ')
  key = key.replace(/['’]s$/, '')
  if (key.endsWith('es') && key.length > 4) {
    key = key.slice(0, -2)
  } else if (key.endsWith('s') && !key.endsWith('ss') && key.length > 3) {
    key = key.slice(0, -1)
  }
  return key
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Quote selection ───────────────────────────────────────────────────────

/** A quote shorter than this teaches nothing; longer than this is a wall. */
const MIN_QUOTE_CHARS = 40
const MAX_QUOTE_CHARS = 340

/**
 * How good a sentence is AS A QUOTE, independent of any term. 0 = unusable.
 *
 * The signals are what separates a real sentence from journal furniture:
 * front matter is long, is dense with ALL-CAPS runs ("IEEE ROBOTICS AND
 * AUTOMATION LETTERS"), and is dense with digits (volume, issue, page, year).
 * A sentence that reads like prose has little of any.
 */
export function quoteQuality(sentence: string): number {
  const len = sentence.length
  if (len < MIN_QUOTE_CHARS || len > MAX_QUOTE_CHARS) return 0

  const words = sentence.split(/\s+/).filter(Boolean)
  if (words.length < 6) return 0

  const shoutyRatio = words.filter((w) => /^[A-Z]{2,}$/.test(w.replace(/[^A-Za-z]/g, ''))).length / words.length
  const digitRatio = (sentence.match(/\d/g) ?? []).length / len

  // Hard rejects: not prose at all. A mostly-shouting line is a section banner
  // ("III. EXPERIMENTAL RESULTS"); a mostly-digits line is a table row or a
  // page-number run. Quoting either teaches nothing, so they must lose even
  // when they are the ONLY sentence containing the term.
  if (shoutyRatio > 0.5 || digitRatio > 0.25) return 0

  // Soft penalties: prose that smells of front matter, but might be genuine.
  let score = 1
  if (shoutyRatio > 0.15) score *= 0.2
  if (digitRatio > 0.06) score *= 0.3
  return score
}

/**
 * The sentence that best shows the term in use. Prefers real prose over front
 * matter; ties break to the earliest sentence so the same paper always yields
 * the same card. Returns null when the paper offers nothing usable — callers
 * must treat "no quote" as a real outcome rather than substituting the title.
 */
export function pickQuote(sentences: string[], surfaces: string[]): string | null {
  // WHOLE-WORD, not substring. `includes()` here quietly handed every short
  // term someone else's sentence: "ROM" matched "f-rom", "SEA" matched
  // "re-sea-rch", and the card then quoted a sentence the term never appears
  // in — while looking perfectly plausible.
  const patterns = surfaces
    .filter(Boolean)
    .map((s) => new RegExp(`\\b${escapeRegExp(s)}\\b`, isAcronymLike(s) ? '' : 'i'))
  if (patterns.length === 0) return null

  let best: string | null = null
  let bestScore = 0
  for (const sentence of sentences) {
    if (!patterns.some((re) => re.test(sentence))) continue
    const score = quoteQuality(sentence)
    if (score > bestScore) {
      best = sentence
      bestScore = score
    }
  }
  return best
}

/**
 * True for entries written as acronyms ("OR", "SD", "CI", "ANOVA") — all-caps,
 * short, no spaces. These are the entries whose lowercase form collides with
 * ordinary English, so they must be matched with case.
 */
export function isAcronymLike(term: string): boolean {
  return /^[A-Z]{2,6}$/.test(term.trim())
}

function countWholeWord(text: string, word: string): number {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g')
  const found = text.match(re)
  return found ? found.length : 0
}

// ─── Detector 1: Schwartz-Hearst acronym pairing ───────────────────────────

const ACRONYM_RE = /([A-Za-z][A-Za-z-]+(?:\s+[A-Za-z][A-Za-z-]+){0,5})\s*\(\s*([A-Z][A-Za-z\d-]{1,7})s?\s*\)/g

// Function words the acronym's initials may skip over in the expansion.
const SKIPPABLE_WORDS: ReadonlySet<string> = new Set([
  'of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an', 'with', 'by',
])

/**
 * Strips the plural `s` off an acronym written as "(PEAs)".
 *
 * `ACRONYM_RE`'s capture group is greedy over `[A-Za-z]`, so it swallows the
 * trailing `s` and the `s?` after it never fires — the acronym arrives as
 * "PEAs" and then fails to validate against its own 3-word expansion. Only
 * strips when the remainder is all-caps, so "mRNA" and "pH" are left alone.
 */
export function normalizeAcronym(raw: string): string {
  const t = raw.trim()
  return /^[A-Z][A-Z\d-]{1,6}s$/.test(t) ? t.slice(0, -1) : t
}

/**
 * Validates that `acronym`'s letters match, in order, the initials of
 * `expansion`'s words (skipping function words). This is the Schwartz-
 * Hearst check: it yields a definition the paper's OWN authors wrote.
 *
 * Handles NESTED acronyms — a word that is itself an acronym supplies all of
 * its own letters, so "Unidirectional PEA" validly defines UPEA (U from
 * Unidirectional; P, E, A from PEA). Papers routinely introduce a compound
 * this way once the inner acronym is established, and a one-letter-per-word
 * rule silently drops exactly the paper's most specific vocabulary.
 */
export function schwartzHearstValid(expansion: string, acronym: string): boolean {
  const words = expansion.trim().split(/\s+/).filter(Boolean)
  const letters = normalizeAcronym(acronym).toUpperCase().split('')
  let wi = 0
  let li = 0

  while (li < letters.length) {
    if (wi >= words.length) return false
    const clean = words[wi].replace(/[^A-Za-z]/g, '')
    if (!clean) {
      wi++
      continue
    }

    const upper = clean.toUpperCase()
    if (isAcronymLike(clean) && letters.slice(li, li + upper.length).join('') === upper) {
      li += upper.length
      wi++
      continue
    }
    if (upper[0] === letters[li]) {
      li++
      wi++
      continue
    }
    if (SKIPPABLE_WORDS.has(words[wi].toLowerCase())) {
      wi++
      continue
    }
    return false
  }
  return true
}

/**
 * The acronym regex's expansion group is bounded but greedy, so it can
 * over-capture leading, unrelated words (e.g. "...frequently tear the
 * anterior cruciate ligament (ACL)" captures all 6 words up to the regex's
 * cap, not just the real 3-word definition). Standard Schwartz-Hearst
 * practice is to search backward from the parenthesis for the SHORTEST
 * trailing word span that validates — trying `letters.length` words first
 * and extending left only if needed. Returns the validated (possibly
 * trimmed) expansion, or null if no trailing span validates.
 */
function findValidExpansion(rawExpansion: string, acronym: string): string | null {
  const words = rawExpansion.trim().split(/\s+/).filter(Boolean)
  // Search from the SHORTEST trailing span outward. This previously started at
  // one word per acronym letter, which cannot express a nested acronym:
  // "Unidirectional PEA" is 2 words for UPEA's 4 letters, so the loop never ran
  // and the term was dropped.
  for (let len = 1; len <= words.length; len++) {
    const suffix = words.slice(words.length - len).join(' ')
    if (schwartzHearstValid(suffix, acronym)) return suffix
  }
  return null
}

// ─── Detector 4: bare acronyms ─────────────────────────────────────────────

/**
 * Caps tokens that are never a paper's vocabulary: publishers, file formats,
 * section numerals, and units. Everything else in caps is domain jargon.
 */
const ACRONYM_STOPLIST: ReadonlySet<string> = new Set([
  'IEEE', 'ACM', 'IEE', 'ISO', 'ANSI', 'ASTM', 'NIH', 'NSF', 'USA', 'UK', 'EU', 'US',
  'PDF', 'HTML', 'XML', 'URL', 'DOI', 'ISSN', 'ISBN', 'CC', 'BY', 'ID',
  'VOL', 'NO', 'PP', 'FIG', 'EQ', 'CH', 'SEC', 'REF', 'ET', 'AL', 'ED', 'EDS', 'TABLE', 'APPENDIX',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
  'AND', 'THE', 'FOR', 'WITH', 'OF', 'IN', 'ON', 'AT', 'TO', 'A', 'AN', 'OR',
  'MM', 'CM', 'KG', 'MS', 'HZ', 'KHZ', 'MHZ', 'NM', 'DEG', 'RPM', 'PSI',
])

/**
 * An acronym a paper uses without ever spelling out is the single hardest thing
 * for a student to look up — it is jargon by definition, and Google gives them
 * a disambiguation page. Detectors 1-3 only ever catch an acronym that happens
 * to be parenthetically defined, or repeated often enough to clear the unigram
 * floor; that missed SEA (used once, never defined) and PEA entirely.
 *
 * Frequency is deliberately NOT gated here: unlike an ordinary word, a caps
 * token appearing even once in a paper's body is almost certainly a term of
 * art. The candidate pool is a recall stage and curation drops what does not
 * belong, so the cost of a wrong guess is one line in a prompt.
 */
export function isBareAcronym(token: string): boolean {
  if (!/^[A-Z][A-Z\d-]{1,5}$/.test(token)) return false
  // Needs a run of real letters: "A1" and "V2" are labels, "DOF" and "AL6061"
  // are terms.
  if (!/[A-Z]{2}/.test(token)) return false
  return !ACRONYM_STOPLIST.has(token.toUpperCase())
}

/**
 * True when a caps token is a heading word rather than an acronym.
 *
 * Shape alone cannot tell "SEA" from "FOOT" — both are caps. Context can: an
 * acronym sits in ordinary prose ("By using SEA and UPEA together"), whereas a
 * caps word sits in a caps RUN, because the whole line is a title, a running
 * header, or a section banner ("AGILE WALKING ON UNEVEN TERRAIN"). Without this
 * the detector proposes AGILE, FOOT, JANG, UNEVEN, DESIGN, and TABLE as this
 * paper's vocabulary.
 */
function inCapsRun(words: string[], i: number): boolean {
  const isCaps = (w: string | undefined) => {
    const letters = (w ?? '').replace(/[^A-Za-z]/g, '')
    return letters.length > 1 && letters === letters.toUpperCase()
  }
  return isCaps(words[i - 1]) || isCaps(words[i + 1])
}

// ─── Detector 3: repeated technical phrases ────────────────────────────────

interface WordToken {
  word: string
  start: number
  end: number
}

function tokenizeWords(sentence: string): WordToken[] {
  const re = /[A-Za-z]+/g
  const tokens: WordToken[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(sentence))) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length })
  }
  return tokens
}

function isStopword(word: string): boolean {
  const lower = word.toLowerCase()
  return ENGLISH_STOPWORDS.has(lower) || ACADEMIC_STOPWORDS.has(lower)
}

// ─── Scoring ────────────────────────────────────────────────────────────────

// An acronym the paper never spells out is the hardest term for a student to
// look up, so it outranks a merely-frequent phrase even at low frequency.
const SOURCE_BONUS: Record<ExtractedSource, number> = {
  research_glossary: 3.0,
  stats_guide: 3.0,
  methods_guide: 3.0,
  data_quality_guide: 3.0,
  paper_acronym: 3.5,
  paper_definition: 2.5,
  paper_context: 1.0,
}

// A parenthetical expansion beats a bare sighting of the same acronym: the
// paper told us what it stands for, so that card carries the fuller term.
const PRECEDENCE: Record<ExtractedSource, number> = {
  paper_definition: 3,
  research_glossary: 2,
  stats_guide: 2,
  methods_guide: 2,
  data_quality_guide: 2,
  paper_acronym: 2,
  paper_context: 1,
}

function lengthBonusFor(wordCount: number): number {
  if (wordCount <= 1) return 1.0
  if (wordCount === 2) return 1.3
  return 1.4
}

interface Candidate {
  term: string
  aliases: string[]
  definition: string
  source: ExtractedSource
  sourceEntryId: string | null
  quote: string | null
  freq: number
}

// ─── Main extraction ────────────────────────────────────────────────────────

/**
 * Extracts up to `VOCAB_MAX_CANDIDATES` candidate terms from a paper, entirely
 * mechanically. Same input always yields the same ordered output.
 *
 * This is a RECALL stage — `vocab-curate.ts` decides which candidates become
 * cards. Ranking here only decides what survives the cap, so it deliberately
 * does NOT boost title/abstract terms: a paper's title words are its subject,
 * which is the one thing its reader already knows.
 */
export function extractCandidates(input: { title: string; abstract: string | null; fullText: string | null }): ExtractedTerm[] {
  const { abstract, fullText } = input
  const rawBody = fullText ?? abstract ?? ''
  const normalized = normalizePaperText(rawBody)
  const sentences = splitSentences(normalized)

  interface StoredCard extends ExtractedTerm {
    /** Narrowed: this module never stores an `llm_definition` card. */
    source: ExtractedSource
    freq: number
    wordCount: number
  }

  const cards = new Map<string, StoredCard>()
  const aliasKeyToParent = new Map<string, string>()

  function tryAdd(candidate: Candidate) {
    const key = canonicalKey(candidate.term)
    if (!key) return

    // If this key is already represented as an ALIAS of a different
    // existing card, absorb it there rather than creating a duplicate card
    // (an acronym detected on its own AND as an expansion collapses into
    // ONE card).
    const parentKey = aliasKeyToParent.get(key)
    if (parentKey && parentKey !== key) return

    const precedence = PRECEDENCE[candidate.source]
    const existing = cards.get(key)
    if (existing && PRECEDENCE[existing.source] >= precedence) return

    const wordCount = candidate.term.trim().split(/\s+/).filter(Boolean).length
    const score = Math.log(1 + candidate.freq) * lengthBonusFor(wordCount) * SOURCE_BONUS[candidate.source]

    cards.set(key, {
      termKey: key,
      term: candidate.term,
      aliases: candidate.aliases,
      definition: candidate.definition,
      source: candidate.source,
      sourceEntryId: candidate.sourceEntryId,
      quote: candidate.quote,
      score,
      freq: candidate.freq,
      wordCount,
    })

    for (const alias of candidate.aliases) {
      const aliasKey = canonicalKey(alias)
      if (aliasKey && aliasKey !== key) aliasKeyToParent.set(aliasKey, key)
    }
  }

  // ── Detector 1: acronym pairs ─────────────────────────────────────────────
  let acronymMatch: RegExpExecArray | null
  ACRONYM_RE.lastIndex = 0
  while ((acronymMatch = ACRONYM_RE.exec(normalized))) {
    const rawExpansion = acronymMatch[1].trim()
    const acronym = normalizeAcronym(acronymMatch[2])
    const expansion = findValidExpansion(rawExpansion, acronym)
    if (!expansion) continue

    // The defining sentence IS the definition here — the paper's own authors
    // wrote it. Fall back to the "expansion (ACRONYM)" span itself, which is
    // still verbatim, when the full sentence is unusable as a quote.
    const fullMatchText = acronymMatch[0]
    const defining = pickQuote(sentences, [fullMatchText]) ?? fullMatchText
    const freq = Math.max(countWholeWord(normalized, acronym), 1)

    tryAdd({
      term: expansion,
      aliases: [acronym],
      definition: defining,
      source: 'paper_definition',
      sourceEntryId: null,
      quote: defining,
      freq,
    })
  }

  // ── Detector 2: authored-dictionary hits ──────────────────────────────────
  const dictionaryEntries = Array.from(new Set(GROUNDED_INDEX.values()))
  for (const entry of dictionaryEntries) {
    const searchCandidates = [entry.term, ...entry.aliases]
      .filter(Boolean)
      .filter((c) => c.trim().length >= VOCAB_MIN_DICTIONARY_TERM_CHARS)
    let matchedSurface: string | null = null
    let freq = 0
    for (const cand of searchCandidates) {
      // Acronym-like entries ("OR", "SD", "CI") match case-SENSITIVELY: their
      // lowercase forms are ordinary English words, and matching those is what
      // put "odds ratio" at the top of a paper about ankle prostheses.
      const flags = isAcronymLike(cand) ? 'g' : 'gi'
      const re = new RegExp(`\\b${escapeRegExp(cand)}\\b`, flags)
      const found = normalized.match(re)
      if (found && found.length > 0) {
        freq += found.length
        if (!matchedSurface) matchedSurface = cand
      }
    }
    if (!matchedSurface) continue

    tryAdd({
      term: matchedSurface,
      aliases: [],
      definition: entry.definition,
      source: entry.source,
      sourceEntryId: entry.entryId,
      quote: pickQuote(sentences, searchCandidates),
      freq,
    })
  }

  // ── Detector 3: repeated technical phrases ────────────────────────────────
  const ngramOccurrences = new Map<string, { surface: string; freq: number }>()
  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si]
    const tokens = tokenizeWords(sentence)
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const window = tokens.slice(i, i + n)
        let adjacentOk = true
        for (let j = 0; j < window.length - 1; j++) {
          const gap = sentence.slice(window[j].end, window[j + 1].start)
          if (!/^\s+$/.test(gap)) {
            adjacentOk = false
            break
          }
        }
        if (!adjacentOk) continue

        const lowerWords = window.map((t) => t.word.toLowerCase())
        if (lowerWords.some((w) => w.length < 3 || isStopword(w))) continue

        const key = lowerWords.join(' ')
        const surface = sentence.slice(window[0].start, window[window.length - 1].end)
        const existing = ngramOccurrences.get(key)
        if (existing) {
          existing.freq++
        } else {
          ngramOccurrences.set(key, { surface, freq: 1 })
        }
      }
    }
  }

  // Process shortest n-grams first so longer, more specific phrases (higher
  // lengthBonus) can win ties deterministically when scores are equal, per
  // the "tie-break by termKey" rule applied downstream at sort time.
  const ngramEntries = Array.from(ngramOccurrences.entries()).sort((a, b) => a[0].split(' ').length - b[0].split(' ').length)
  for (const [key, occ] of ngramEntries) {
    const n = key.split(' ').length
    const minFreq = n === 1 ? VOCAB_MIN_UNIGRAM_FREQ : VOCAB_MIN_NGRAM_FREQ
    if (occ.freq < minFreq) continue

    // No grounded definition exists for these — `definition` stays empty and
    // curation writes one. The quote is the evidence it writes from.
    const quote = pickQuote(sentences, [occ.surface])
    if (!quote) continue // nothing to show and nothing to define from

    tryAdd({
      term: occ.surface,
      aliases: [],
      definition: '',
      source: 'paper_context',
      sourceEntryId: null,
      quote,
      freq: occ.freq,
    })
  }

  // ── Detector 4: bare acronyms the paper never spells out ──────────────────
  // Counted only inside sentences that read as prose, and only where the token
  // is not part of a caps run — both guards keep title and header words out.
  const acronymFreq = new Map<string, number>()
  for (const sentence of sentences) {
    if (quoteQuality(sentence) === 0) continue
    const words = sentence.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i++) {
      const token = words[i].replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9-]+$/, '')
      if (!isBareAcronym(token) || inCapsRun(words, i)) continue
      acronymFreq.set(token, (acronymFreq.get(token) ?? 0) + 1)
    }
  }
  for (const [token, freq] of acronymFreq) {
    const quote = pickQuote(sentences, [token])
    if (!quote) continue
    tryAdd({
      term: token,
      aliases: [],
      definition: '',
      source: 'paper_acronym',
      sourceEntryId: null,
      quote,
      freq,
    })
  }

  // ── Rank + cap ─────────────────────────────────────────────────────────────
  const ranked = Array.from(cards.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.termKey < b.termKey ? -1 : a.termKey > b.termKey ? 1 : 0
  })

  // Acronyms get reserved slots rather than competing on frequency. Scoring is
  // driven by `log(1 + freq)`, under which an acronym the paper uses ONCE (SEA,
  // score 2.43) loses to an ordinary word it uses thirteen times ("parallel",
  // 2.64) — exactly backwards, since the acronym is the term a student cannot
  // look up and the common word is one they already know. Acronyms are a small
  // bounded set per paper, so reserving space costs almost nothing.
  //
  // This MUST cover both acronym channels. A bare sighting is absorbed into the
  // spelled-out card that declares it as an alias, so protecting only
  // `paper_acronym` drops the pair together: "serial elastic actuators (SEA)"
  // is used once, scores 2.43, gets cut — and takes the absorbed bare SEA with
  // it, leaving the paper's central concept out of the deck entirely.
  const isAcronymChannel = (c: StoredCard) =>
    c.source === 'paper_acronym' || (c.source === 'paper_definition' && c.aliases.length > 0)
  const acronymKeys = new Set(
    ranked.filter(isAcronymChannel).slice(0, VOCAB_ACRONYM_SLOTS).map((c) => c.termKey),
  )
  const fillKeys = new Set(
    ranked
      .filter((c) => !acronymKeys.has(c.termKey))
      .slice(0, Math.max(0, VOCAB_MAX_CANDIDATES - acronymKeys.size))
      .map((c) => c.termKey),
  )

  // Filtering `ranked` (rather than concatenating) keeps the output in global
  // score order, so "best first" still holds for curation.
  return ranked
    .filter((c) => acronymKeys.has(c.termKey) || fillKeys.has(c.termKey))
    .map(({ freq: _freq, wordCount: _wordCount, ...rest }) => rest)
}
