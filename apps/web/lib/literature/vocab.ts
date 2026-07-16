/**
 * Vocabulary Builder — pure, DB-free, LLM-free term extraction. Terms are
 * lifted mechanically from a paper's own `title`/`abstract`/`fullText`, each
 * with a definition GROUNDED in either an authored dictionary (see
 * `vocab-dictionary.ts`) or the paper's own verbatim sentence. Nothing here
 * is ever model-generated — this module has no Anthropic dependency.
 *
 * Three deterministic detectors, run in precedence order:
 *   1. Schwartz-Hearst acronym pairing — the paper's own authors define the
 *      acronym, so the extracted definition is verbatim and grounded at
 *      zero cost. Highest precedence.
 *   2. Authored-dictionary hits — a whole-phrase scan against
 *      `GROUNDED_INDEX` (the ~70 RESEARCH_GLOSSARY terms + the Data
 *      Terminal guides' concepts).
 *   3. Repeated technical phrases (1-3 grams, stopword/boilerplate
 *      filtered, min-frequency gated) — a phrase a paper repeats is that
 *      paper's vocabulary, by construction. No grounded definition exists
 *      for these, so the card shows the paper's own sentence context
 *      instead — NEVER an invented definition.
 *
 * No corpus IDF in v1 (deliberate): it would require loading every paper's
 * `fullText` on every build for a marginal precision gain. The static
 * `academic` stoplist plus min-frequency gating covers the same ground. A
 * future refinement could add corpus-wide term weighting.
 */

import STOPWORDS from './vocab-stopwords.json'
import { GROUNDED_INDEX } from './vocab-dictionary'

// Mirrors grading.ts's PAPER_TEXT_SLICE_CHARS convention — a byte cap on the
// paper text this module ever looks at.
export const VOCAB_TEXT_SLICE_CHARS = 60_000
export const VOCAB_MAX_TERMS_PER_PAPER = 12
export const VOCAB_MIN_UNIGRAM_FREQ = 3
export const VOCAB_MIN_NGRAM_FREQ = 2

export type TermSource =
  | 'research_glossary'
  | 'stats_guide'
  | 'methods_guide'
  | 'data_quality_guide'
  | 'paper_definition'
  | 'paper_context'

