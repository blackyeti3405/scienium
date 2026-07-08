/**
 * Showcase "Abstract Structure" guide — a static, authored reference that
 * teaches a science-fair student how to write their 250-word abstract.
 *
 * Content philosophy: three independent layers, each hand-authored to ISEF
 * 2026 abstract conventions (250-word max; single paragraph; no
 * acknowledgments; no external endorsements/trademarks; no work performed by
 * others claimed as the student's own; no references/citations/URLs in the
 * abstract itself; minimal jargon/undefined abbreviations; past tense for
 * what was done):
 *
 *   1. `ABSTRACT_STRUCTURE` — a 5-sentence-part template (purpose,
 *      problem/hypothesis, procedure, results, significance) with guidance,
 *      fill-in sentence starters, and a common mistake for each part.
 *   2. `ABSTRACT_DONT_INCLUDE` — the explicit ISEF "don't include" list.
 *   3. `ABSTRACT_EXAMPLES` — 3 worked example abstracts across 3 different
 *      ISEF categories at varying quality (strong / developing / weak), each
 *      with a critique against the template and don't-list.
 *
 * Source of truth: authored by hand, mirroring the `RESEARCH_GLOSSARY`
 * pattern (`lib/literature/research-guide.ts`) — a typed constant module
 * rendered client-side. There is no LLM call, no fetch, and nothing
 * persisted; the guide is stateless static content.
 */

// ─── Structure template ─────────────────────────────────────────────────────

export interface AbstractSentence {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "purpose"). */
  id: string
  /** Human display name for the sentence's role (e.g. "Purpose"). */
  role: string
  /** 2+ sentences of guidance on what this sentence should accomplish. */
  guidance: string
  /** 2-3 fill-in prompts a student can complete to draft the sentence. */
  sentenceStarters: string[]
  /** The single most common mistake students make on this sentence. */
  commonMistake: string
}

export const ABSTRACT_STRUCTURE: AbstractSentence[] = [
  {
    id: 'purpose',
    role: 'Purpose',
    guidance:
      'Open with one sentence stating the question your project investigated and why it matters. This orients the reader immediately — a judge skimming dozens of abstracts should know your topic from the very first line.',
    sentenceStarters: [
      'This study investigated whether…',
      'The purpose of this project was to determine…',
      'This project explored how…',
    ],
    commonMistake:
      'Starting with broad background ("Water pollution is a major problem…") instead of naming your specific question — save the framing for one clause, not a whole sentence.',
  },
  {
    id: 'problem-hypothesis',
    role: 'Problem/Hypothesis',
    guidance:
      'State the specific problem or gap you addressed and your testable hypothesis or design goal in past tense. For an engineering project, state the design requirement or performance target instead of a formal hypothesis.',
    sentenceStarters: [
      'It was hypothesized that…',
      'Prior work had not addressed…, so this project tested whether…',
      'The design requirement was to achieve… while keeping…',
    ],
    commonMistake:
      'Writing the hypothesis in the future tense ("It is hypothesized that…") — the abstract is written after the work is done, so every claim about your own project belongs in past tense.',
  },
  {
    id: 'procedure',
    role: 'Procedure',
    guidance:
      'Summarize the method in one or two sentences — what you built or measured, the key variables, and the scale of the study (sample size, number of trials, or number of prototypes tested). Keep it to the level of detail a reader needs to judge rigor, not a full protocol.',
    sentenceStarters: [
      'To test this, … samples/trials/prototypes were …',
      'Data were collected by measuring … across … conditions.',
      'A prototype was constructed and tested under … conditions, repeated … times.',
    ],
    commonMistake:
      'Cramming the entire Methods section in — list the independent/dependent variables and sample size, but leave step-by-step protocol detail for the paper itself.',
  },
  {
    id: 'results',
    role: 'Results',
    guidance:
      'Report the headline finding with a concrete number or direction of effect, in past tense. This is the sentence judges look for first — a vague "results were analyzed" sentence wastes the most valuable line in the abstract.',
    sentenceStarters: [
      'Results showed that…',
      'The treatment group had a … % higher/lower … than the control group.',
      'The prototype achieved … under test conditions, compared to … for the baseline.',
    ],
    commonMistake:
      'Stating that data was collected or analyzed without ever reporting what was actually found — the reader is left with no headline number or direction of effect.',
  },
  {
    id: 'significance',
    role: 'Significance',
    guidance:
      'Close with one sentence on why the finding matters — the broader implication, application, or the next question it opens up. Stay within what your data actually supports; this is not the place to overreach into claims your study cannot back up.',
    sentenceStarters: [
      'These findings suggest that…',
      'This work could inform…',
      'This design offers a low-cost/scalable way to…',
    ],
    commonMistake:
      'Overreaching into a sweeping claim the data doesn\'t support (e.g. a small pilot study announcing a "cure" or "solution") — match the significance claim to the actual size and scope of the evidence.',
  },
]

