import { describe, it, expect } from 'vitest'
import {
  VOCAB_MAX_TERMS_PER_PAPER,
  VOCAB_MIN_NGRAM_FREQ,
  normalizePaperText,
  splitSentences,
  canonicalKey,
  schwartzHearstValid,
  extractTerms,
} from './vocab'
import { GROUNDED_INDEX } from './vocab-dictionary'
import { RESEARCH_GLOSSARY } from './research-guide'
import STOPWORDS from './vocab-stopwords.json'

// ─── Stopword shape (pins the authored content) ────────────────────────────

describe('vocab-stopwords.json shape', () => {
  it('both lists are non-empty, lowercase, unique, and disjoint from each other', () => {
    expect(STOPWORDS.english.length).toBeGreaterThan(0)
    expect(STOPWORDS.academic.length).toBeGreaterThan(0)

    for (const list of [STOPWORDS.english, STOPWORDS.academic]) {
      for (const word of list) {
        expect(word).toBe(word.toLowerCase())
      }
      expect(new Set(list).size).toBe(list.length)
    }

    const englishSet = new Set(STOPWORDS.english)
    const overlap = STOPWORDS.academic.filter((w) => englishSet.has(w))
    expect(overlap).toEqual([])
  })
})

// ─── normalizePaperText ─────────────────────────────────────────────────────

describe('normalizePaperText', () => {
  it('repairs hyphenated line breaks', () => {
    const raw = 'This study examines bio-\nlogy in freshwater cells.'
    expect(normalizePaperText(raw)).toBe('This study examines biology in freshwater cells.')
  })

  it('drops everything from the LAST references/bibliography heading onward', () => {
    const raw = 'The results were conclusive.\nReferences\n1. Smith, J. (2020). A study of things.'
    const normalized = normalizePaperText(raw)
    expect(normalized).toContain('The results were conclusive.')
    expect(normalized).not.toContain('Smith, J.')
  })

  it('strips URLs, DOIs, emails, and bracketed numeric citations', () => {
    const raw =
      'See https://example.test/paper for details [12]. Contact author@example.test or doi:10.1234/abcd [3,4].'
    const normalized = normalizePaperText(raw)
    expect(normalized).not.toContain('https://')
    expect(normalized).not.toContain('[12]')
    expect(normalized).not.toContain('[3,4]')
    expect(normalized).not.toContain('author@example.test')
    expect(normalized).not.toContain('doi:')
  })

  it('collapses whitespace', () => {
    expect(normalizePaperText('Too    many   \n\n  spaces.')).toBe('Too many spaces.')
  })
})

// ─── splitSentences ─────────────────────────────────────────────────────────

describe('splitSentences', () => {
  it('does not split mid-abbreviation (et al., Fig., Dr.)', () => {
    const text = 'Dr. Smith et al. reported the results in Fig. 2. The study found significant effects.'
    const sentences = splitSentences(text)
    expect(sentences).toHaveLength(2)
    expect(sentences[0]).toContain('Dr. Smith et al. reported the results in Fig. 2.')
    expect(sentences[1]).toBe('The study found significant effects.')
  })

  it('splits on ordinary sentence boundaries', () => {
    const sentences = splitSentences('First sentence here. Second sentence here. Third one too.')
    expect(sentences).toHaveLength(3)
  })
})

// ─── canonicalKey ───────────────────────────────────────────────────────────

describe('canonicalKey', () => {
  it('dedupes case and plural variants', () => {
    expect(canonicalKey('Controls')).toBe(canonicalKey('control'))
    expect(canonicalKey('Neural Networks')).toBe(canonicalKey('neural network'))
    expect(canonicalKey('CONTROL GROUP')).toBe(canonicalKey('control group'))
  })

  it('collapses whitespace and strips a trailing possessive', () => {
    expect(canonicalKey("Newton's")).toBe('newton')
    expect(canonicalKey('  extra   space  ')).toBe('extra space')
  })
})

// ─── schwartzHearstValid ────────────────────────────────────────────────────

describe('schwartzHearstValid', () => {
  it('accepts a VALID acronym pair', () => {
    expect(schwartzHearstValid('anterior cruciate ligament', 'ACL')).toBe(true)
  })

  it('rejects an INVALID pair whose initials do not match', () => {
    expect(schwartzHearstValid('we measured the results', 'ANOVA')).toBe(false)
  })
})

// ─── extractTerms ───────────────────────────────────────────────────────────

