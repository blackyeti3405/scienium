import { describe, it, expect } from 'vitest'
import {
  VOCAB_MAX_CANDIDATES,
  VOCAB_MIN_NGRAM_FREQ,
  normalizePaperText,
  splitSentences,
  canonicalKey,
  schwartzHearstValid,
  normalizeAcronym,
  isAcronymLike,
  isBareAcronym,
  quoteQuality,
  pickQuote,
  extractCandidates,
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

// ─── extractCandidates ───────────────────────────────────────────────────────────

describe('extractCandidates', () => {
  it('extracts a validated acronym expansion as a paper_definition term', () => {
    const fullText =
      'Athletes frequently tear the anterior cruciate ligament (ACL) during pivoting movements. Recovery from an ACL injury can take up to a year.'
    const terms = extractCandidates({ title: 'ACL Injury Recovery', abstract: null, fullText })
    const card = terms.find((t) => t.termKey === canonicalKey('anterior cruciate ligament'))
    expect(card).toBeDefined()
    expect(card?.source).toBe('paper_definition')
    expect(card?.aliases).toContain('ACL')
    expect(card?.definition).toBe(card?.quote)
  })

  it('rejects an invalid parenthetical pair as an acronym definition', () => {
    const fullText =
      'We measured the results (ANOVA) using a standard protocol repeated many times across every single trial group we ran.'
    const terms = extractCandidates({ title: 'Untitled', abstract: null, fullText })
    const bogus = terms.find((t) => t.source === 'paper_definition' && t.aliases.includes('ANOVA'))
    expect(bogus).toBeUndefined()
  })

  it('a RESEARCH_GLOSSARY hit yields the byte-identical authored definition', () => {
    const fullText =
      'The control group received no treatment, while the experimental group received the full drug dosage under observation.'
    const terms = extractCandidates({ title: 'Drug Trial', abstract: null, fullText })
    const glossaryEntry = RESEARCH_GLOSSARY.find((g) => g.id === 'control-group')!
    const card = terms.find((t) => t.source === 'research_glossary')
    expect(card).toBeDefined()
    expect(card?.definition).toBe(glossaryEntry.definition)
    expect(card?.sourceEntryId).toBe('control-group')
    // AC2-shape check: the rendered term must appear verbatim (case-insensitively) in the paper text.
    expect(fullText.toLowerCase()).toContain(card!.term.toLowerCase())
  })

  it('a repeated junk-free phrase yields paper_context with a verbatim quote and NO definition (curation writes it)', () => {
    const fullText =
      'Photoacoustic imaging combines optical excitation with acoustic detection in living tissue. ' +
      'Photoacoustic imaging enables deep non-invasive visualization of vascular structures. ' +
      'Researchers used photoacoustic imaging to observe blood vessels in laboratory mice.'
    const terms = extractCandidates({ title: 'Imaging Methods', abstract: null, fullText })
    const card = terms.find((t) => t.termKey === canonicalKey('photoacoustic imaging'))
    expect(card).toBeDefined()
    expect(card?.source).toBe('paper_context')
    expect(card?.definition).toBe('')
    expect(fullText).toContain(card!.quote!)
  })

  it('stopwords and academic boilerplate never surface as extracted terms', () => {
    const fullText = Array.from({ length: 6 })
      .map(() => 'The results showed significant data using this method and reported the same findings.')
      .join(' ')
    const terms = extractCandidates({ title: 'Untitled', abstract: null, fullText })
    expect(terms.filter((t) => t.source === 'paper_context')).toHaveLength(0)
  })

  it('is capped at VOCAB_MAX_CANDIDATES and deterministically ordered', () => {
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
    const first = extractCandidates({ title: 'Untitled', abstract: null, fullText })
    expect(first.length).toBeGreaterThan(0)
    expect(first.length).toBeLessThanOrEqual(VOCAB_MAX_CANDIDATES)

    const second = extractCandidates({ title: 'Untitled', abstract: null, fullText })
    expect(second).toEqual(first) // same input -> identical ordered output
  })

  it('caps min-frequency correctly: a 2-gram seen only once never surfaces', () => {
    expect(VOCAB_MIN_NGRAM_FREQ).toBeGreaterThan(1)
    const fullText = 'A lone zorblatt figment appeared only one time in this entire manuscript about nothing else important.'
    const terms = extractCandidates({ title: 'Untitled', abstract: null, fullText })
    expect(terms.some((t) => t.termKey === canonicalKey('zorblatt figment'))).toBe(false)
  })

  // ─── THE ANTI-HALLUCINATION INVARIANT ────────────────────────────────────
  // Curation may WRITE a definition, but only for a candidate this module
  // emitted with an empty one. This module still invents nothing: a definition
  // here is authored text or the paper's own bytes, never anything in between.
  it('every candidate definition is EITHER byte-identical to an authored GROUNDED_INDEX definition OR a verbatim substring of the paper text OR empty — nothing else', () => {
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

    const terms = extractCandidates(input)
    expect(terms.length).toBeGreaterThan(0)

    for (const term of terms) {
      if (term.definition === '') continue // curation writes this one
      const isGroundedDefinition = groundedDefinitions.has(term.definition)
      const isVerbatimSubstring = normalizedBody.includes(term.definition)
      expect(isGroundedDefinition || isVerbatimSubstring).toBe(true)
    }
  })

  // Every quote must be the paper's own bytes — the card shows it in quotation
  // marks, so a paraphrase here would be a fabricated citation.
  it('every candidate quote is a verbatim substring of the normalized paper text', () => {
    const fullText =
      'The anterior cruciate ligament (ACL) stabilizes the knee joint during rapid deceleration events. ' +
      'Photoacoustic imaging combines optical excitation with acoustic detection in living tissue samples. ' +
      'Photoacoustic imaging enables deep non-invasive visualization of vascular structures in mice. ' +
      'Researchers used photoacoustic imaging to observe blood vessels across many laboratory trials.'
    const normalizedBody = normalizePaperText(fullText)
    for (const term of extractCandidates({ title: 'Knee Imaging Study', abstract: null, fullText })) {
      if (term.quote) expect(normalizedBody).toContain(term.quote)
    }
  })
})

// ─── Regressions: the four bugs that shipped bad cards ─────────────────────

describe('quoteQuality', () => {
  it('rejects journal front matter, accepts ordinary prose', () => {
    // The exact shape that broke jang2021: no sentence terminator in the title
    // or author list, so the header swallows the first abstract sentence.
    const frontMatter =
      '8134 IEEE ROBOTICS AND AUTOMATION LETTERS, VOL. 6, NO. 4, OCTOBER 2021 Self-Contained 2-DOF ' +
      'Ankle-Foot Prosthesis With Low-Inertia Extremity for Agile Walking on Uneven Terrain Woo-Seok Jang , ' +
      'Do-Yun Kim , Yun-Seok Choi, and Yong-Jae Kim Abstract—Accepting the heterogeneity of amputees and ' +
      'enabling them to walk comfortably using little effort with light weights is the main goal of prostheses.'
    const prose =
      'Capacitive type force sensors placed at the shank frame enable the precise measurement of force from the ground without increasing foot mass.'

    expect(quoteQuality(frontMatter)).toBe(0)
    expect(quoteQuality(prose)).toBeGreaterThan(0)
  })

  it('rejects an all-caps section banner and a page-number run', () => {
    expect(quoteQuality('III. EXPERIMENTAL RESULTS AND DISCUSSION OF THE PROPOSED DESIGN METHOD')).toBe(0)
    expect(quoteQuality('12 34 56 78 90 11 22 33 44 55 66 77 88 99 10 20 30 40 50 60 70 80 90')).toBe(0)
  })

  it('rejects sentences too short or too long to teach anything', () => {
    expect(quoteQuality('It was fast.')).toBe(0)
    expect(quoteQuality(`The ${'very '.repeat(90)}long sentence.`)).toBe(0)
  })
})

describe('pickQuote', () => {
  it('prefers a body usage over the front-matter blob the term also appears in', () => {
    const header =
      '8134 IEEE ROBOTICS AND AUTOMATION LETTERS, VOL. 6, NO. 4, OCTOBER 2021 Self-Contained 2-DOF ' +
      'Ankle-Foot Prosthesis With Low-Inertia Extremity for Agile Walking on Uneven Terrain Woo-Seok Jang , ' +
      'Do-Yun Kim , Yun-Seok Choi, and Yong-Jae Kim Abstract—Accepting the heterogeneity of amputees is the goal.'
    const body = 'The prosthesis achieves plantarflexion through a series elastic actuator mounted on the shank frame.'
    expect(pickQuote([header, body], ['prosthesis'])).toBe(body)
  })

  it('returns null rather than a bad quote when the paper has no usable usage', () => {
    expect(pickQuote(['SHORT CAPS.'], ['caps'])).toBeNull()
    expect(pickQuote(['A perfectly ordinary sentence about other things entirely here.'], ['absent'])).toBeNull()
  })
})

describe('isAcronymLike', () => {
  it('is true for stats acronyms and false for ordinary words', () => {
    for (const t of ['OR', 'SD', 'CI', 'ANOVA', 'RR']) expect(isAcronymLike(t)).toBe(true)
    for (const t of ['Range', 'or', 'Sample size', 'p-value', 'n']) expect(isAcronymLike(t)).toBe(false)
  })
})

describe('dictionary false matches (the jang2021 regression)', () => {
  // "OR" (odds ratio) ranked #1 on a paper about ankle prostheses because the
  // scan was case-insensitive and matched every English "or".
  it('the stats term "OR" does not match the conjunction "or"', () => {
    const fullText =
      'The ankle can dorsiflex or plantarflex during gait, and the actuator may be series or parallel. ' +
      'Designers choose stiff or compliant elements, and the foot may be rigid or articulated in practice. ' +
      'Every prosthesis is either passive or powered, or some hybrid of the two approaches entirely.'
    const terms = extractCandidates({ title: 'Ankle Prosthesis Design', abstract: null, fullText })
    expect(terms.some((t) => t.term === 'OR')).toBe(false)
  })

  it('an uppercase acronym still matches when the paper genuinely uses it', () => {
    const fullText =
      'We report an OR of 2.4 for the exposed group across the whole cohort of participants studied. ' +
      'The OR was computed from a standard two-by-two contingency table of counts for each arm. ' +
      'An OR above one indicates elevated odds of the outcome among those exposed to the treatment.'
    const terms = extractCandidates({ title: 'Case-Control Study', abstract: null, fullText })
    expect(terms.some((t) => t.term === 'OR')).toBe(true)
  })

  // "n" (sample size) matched every stray letter n. One character carries no
  // signal, so it is never scanned.
  it('single-character dictionary terms are never scanned', () => {
    const fullText =
      'The design uses n independent joints and n actuators mounted across the frame of the device. ' +
      'Each n contributes to the overall stiffness profile measured throughout the gait cycle here. ' +
      'We repeated every trial n times to confirm the reported behaviour was genuinely reproducible.'
    const terms = extractCandidates({ title: 'Mechanism Design', abstract: null, fullText })
    expect(terms.some((t) => t.term.trim().length < 2)).toBe(false)
  })
})

// ─── Regressions: the acronym pipeline ─────────────────────────────────────
//
// A paper's acronyms are its highest-value vocabulary — they are jargon by
// definition and a student cannot look them up. Every bug below silently
// dropped one, and jang2021 shipped a deck with no UPEA, PEA, or SEA in it
// while looking perfectly reasonable.

describe('normalizeAcronym', () => {
  it('strips the plural s the capture group swallows', () => {
    // "(PEAs)" arrives as "PEAs" because ACRONYM_RE's group is greedy over
    // [A-Za-z], so its trailing `s?` never fires — and a 4-letter acronym then
    // fails to validate against its own 3-word expansion.
    expect(normalizeAcronym('PEAs')).toBe('PEA')
    expect(normalizeAcronym('SEAs')).toBe('SEA')
  })

  it('leaves mixed-case acronyms alone', () => {
    for (const t of ['mRNA', 'pH', 'DOF', 'FEM']) expect(normalizeAcronym(t)).toBe(t)
  })
})

describe('schwartzHearstValid — nested acronyms', () => {
  it('accepts an expansion whose own word is an acronym', () => {
    // "Unidirectional PEA (UPEA)": PEA supplies P, E and A. A one-letter-per-
    // word rule rejects this and drops the paper's central term.
    expect(schwartzHearstValid('Unidirectional PEA', 'UPEA')).toBe(true)
  })

  it('accepts a plural acronym against its singular expansion', () => {
    expect(schwartzHearstValid('parallel elastic actuators', 'PEAs')).toBe(true)
  })

  it('still rejects a genuinely mismatched pair', () => {
    expect(schwartzHearstValid('we measured the results', 'ANOVA')).toBe(false)
    expect(schwartzHearstValid('Unidirectional PEA', 'XYZQ')).toBe(false)
  })
})

describe('normalizePaperText — publisher page furniture', () => {
  it('strips the access banner that repeats on every page', () => {
    const raw =
      'The ankle generates torque during push-off in the stance phase of gait. ' +
      'Authorized licensed use limited to: ULAKBIM UASL - GAZI UNIV. Downloaded on July 16 from IEEE Xplore. Restrictions apply. ' +
      'The spring stores energy for the next step.'
    const out = normalizePaperText(raw)
    for (const junk of ['Authorized licensed', 'GAZI UNIV', 'IEEE Xplore', 'Restrictions apply']) {
      expect(out).not.toContain(junk)
    }
    expect(out).toContain('The ankle generates torque')
    expect(out).toContain('The spring stores energy')
  })

  it('strips the journal running header', () => {
    const raw = '8134 IEEE ROBOTICS AND AUTOMATION LETTERS, VOL. 6, NO. 4, OCTOBER 2021 The study continues here.'
    expect(normalizePaperText(raw)).not.toContain('VOL. 6')
  })
})

describe('isBareAcronym', () => {
  it('accepts domain acronyms, rejects furniture and bare labels', () => {
    for (const t of ['SEA', 'UPEA', 'GRF', 'IMU', 'BLDC', 'AL6061']) expect(isBareAcronym(t)).toBe(true)
    for (const t of ['IEEE', 'VOL', 'FIG', 'TABLE', 'III', 'A1', 'sea']) expect(isBareAcronym(t)).toBe(false)
  })
})

describe('pickQuote — whole-word matching', () => {
  // Substring matching quietly handed short terms someone else's sentence, and
  // the card then quoted text the term never appears in.
  it('does not match an acronym inside an ordinary word', () => {
    const sentences = [
      'The data were collected from a large cohort of participants over many months of testing.',
      'Researchers report a range of motion sufficient for daily activity in every single trial.',
    ]
    // "ROM" must not match "f-ROM"; it appears in neither sentence as a word.
    expect(pickQuote(sentences, ['ROM'])).toBeNull()
    // "SEA" must not match "re-SEA-rchers".
    expect(pickQuote(sentences, ['SEA'])).toBeNull()
  })

  it('matches the acronym when it is genuinely used as a word', () => {
    const s = 'By using SEA and UPEA together, the actuator power required for walking can be lowered considerably.'
    expect(pickQuote([s], ['SEA'])).toBe(s)
  })

  it('matches ordinary terms case-insensitively', () => {
    const s = 'The Photoacoustic imaging technique combines optical excitation with acoustic detection in tissue.'
    expect(pickQuote([s], ['photoacoustic imaging'])).toBe(s)
  })
})

describe('acronym channel survives the candidate cap', () => {
  // The paper defines "serial elastic actuators (SEA)" exactly once. On
  // frequency alone it scores below words like "parallel" and was cut — taking
  // the absorbed bare "SEA" with it, so the concept vanished entirely.
  const filler = Array.from({ length: 30 })
    .map((_, i) => `The parallel spring mechanism number ${i} was measured in the frame during every trial of walking.`)
    .join(' ')
  const fullText =
    'Designers connect serial elastic actuators (SEA) between the motor and the load for compliance. ' +
    'Unidirectional PEA (UPEA) is widely used to provide a large range of motion during dorsiflexion. ' +
    'The team reports parallel elastic actuators (PEAs) with springs mounted beside the motor housing. ' +
    'By using SEA and UPEA together, the actuator power required for walking can be lowered considerably. ' +
    filler

  it('keeps once-defined acronyms that frequency ranking would discard', () => {
    const terms = extractCandidates({ title: 'Ankle Prosthesis Design', abstract: null, fullText })
    for (const acronym of ['SEA', 'UPEA', 'PEA']) {
      const card = terms.find((t) => t.aliases.includes(acronym) || t.term === acronym)
      expect(card, `${acronym} must survive the cap`).toBeDefined()
    }
  })

  it('absorbs a bare acronym into the card that spells it out', () => {
    const terms = extractCandidates({ title: 'Ankle Prosthesis Design', abstract: null, fullText })
    const bare = terms.filter((t) => t.term === 'SEA')
    const spelled = terms.filter((t) => t.aliases.includes('SEA'))
    expect(bare).toHaveLength(0) // absorbed, not duplicated
    expect(spelled).toHaveLength(1)
    expect(spelled[0].term).toContain('elastic actuators')
  })

  it('gives every acronym card a quote that actually contains it', () => {
    for (const t of extractCandidates({ title: 'Ankle Prosthesis Design', abstract: null, fullText })) {
      for (const alias of t.aliases) {
        if (t.quote) expect(new RegExp(`\\b${alias}s?\\b`).test(t.quote)).toBe(true)
      }
    }
  })
})