// ─── Don't-include list ─────────────────────────────────────────────────────

export interface DontItem {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "acknowledgments"). */
  id: string
  /** Short imperative rule. */
  rule: string
  /** One sentence explaining why the rule exists. */
  why: string
}

export const ABSTRACT_DONT_INCLUDE: DontItem[] = [
  {
    id: 'acknowledgments',
    rule: 'No acknowledgments or thank-yous.',
    why: 'ISEF abstracts are judged as a stand-alone scientific summary — thanking a mentor, teacher, or parent belongs on the project board or in a separate acknowledgments section, not here.',
  },
  {
    id: 'endorsements',
    rule: 'No mentor, institution, or program endorsements.',
    why: 'Naming a university lab, company, or program as if it endorses your work implies a level of outside backing ISEF abstracts are specifically not allowed to claim.',
  },
  {
    id: 'trademarks',
    rule: 'No trademarks or brand-name endorsements.',
    why: 'Calling out a specific commercial product favorably reads as an advertisement, not a research summary, and ISEF abstract rules explicitly disallow it.',
  },
  {
    id: 'others-work',
    rule: 'No work performed by others presented as your own.',
    why: 'The abstract must describe only the work the student(s) actually did — folding in a mentor\'s or collaborator\'s contribution without attribution misrepresents the project\'s authorship.',
  },
  {
    id: 'references',
    rule: 'No references, citations, or URLs.',
    why: 'The abstract is a self-contained summary; citations belong in the paper\'s bibliography, and a URL or DOI dropped into the abstract text itself is out of place and often against the format rules.',
  },
  {
    id: 'jargon',
    rule: 'No undefined jargon or abbreviations.',
    why: 'A judge outside your specific subfield needs to follow the abstract on a first read — an unexplained acronym or technical term forces them to guess instead of understanding your work.',
  },
  {
    id: 'over-limit',
    rule: 'Do not go over the 250-word limit.',
    why: 'ISEF abstracts are capped at 250 words; going over means the abstract will be rejected or trimmed, potentially losing your carefully written significance sentence at the end.',
  },
]

// ─── Worked examples ────────────────────────────────────────────────────────

export type AbstractQuality = 'strong' | 'developing' | 'weak'

export interface WorkedAbstract {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "microplastics-strong"). */
  id: string
  /** A real ISEF_CATEGORIES code (e.g. "EAEV"). */
  categoryCode: string
  /** The matching ISEF_CATEGORIES name. */
  category: string
  quality: AbstractQuality
  title: string
  /** The abstract text itself — must stay at or under ABSTRACT_WORD_MAX words. */
  body: string
  /** Author-computed word count of `body` — must equal wordCount(body). */
  wordCount: number
  /** 2+ sentences critiquing the example against the template + don't-list. */
  critique: string
}