describe('extractTerms', () => {
  it('extracts a validated acronym expansion as a paper_definition term', () => {
    const fullText =
      'Athletes frequently tear the anterior cruciate ligament (ACL) during pivoting movements. Recovery from an ACL injury can take up to a year.'
    const terms = extractTerms({ title: 'ACL Injury Recovery', abstract: null, fullText })
    const card = terms.find((t) => t.termKey === canonicalKey('anterior cruciate ligament'))
    expect(card).toBeDefined()
    expect(card?.source).toBe('paper_definition')
    expect(card?.aliases).toContain('ACL')
    expect(card?.definition).toBe(card?.quote)
  })

  it('rejects an invalid parenthetical pair as an acronym definition', () => {
    const fullText =
      'We measured the results (ANOVA) using a standard protocol repeated many times across every single trial group we ran.'
    const terms = extractTerms({ title: 'Untitled', abstract: null, fullText })
    const bogus = terms.find((t) => t.source === 'paper_definition' && t.aliases.includes('ANOVA'))
    expect(bogus).toBeUndefined()
  })

  it('a RESEARCH_GLOSSARY hit yields the byte-identical authored definition', () => {
    const fullText =
      'The control group received no treatment, while the experimental group received the full drug dosage under observation.'
    const terms = extractTerms({ title: 'Drug Trial', abstract: null, fullText })
    const glossaryEntry = RESEARCH_GLOSSARY.find((g) => g.id === 'control-group')!
    const card = terms.find((t) => t.source === 'research_glossary')
    expect(card).toBeDefined()
    expect(card?.definition).toBe(glossaryEntry.definition)
    expect(card?.sourceEntryId).toBe('control-group')
    // AC2-shape check: the rendered term must appear verbatim (case-insensitively) in the paper text.
    expect(fullText.toLowerCase()).toContain(card!.term.toLowerCase())
  })

  it('a repeated junk-free phrase yields paper_context whose definition === quote and is a verbatim substring of the input text', () => {
    const fullText =
      'Photoacoustic imaging combines optical excitation with acoustic detection in living tissue. ' +
      'Photoacoustic imaging enables deep non-invasive visualization of vascular structures. ' +
      'Researchers used photoacoustic imaging to observe blood vessels in laboratory mice.'
    const terms = extractTerms({ title: 'Imaging Methods', abstract: null, fullText })
    const card = terms.find((t) => t.termKey === canonicalKey('photoacoustic imaging'))
    expect(card).toBeDefined()
    expect(card?.source).toBe('paper_context')
    expect(card?.definition).toBe(card?.quote)
    expect(fullText).toContain(card!.quote!)
  })

  it('stopwords and academic boilerplate never surface as extracted terms', () => {
    const fullText = Array.from({ length: 6 })
      .map(() => 'The results showed significant data using this method and reported the same findings.')
      .join(' ')
    const terms = extractTerms({ title: 'Untitled', abstract: null, fullText })
    expect(terms.filter((t) => t.source === 'paper_context')).toHaveLength(0)
  })

  it('is capped at VOCAB_MAX_TERMS_PER_PAPER and deterministically ordered', () => {
    const phrases = [
      'xylomite branthos',
      'quorbelle nastrium',
      'phendrick olvaria',
      'tessyra combolt',
      'vandrelle kospitan',
      'fenwick draloria',
      'brixnell tavomer',
      'glaskin phortune',
      'windemar cluvexa',
      'tarnowic bellastra',
      'morvellan drixotic',
      'sanquiret helvorn',
      'plectorum zindale',
      'wrathnell corvium',
      'fyneshade brontal',
    ]
    const fullText = phrases
      .map((p) => {
        const capped = p.charAt(0).toUpperCase() + p.slice(1)
        return `${capped} was observed in the sample. ${capped} was measured again during the second trial.`
      })
      .join(' ')
    expect(phrases.length).toBeGreaterThan(VOCAB_MAX_TERMS_PER_PAPER)

    const first = extractTerms({ title: 'Untitled', abstract: null, fullText })
    expect(first.length).toBe(VOCAB_MAX_TERMS_PER_PAPER)

    const second = extractTerms({ title: 'Untitled', abstract: null, fullText })
    expect(second).toEqual(first) // same input -> identical ordered output
  })

  it('caps min-frequency correctly: a 2-gram seen only once never surfaces', () => {
    expect(VOCAB_MIN_NGRAM_FREQ).toBeGreaterThan(1)
    const fullText = 'A lone zorblatt figment appeared only one time in this entire manuscript about nothing else important.'
    const terms = extractTerms({ title: 'Untitled', abstract: null, fullText })
    expect(terms.some((t) => t.termKey === canonicalKey('zorblatt figment'))).toBe(false)
  })

  // ─── THE ANTI-HALLUCINATION INVARIANT ────────────────────────────────────
  it('every returned term is EITHER byte-identical to an authored GROUNDED_INDEX definition OR a verbatim substring of the paper text — nothing else', () => {
    const fullText =
      'The anterior cruciate ligament (ACL) stabilizes the knee joint during rapid deceleration. ' +
      'The control group received no treatment, unlike the experimental group. ' +
      'Photoacoustic imaging combines optical excitation with acoustic detection in living tissue. ' +
      'Photoacoustic imaging enables deep non-invasive visualization. ' +
      'Researchers used photoacoustic imaging to observe vascular structures in mice repeatedly.'
    const abstract = 'This paper studies the anterior cruciate ligament and photoacoustic imaging techniques.'
    const input = { title: 'Knee Imaging Study', abstract, fullText }
    const normalizedBody = normalizePaperText(fullText)
    const groundedDefinitions = new Set(Array.from(GROUNDED_INDEX.values()).map((e) => e.definition))

    const terms = extractTerms(input)
    expect(terms.length).toBeGreaterThan(0)

    for (const term of terms) {
      const isGroundedDefinition = groundedDefinitions.has(term.definition)
      const isVerbatimSubstring = normalizedBody.includes(term.definition)
      expect(isGroundedDefinition || isVerbatimSubstring).toBe(true)
      // Never both empty/invented: definition must be non-empty either way.
      expect(term.definition.length).toBeGreaterThan(0)
    }
  })
})
