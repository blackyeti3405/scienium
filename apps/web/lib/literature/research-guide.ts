/**
 * Literature Review "Research Guide" — a static, authored reference library
 * that teaches the vocabulary and structure of academic papers to a
 * science-fair student who is new to reading primary literature.
 *
 * Content philosophy: this is a GLOSSARY, not a stats cheat-sheet. Every term
 * carries three plain-language layers: (1) `definition` — what the term
 * means, in 2+ sentences of textbook-sidebar depth, not a tooltip; (2)
 * `example` — one sentence showing the term used the way it would actually
 * appear in or near a paper; (3) `whyItMatters` — why a student should care
 * about this term when reading or evaluating a source. There is no
 * formula/code/dataset layer here (that's the Data Terminal Stats Guide's
 * job) — this module is prose-only.
 *
 * `PAPER_ANATOMY` is a second, independent reference: the 8-section anatomy
 * of a typical (IMRaD-style) paper, plus a non-linear `READING_ORDER`
 * strategy for how to actually read one (abstract first, then skip around,
 * rather than start-to-finish).
 *
 * Source of truth: authored by hand, mirrors the `STATS_GUIDE` pattern
 * (`lib/data-terminal/stats-guide.ts`) — a typed constant module rendered
 * client-side. There is no LLM call, no Python execution, and nothing
 * persisted; the guide is stateless static content.
 */

import { filterGuideEntries } from '@/lib/guides/filter'
import RESEARCH_GLOSSARY_DATA from './research-glossary.json'

export type GlossaryCategory =
  | 'methodology'
  | 'statistics-in-reading'
  | 'source-types'
  | 'publishing-peer-review'
  | 'citation'
  | 'study-design'

export const GLOSSARY_CATEGORIES: { key: GlossaryCategory; label: string }[] = [
  { key: 'methodology', label: 'Methodology' },
  { key: 'statistics-in-reading', label: 'Statistics in reading' },
  { key: 'source-types', label: 'Source types' },
  { key: 'publishing-peer-review', label: 'Publishing & peer review' },
  { key: 'citation', label: 'Citation' },
  { key: 'study-design', label: 'Study design' },
]

export interface GlossaryTerm {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "p-value"). */
  id: string
  /** Human display title (e.g. "P-value"). */
  term: string
  category: GlossaryCategory
  /** Extra search terms, optional. */
  aliases?: string[]
  /** Plain-language explanation, 2+ sentences — what the term means and why it's defined that way. */
  definition: string
  /** One example-in-context sentence, showing the term used as it'd appear near a paper. */
  example: string
  /** Why this matters when reading/evaluating a paper. */
  whyItMatters: string
}

// Authored data lives in research-glossary.json (DAT-1): ~thousands of lines of
// literals moved out of tsc's parse path and out of eager client bundles. The
// existing *-guide tests still validate the shape through this wrapper.
export const RESEARCH_GLOSSARY = RESEARCH_GLOSSARY_DATA as unknown as GlossaryTerm[]

/**
 * Filters `RESEARCH_GLOSSARY` (or any subset) by a case-insensitive substring
 * match on term/definition/aliases, AND-ed with an optional category. A blank
 * or whitespace-only query behaves like "no query." Pure and side-effect
 * free — unit-testable and reusable by the panel component via `useMemo`.
 * Thin wrapper over `filterGuideEntries`, kept so this module's signature
 * and search fields (term, not title) stay pinned.
 */
export function filterTerms(
  terms: GlossaryTerm[],
  filter: { query?: string; category?: GlossaryCategory | null },
): GlossaryTerm[] {
  return filterGuideEntries(
    terms,
    filter,
    (t) => [t.term, t.definition, ...(t.aliases ?? [])],
    (t) => t.category,
  )
}

// ─── Anatomy of a paper ───────────────────────────────────────────────────

export interface PaperSection {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "abstract"). */
  id: string
  name: string
  purpose: string
  whatToLookFor: string
  readingStrategyNote: string
  /** Covers the engineering-vs-science variant (e.g. engineering papers often lack a formal hypothesis). */
  variantNote: string
}