export const ABSTRACT_EXAMPLES: WorkedAbstract[] = [
  {
    id: 'microplastics-strong',
    categoryCode: 'EAEV',
    category: 'Earth & Environmental Sciences',
    quality: 'strong',
    title: 'Detecting Microplastics in Freshwater with a Low-Cost Optical Scattering Sensor',
    body:
      'Microplastic contamination in freshwater is difficult to monitor because standard detection methods require expensive lab equipment. This project investigated whether a low-cost optical scattering sensor could reliably estimate microplastic concentration in water samples. It was hypothesized that scattered light intensity would increase linearly with microplastic concentration across a range typical of urban runoff. A sensor was built from a laser diode, photodiode, and microcontroller, then calibrated against 60 water samples spiked with known polyethylene microplastic concentrations from 0 to 500 particles per liter, with each concentration measured in five trials. Scattered light intensity showed a strong linear relationship with microplastic concentration (R-squared = 0.94), and the sensor correctly classified samples above a 100 particle-per-liter contamination threshold in 54 of 60 trials. These results suggest that low-cost optical sensors could offer a scalable way for communities to screen local waterways for microplastic contamination without relying on costly laboratory analysis.',
    wordCount: 148,
    critique:
      'This example hits all five template parts with a concrete headline number (R-squared = 0.94, 54/60 correct classifications) and closes with a significance claim scaled to what a screening sensor can actually support, not an overreach. It also cleanly avoids every don\'t-include item: no acknowledgments, no brand endorsement, no citations, and every technical term (R-squared, particles per liter) is used in context that makes it self-explanatory.',
  },
  {
    id: 'biofilm-developing',
    categoryCode: 'MICR',
    category: 'Microbiology',
    quality: 'developing',
    title: 'Effect of Biofilm Age on Antibiotic Resistance in E. coli',
    body:
      'Bacterial biofilms are known to be more resistant to antibiotics than free-floating bacteria, but it is less clear how resistance changes as a biofilm matures over time. This project tested whether older E. coli biofilms would survive higher antibiotic concentrations than younger ones. Biofilms were grown on plastic coupons for 24, 72, and 120 hours, then exposed to ampicillin at several concentrations, with three coupons tested per timepoint. The 120-hour biofilms survived at antibiotic concentrations roughly double what the 24-hour biofilms could tolerate, and older biofilms also appeared visually thicker under the microscope. This work suggests biofilm age should be considered when designing antibiotic treatment plans for biofilm-related infections in medical and industrial settings.',
    wordCount: 114,
    critique:
      'The purpose, hypothesis, and results sentences are present and in past tense, but the procedure sentence never states the sample size precisely beyond "three coupons per timepoint," and the results lean on a qualitative aside ("appeared visually thicker") instead of a second concrete measurement, which weakens the evidence backing the closing significance claim. The significance sentence is also a bit broader ("medical and industrial settings") than a three-coupon-per-timepoint study can fully support.',
  },
  {
    id: 'battery-weak',
    categoryCode: 'BENG',
    category: 'Biomedical Engineering',
    quality: 'weak',
    title: 'A New Wearable Health Monitor',
    body:
      'Wearable health monitors are becoming very popular for tracking fitness and health data in real time. The goal of this project was to design a wearable device that could track vital signs. The device was built using a microcontroller and several sensors, and testing was performed to see how well it worked. The device was able to collect data successfully during testing. Thanks to our mentor at Example University Labs for their invaluable guidance, and to the SensorTech PulseMax(TM) sensor used in this build. This project shows that wearable health monitoring has huge potential to change healthcare forever.',
    wordCount: 98,
    critique:
      'This example violates the don\'t-include list twice over (a mentor/institution acknowledgment and a trademarked brand-name endorsement) and never reports an actual result — "collected data successfully" gives no number, direction, or comparison to a baseline, so the results sentence fails its one job. It also opens with generic background instead of a specific question, skips a real hypothesis or design requirement, and closes with an unsupported sweeping claim ("change healthcare forever") far beyond what one prototype test can show.',
  },
]