export interface ExtractedTerm {
  /** Canonical dedupe key (see `canonicalKey`). */
  termKey: string
  /** Display surface form. */
  term: string
  /** e.g. the acronym for an expanded term. */
  aliases: string[]
  /** ALWAYS grounded — authored text, or the paper's verbatim sentence. */
  definition: string
  source: TermSource
  /** Authored-dictionary entry id; null for paper_* sources. */
  sourceEntryId: string | null
  /** VERBATIM sentence from the paper (always set when we have one). */
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
 * Validates that `acronym`'s letters match, in order, the initials of
 * `expansion`'s words (skipping function words). This is the Schwartz-
 * Hearst check: it yields a definition the paper's OWN authors wrote.
 */
export function schwartzHearstValid(expansion: string, acronym: string): boolean {
  const words = expansion.trim().split(/\s+/).filter(Boolean)
  const letters = acronym.toUpperCase().split('')
  let wi = 0
  for (const letter of letters) {
    let matched = false
    while (wi < words.length) {
      const initial = words[wi].replace(/[^A-Za-z]/g, '')[0]?.toUpperCase()
      if (initial === letter) {
        wi++
        matched = true
        break
      }
      if (SKIPPABLE_WORDS.has(words[wi].toLowerCase())) {
        wi++
        continue
      }
      break
    }
    if (!matched) return false
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
  const minLen = acronym.replace(/[^A-Za-z]/g, '').length
  for (let len = minLen; len <= words.length; len++) {
    const suffix = words.slice(words.length - len).join(' ')
    if (schwartzHearstValid(suffix, acronym)) return suffix
  }
  return null
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

const SOURCE_BONUS: Record<TermSource, number> = {
  research_glossary: 3.0,
  stats_guide: 3.0,
  methods_guide: 3.0,
  data_quality_guide: 3.0,
  paper_definition: 2.5,
  paper_context: 1.0,
}

const PRECEDENCE: Record<TermSource, number> = {
  paper_definition: 3,
  research_glossary: 2,
  stats_guide: 2,
  methods_guide: 2,
  data_quality_guide: 2,
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
  source: TermSource
  sourceEntryId: string | null
  quote: string | null
  freq: number
}

// ─── Main extraction ────────────────────────────────────────────────────────

/**
 * Extracts up to `VOCAB_MAX_TERMS_PER_PAPER` terms from a paper, entirely
 * mechanically. Same input always yields the same ordered output.
 */
export function extractTerms(input: { title: string; abstract: string | null; fullText: string | null }): ExtractedTerm[] {
  const { title, abstract, fullText } = input
  const rawBody = fullText ?? abstract ?? ''
  const normalized = normalizePaperText(rawBody)
  const sentences = splitSentences(normalized)
  const titleAbstractHaystack = `${title} ${abstract ?? ''}`.toLowerCase()

  interface StoredCard extends ExtractedTerm {
    freq: number
    wordCount: number
  }

  const cards = new Map<string, StoredCard>()
  const aliasKeyToParent = new Map<string, string>()

  function inTitleOrAbstract(term: string): boolean {
    return titleAbstractHaystack.includes(term.toLowerCase())
  }

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
    const bonus = inTitleOrAbstract(candidate.term) ? 1.5 : 1
    const score = Math.log(1 + candidate.freq) * lengthBonusFor(wordCount) * SOURCE_BONUS[candidate.source] * bonus

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
    const acronym = acronymMatch[2]
    const expansion = findValidExpansion(rawExpansion, acronym)
    if (!expansion) continue

    const fullMatchText = acronymMatch[0]
    const quoteSentence = sentences.find((s) => s.includes(fullMatchText)) ?? null
    const quoteOrFallback = quoteSentence ?? fullMatchText
    const freq = Math.max(countWholeWord(normalized, acronym), 1)

    tryAdd({
      term: expansion,
      aliases: [acronym],
      definition: quoteOrFallback,
      source: 'paper_definition',
      sourceEntryId: null,
      quote: quoteOrFallback,
      freq,
    })
  }

  // ── Detector 2: authored-dictionary hits ──────────────────────────────────
  const dictionaryEntries = Array.from(new Set(GROUNDED_INDEX.values()))
  for (const entry of dictionaryEntries) {
    const searchCandidates = [entry.term, ...entry.aliases].filter(Boolean)
    let matchedSurface: string | null = null
    let freq = 0
    for (const cand of searchCandidates) {
      const re = new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'gi')
      const found = normalized.match(re)
      if (found && found.length > 0) {
        freq += found.length
        if (!matchedSurface) matchedSurface = cand
      }
    }
    if (!matchedSurface) continue

    const lowerCandidates = searchCandidates.map((c) => c.toLowerCase())
    const quoteSentence =
      sentences.find((s) => {
        const lowerSentence = s.toLowerCase()
        return lowerCandidates.some((c) => lowerSentence.includes(c))
      }) ?? null

    tryAdd({
      term: matchedSurface,
      aliases: [],
      definition: entry.definition,
      source: entry.source,
      sourceEntryId: entry.entryId,
      quote: quoteSentence,
      freq,
    })
  }

  // ── Detector 3: repeated technical phrases ────────────────────────────────
  const ngramOccurrences = new Map<string, { surface: string; freq: number; sentenceIdx: number }>()
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
          ngramOccurrences.set(key, { surface, freq: 1, sentenceIdx: si })
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

    const quoteSentence = sentences[occ.sentenceIdx] ?? null
    const quoteOrFallback = quoteSentence ?? occ.surface

    tryAdd({
      term: occ.surface,
      aliases: [],
      definition: quoteOrFallback,
      source: 'paper_context',
      sourceEntryId: null,
      quote: quoteOrFallback,
      freq: occ.freq,
    })
  }

  // ── Rank + cap ─────────────────────────────────────────────────────────────
  const ranked = Array.from(cards.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.termKey < b.termKey ? -1 : a.termKey > b.termKey ? 1 : 0
  })

  return ranked.slice(0, VOCAB_MAX_TERMS_PER_PAPER).map(({ freq: _freq, wordCount: _wordCount, ...rest }) => rest)
}
