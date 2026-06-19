/**
 * ISEF judging rubric, structured for the Science Fair gateway's ISEF card.
 * Source of truth is docs/isef-2026.md / the Regeneron ISEF "What to Expect"
 * judging criteria (provided 2026-06-18). Science and engineering use different
 * five-section criteria; each section lists the exact checklist items judges
 * score against. Both also feed the Research Plan building's review (Feature 2B).
 */

export interface RubricSubsection {
  title: string
  points: number
  items: string[]
}

export interface RubricCriterion {
  numeral: string
  title: string
  points: number
  /** Checklist items judges look for (how to earn the section's points). */
  items?: string[]
  /** Used for section V (Presentation), which splits into Poster + Interview. */
  subsections?: RubricSubsection[]
}

export interface RubricTrack {
  key: 'science' | 'engineering'
  label: string
  criteria: RubricCriterion[]
}

// Section V is identical for both tracks (Poster 10 + Interview 25).
const PRESENTATION: RubricCriterion = {
  numeral: 'V',
  title: 'Presentation',
  points: 35,
  subsections: [
    {
      title: 'Poster',
      points: 10,
      items: [
        'Logical organization of material',
        'Clarity of graphics and legends',
        'Supporting documentation displayed',
      ],
    },
    {
      title: 'Interview',
      points: 25,
      items: [
        'Clear, concise, thoughtful responses to questions',
        'Understanding of basic science relevant to the project',
        'Understanding interpretation and limitations of results and conclusions',
        'Degree of independence in conducting the project',
        'Recognition of potential impact in science, society and/or economics',
        'Quality of ideas for further research',
        'For team projects, contributions to and understanding of the project by all members',
      ],
    },
  ],
}

// Section IV (Creativity & Potential Impact) is identical for both tracks.
const CREATIVITY: RubricCriterion = {
  numeral: 'IV',
  title: 'Creativity & Potential Impact',
  points: 20,
  items: [
    'Project demonstrates significant creativity in one or more of the above criteria',
    'Project has impact or potential impact in its field and/or in technology, economy, environment or society',
  ],
}

export const ISEF_RUBRIC: RubricTrack[] = [
  {
    key: 'science',
    label: 'Science Projects',
    criteria: [
      {
        numeral: 'I',
        title: 'Research Question',
        points: 10,
        items: [
          'Clear and focused purpose',
          'Identifies contribution to the field of study',
          'Testable using scientific methods',
        ],
      },
      {
        numeral: 'II',
        title: 'Design and Methodology',
        points: 15,
        items: [
          'Well-designed plan and data-collection methods',
          'Variables and controls defined, appropriate, and complete',
        ],
      },
      {
        numeral: 'III',
        title: 'Execution: Data Collection, Analysis & Interpretation',
        points: 20,
        items: [
          'Systematic data collection and analysis',
          'Reproducibility of results',
          'Appropriate application of mathematical and statistical methods',
          'Sufficient data collected to support interpretation and conclusions',
        ],
      },
      CREATIVITY,
      PRESENTATION,
    ],
  },
  {
    key: 'engineering',
    label: 'Engineering Projects',
    criteria: [
      {
        numeral: 'I',
        title: 'Research Problem',
        points: 10,
        items: [
          'Description of a practical need or problem to be solved',
          'Definition of criteria for the proposed solution',
          'Explanation of constraints',
        ],
      },
      {
        numeral: 'II',
        title: 'Design and Methodology',
        points: 15,
        items: [
          'Exploration of alternatives to answer the need or problem',
          'Identification of a solution',
          'Development of a prototype/model',
        ],
      },
      {
        numeral: 'III',
        title: 'Execution: Construction & Testing',
        points: 20,
        items: [
          'Prototype demonstrates the intended design',
          'Prototype has been tested in multiple conditions/trials',
          'Prototype demonstrates engineering skill and completeness',
        ],
      },
      CREATIVITY,
      PRESENTATION,
    ],
  },
]

/**
 * Where judges place extra emphasis (Creativity and the Presentation/Interview).
 */
export const ISEF_EMPHASIS: { title: string; detail: string }[] = [
  {
    title: 'Creativity & Potential Impact',
    detail:
      'Imagination and inventiveness; new perspectives or alternatives; real or potential impact on the world. Judges weight research outcomes and analysis here.',
  },
  {
    title: 'Presentation / Interview',
    detail:
      'Evaluates understanding of the basic science, interpretation, and limitations; independence (Form 1C) and mentoring; for multi-year work, ONLY the current year (Form 7). Team and individual projects are judged together on quality, but all members must show significant contribution and understanding.',
  },
]

/** Board / poster guidance from the ISEF "What to Expect" sheet. */
export const ISEF_BOARD_GUIDANCE: string[] = [
  'Cite every graphic individually — "Photo taken by Finalist", "Graph created by Finalist using…", or APA + a URL/DOI for external graphics (even when the license doesn’t require it).',
  'Key information must be readable from ~10 feet; smallest poster font ~18 pt.',
  'Keep the title short and interesting; aim for ~300–800 words of clear, to-the-point text.',
  'Use bullets, numbering, and headlines; make effective use of graphics, color, and fonts.',
  'Bring required special forms (1C, Form 4 / Informed Consent, Continuation Form, etc.) and photo ID for setup.',
]