export const PAPER_ANATOMY: PaperSection[] = [
  {
    id: 'abstract',
    name: 'Abstract',
    purpose:
      'A short (usually 150-300 word) standalone summary of the entire paper — the question, the method, the headline result, and why it matters — placed at the very top so a reader can decide whether to read further.',
    whatToLookFor:
      'The one-sentence takeaway result, the general method used, and the sample size or scale of the study, all compressed into a few sentences.',
    readingStrategyNote:
      'Read this first, always — it is the fastest way to decide whether a paper is relevant enough to your topic to invest more time in.',
    variantNote:
      'Engineering papers\' abstracts often lead with the design problem and final performance numbers rather than a hypothesis and p-value.',
  },
  {
    id: 'introduction',
    name: 'Introduction',
    purpose:
      'Sets up the background and prior research (often via a literature review) that motivates the study, states the specific question or hypothesis, and explains the gap in existing knowledge the paper addresses.',
    whatToLookFor:
      'The explicit hypothesis or research question, the gap in prior work being filled, and the handful of prior studies most directly relevant to yours.',
    readingStrategyNote:
      'Skim for the final paragraph, which usually states the hypothesis and study goal most directly — you don\'t need every background sentence on a first pass.',
    variantNote:
      'Engineering introductions often state design requirements or performance targets instead of a formal testable hypothesis.',
  },
  {
    id: 'methods',
    name: 'Methods / Materials',
    purpose:
      'Describes exactly what was done — materials, procedure, sample size, controls, and measurements — in enough detail that another researcher could replicate the study.',
    whatToLookFor:
      'Sample size, whether there was a control group and randomization, how key variables were operationally defined and measured, and any red flags like missing controls.',
    readingStrategyNote:
      'Read this closely once a paper looks relevant — this is where you judge whether the study\'s design actually supports its later claims.',
    variantNote:
      'Engineering methods sections describe prototype construction, test rigs, and performance-test procedures rather than subject recruitment and randomization.',
  },
  {
    id: 'results',
    name: 'Results',
    purpose:
      'Reports what was actually found — the raw and summarized data, statistical tests, figures, and tables — without yet interpreting what it means for the bigger picture.',
    whatToLookFor:
      'The key figures/tables, the actual numbers (not just significance stars), effect sizes and confidence intervals alongside p-values, and whether the data matches what the Abstract claimed.',
    readingStrategyNote:
      'Go straight to the figures and tables — a well-made chart usually tells you the finding faster than the surrounding paragraph text.',
    variantNote:
      'Engineering results report measured performance against the stated design requirements (load capacity, efficiency, cost) rather than a statistical test of a hypothesis.',
  },
  {
    id: 'discussion',
    name: 'Discussion',
    purpose:
      'Interprets what the results mean, connects them back to the hypothesis and to prior literature, and explains their broader significance.',
    whatToLookFor:
      'Whether the interpretation stays within what the data actually supports, or overreaches into causal claims the design can\'t justify.',
    readingStrategyNote:
      'Read this right after the Abstract, before Methods — it tells you the authors\' own take on "so what?", which helps you judge the Methods with the right question in mind.',
    variantNote:
      'Engineering discussions focus on whether the design met its requirements and what tradeoffs the next iteration should address.',
  },
  {
    id: 'limitations',
    name: 'Limitations',
    purpose:
      'Honestly states the weaknesses of the study\'s own design, sample, or method — small sample size, lack of blinding, possible confounds, or narrow generalizability.',
    whatToLookFor:
      'Whether the authors acknowledge the most obvious weaknesses you already spotted yourself while reading Methods — a paper that\'s silent on clear flaws is less trustworthy than one that names them.',
    readingStrategyNote:
      'Read this alongside Methods — the two sections together tell you how much to trust the Results.',
    variantNote:
      'Engineering limitations often describe conditions the prototype wasn\'t tested under, rather than statistical or sampling weaknesses.',
  },
  {
    id: 'conclusion',
    name: 'Conclusion',
    purpose:
      'A brief closing summary of the main finding and its significance, often suggesting directions for future research.',
    whatToLookFor:
      'Whether the conclusion\'s claims match the strength of evidence actually shown in Results, or quietly expand beyond it.',
    readingStrategyNote:
      'Read this together with the Abstract to fact-check that the paper\'s framing stayed consistent from start to finish.',
    variantNote:
      'Engineering conclusions typically state whether the design requirements were met and what the next design iteration should target.',
  },
  {
    id: 'references',
    name: 'References',
    purpose:
      'The full list of every source cited in the paper, giving complete publication details so each one can be located and checked.',
    whatToLookFor:
      'Whether the reference list leans heavily on the authors\' own prior work (self-citation), how recent the cited sources are, and whether key claims trace back to primary sources.',
    readingStrategyNote:
      'Skim this last, as a source of leads for your own literature search — it\'s a ready-made list of related papers in the same area.',
    variantNote:
      'Engineering references often include industry standards and technical datasheets alongside academic papers, which science-focused reference lists rarely cite.',
  },
]

/**
 * A non-linear reading-order strategy: expert readers do NOT read a paper
 * top-to-bottom start-to-finish. Each `sectionId` must reference a real
 * `PAPER_ANATOMY` id.
 */
export const READING_ORDER: { step: number; sectionId: string; why: string }[] = [
  {
    step: 1,
    sectionId: 'abstract',
    why: 'Get the headline result and decide in under a minute whether this paper is relevant enough to keep reading.',
  },
  {
    step: 2,
    sectionId: 'conclusion',
    why: 'Check what the authors themselves think the takeaway is, before Methods details can bias your first impression.',
  },
  {
    step: 3,
    sectionId: 'discussion',
    why: 'See how the authors connect the result back to the hypothesis and prior work, and watch for claims that reach beyond the data.',
  },
  {
    step: 4,
    sectionId: 'results',
    why: 'Look at the actual figures, tables, and numbers yourself — don\'t just take the Discussion\'s interpretation on faith.',
  },
  {
    step: 5,
    sectionId: 'methods',
    why: 'Now that you know the claimed result, check whether the design (controls, sample size, randomization) actually supports it.',
  },
  {
    step: 6,
    sectionId: 'limitations',
    why: 'Confirm the authors\' own list of weaknesses matches what you noticed in Methods, and note anything they left out.',
  },
  {
    step: 7,
    sectionId: 'introduction',
    why: 'Go back for the fuller background and literature review, now that you already understand the punchline and the evidence behind it.',
  },
  {
    step: 8,
    sectionId: 'references',
    why: 'Mine the reference list for related sources for your own project, now that you know which ones the authors leaned on most.',
  },
]
