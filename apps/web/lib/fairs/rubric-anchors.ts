import type { RubricTrackKey } from '@/lib/fairs/rubric-scoring'

/**
 * Teacher rubric anchors + talking points (Feature F10 — teacher-side rubric
 * scoring). Curated, static content — NO LLM call, NO DB row — mirroring the
 * house style of `isef-rubric.ts`. Gives a teacher, for each ISEF criterion in
 * both tracks, a low/mid/high anchor description (what a weak/adequate/strong
 * answer looks like, worded to that criterion's `items[]` in ISEF_RUBRIC) plus
 * concrete talking-point prompts to raise with the team.
 *
 * `criterionKey`/`track`/`numeral`/`title` intentionally match
 * `rubricCriteriaFor(track)` output 1:1 so the teacher UI can join anchor
 * content onto the same criterion row the score inputs render for. Section V
 * (Presentation) is authored here as ONE 35-point criterion, matching how
 * rubric-scoring.ts flattens it (Poster + Interview are not split for scoring).
 */

export interface RubricAnchor {
  tier: 'low' | 'mid' | 'high'
  /** Authored per criterion (not computed) so the reviewer can read the band directly. */
  scoreBand: string
  description: string
}

export interface CriterionAnchor {
  /** `"${track}:${numeral}"` — matches rubric-scoring.ts's ScoreableCriterion.key. */
  criterionKey: string
  track: RubricTrackKey
  numeral: string
  title: string
  /** Exactly 3, in order: low, mid, high. */
  anchors: RubricAnchor[]
  /** 2–4 "what to say to the team" prompts. */
  talkingPoints: string[]
}

export const RUBRIC_ANCHORS: CriterionAnchor[] = [
  // ─── Science track ──────────────────────────────────────────────────────
  {
    criterionKey: 'science:I',
    track: 'science',
    numeral: 'I',
    title: 'Research Question',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–4',
        description:
          'The question is vague or a restated topic ("Does light affect plants?"), doesn\'t say what will actually be measured, and it is unclear how it fits into or extends existing work in the field.',
      },
      {
        tier: 'mid',
        scoreBand: '5–7',
        description:
          'The question is testable and names a variable or comparison, but the specific contribution to the field is thin or only vaguely gestured at ("this hasn\'t been tried before" without evidence).',
      },
      {
        tier: 'high',
        scoreBand: '8–10',
        description:
          'The question is sharply scoped, names the measurable outcome, and the team can explain — with a specific gap in prior work — exactly what new answer this project adds.',
      },
    ],
    talkingPoints: [
      'Can you say your question as one sentence with the variable you\'re measuring in it?',
      'What did you find when you searched for someone who already tried this — and what will you do differently?',
      'How would you test this using the scientific method, step by step?',
    ],
  },
  {
    criterionKey: 'science:II',
    track: 'science',
    numeral: 'II',
    title: 'Design and Methodology',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–5',
        description:
          'No clear control group or comparison condition; variables aren\'t named as independent/dependent/controlled; the data-collection method is described only in general terms ("we\'ll measure growth").',
      },
      {
        tier: 'mid',
        scoreBand: '6–10',
        description:
          'A control exists and independent/dependent variables are named, but some controlled variables are missing or the data-collection procedure has gaps a reader would need to guess to replicate.',
      },
      {
        tier: 'high',
        scoreBand: '11–15',
        description:
          'A complete, well-controlled plan: independent/dependent/controlled variables are all named, the control condition is explicit, and the data-collection procedure is specific enough that another team could follow it exactly.',
      },
    ],
    talkingPoints: [
      'What exactly is your control group, and what makes it a fair comparison?',
      'Walk me through your data-collection steps — could I repeat this myself from what you just told me?',
      'Which variables are you holding constant, and how are you holding them constant?',
    ],
  },
  {
    criterionKey: 'science:III',
    track: 'science',
    numeral: 'III',
    title: 'Execution: Data Collection, Analysis & Interpretation',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–7',
        description:
          'Too few trials to support any conclusion, no statistical or mathematical treatment of the data, and results are stated without discussing whether they could be reproduced.',
      },
      {
        tier: 'mid',
        scoreBand: '8–14',
        description:
          'A reasonable number of trials with basic statistics (mean, simple comparison), but reproducibility isn\'t addressed directly and the interpretation doesn\'t fully connect back to the data collected.',
      },
      {
        tier: 'high',
        scoreBand: '15–20',
        description:
          'Systematic, repeated data collection; appropriate statistical or mathematical analysis for the data type; the team can speak to whether/how results would reproduce, and conclusions are clearly supported by the data shown.',
      },
    ],
    talkingPoints: [
      'How many trials did you run, and how did you decide that was enough?',
      'What statistical test or calculation did you use, and why that one?',
      'If someone repeated your exact procedure, do you expect they\'d get the same result? Why?',
    ],
  },
  {
    criterionKey: 'science:IV',
    track: 'science',
    numeral: 'IV',
    title: 'Creativity & Potential Impact',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–7',
        description:
          'A standard, well-worn approach with no distinguishing angle, and the team can\'t articulate any real-world impact beyond "it\'s interesting."',
      },
      {
        tier: 'mid',
        scoreBand: '8–14',
        description:
          'Some original framing or method choice, and a plausible but generic impact statement ("this could help the environment") without a concrete pathway.',
      },
      {
        tier: 'high',
        scoreBand: '15–20',
        description:
          'A genuinely novel angle on the question or method, and the team can name a specific field, technology, or community this could concretely affect and how.',
      },
    ],
    talkingPoints: [
      'What\'s the one part of this project you think no one else has tried quite this way?',
      'If this worked perfectly, who would actually use the result, and how?',
      'What would you change or explore next to push this idea further?',
    ],
  },
  {
    criterionKey: 'science:V',
    track: 'science',
    numeral: 'V',
    title: 'Presentation',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–13',
        description:
          'The poster is cluttered or hard to follow at a glance, and in a mock interview the student gives short or memorized answers without explaining the reasoning behind their own results.',
      },
      {
        tier: 'mid',
        scoreBand: '14–24',
        description:
          'The poster is organized and legible, and the student can explain most of the project, but stumbles on limitations/interpretation questions or can\'t clearly describe their own specific contribution (team projects).',
      },
      {
        tier: 'high',
        scoreBand: '25–35',
        description:
          'A clean, well-organized poster with clear graphics, and in conversation the student explains the science confidently, owns the limitations of their own results, and (for team projects) can describe every member\'s specific contribution.',
      },
    ],
    talkingPoints: [
      'Explain your results to me as if I know nothing about this topic — where does it get confusing?',
      'What are the biggest limitations of your results, and what would you change if you ran this again?',
      'If this is a team project, what did you personally do versus your teammates?',
    ],
  },

  // ─── Engineering track ──────────────────────────────────────────────────
  {
    criterionKey: 'engineering:I',
    track: 'engineering',
    numeral: 'I',
    title: 'Research Problem',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–4',
        description:
          'The "problem" is really just a topic ("build a robot"), with no stated practical need, no criteria for what a good solution looks like, and no constraints (cost, size, materials, time) named.',
      },
      {
        tier: 'mid',
        scoreBand: '5–7',
        description:
          'A real practical need is named and a few success criteria are listed, but constraints are incomplete or vague, so it\'s hard to tell when the design would actually be "done."',
      },
      {
        tier: 'high',
        scoreBand: '8–10',
        description:
          'A specific, real-world need is stated, success criteria are concrete and measurable, and the constraints (cost/materials/safety/time) are explicit enough to judge any proposed solution against.',
      },
    ],
    talkingPoints: [
      'Who actually has this problem, and how do you know it\'s a real need for them?',
      'How will you know your solution succeeded — what are the specific criteria?',
      'What constraints are you designing within (budget, materials, size, time)?',
    ],
  },
  {
    criterionKey: 'engineering:II',
    track: 'engineering',
    numeral: 'II',
    title: 'Design and Methodology',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–5',
        description:
          'Only one design was considered with no discussion of alternatives, and the prototype/model is little more than a sketch or an untested first attempt.',
      },
      {
        tier: 'mid',
        scoreBand: '6–10',
        description:
          'A couple of alternatives were considered and a reason given for the chosen solution, and a prototype/model exists, but the reasoning for rejecting other alternatives is thin.',
      },
      {
        tier: 'high',
        scoreBand: '11–15',
        description:
          'Multiple genuine alternatives were explored and compared against the criteria/constraints, the chosen solution is clearly justified, and a real prototype/model has been built to test it.',
      },
    ],
    talkingPoints: [
      'What other designs did you consider, and specifically why did you rule them out?',
      'Show me the prototype — what does it demonstrate that a sketch couldn\'t?',
      'Which of your original constraints most shaped the design you landed on?',
    ],
  },
  {
    criterionKey: 'engineering:III',
    track: 'engineering',
    numeral: 'III',
    title: 'Execution: Construction & Testing',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–7',
        description:
          'The prototype was tested once or under a single condition, so there\'s no evidence it works reliably, and the build shows obvious gaps in craftsmanship or incomplete construction.',
      },
      {
        tier: 'mid',
        scoreBand: '8–14',
        description:
          'The prototype was tested across a few conditions or trials and mostly performs as intended, though the build has some rough edges or a condition that clearly should have been tested wasn\'t.',
      },
      {
        tier: 'high',
        scoreBand: '15–20',
        description:
          'The prototype was tested across multiple conditions/trials with results that support it meeting the design criteria, and the build itself demonstrates real engineering skill and is complete.',
      },
    ],
    talkingPoints: [
      'What different conditions or trials did you test this prototype under?',
      'Where did the prototype fail or underperform during testing, and what did you learn from that?',
      'What would you point to as the trickiest engineering problem you had to solve building this?',
    ],
  },
  {
    criterionKey: 'engineering:IV',
    track: 'engineering',
    numeral: 'IV',
    title: 'Creativity & Potential Impact',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–7',
        description:
          'A conventional solution using a standard approach, with no clear articulation of who benefits or what would change if it were adopted.',
      },
      {
        tier: 'mid',
        scoreBand: '8–14',
        description:
          'Some creative choice in the design or materials, and a general sense of who might benefit, but without a concrete picture of adoption or scale.',
      },
      {
        tier: 'high',
        scoreBand: '15–20',
        description:
          'A distinctive, inventive design choice, and the team can describe a specific user, industry, or context where this solution could realistically be adopted and what impact that would have.',
      },
    ],
    talkingPoints: [
      'What part of your design would surprise another engineer who\'s seen similar projects?',
      'If a real company or community adopted this, what would change for them?',
      'What\'s the next version of this you\'d want to build?',
    ],
  },
  {
    criterionKey: 'engineering:V',
    track: 'engineering',
    numeral: 'V',
    title: 'Presentation',
    anchors: [
      {
        tier: 'low',
        scoreBand: '0–13',
        description:
          'The poster is disorganized or the graphics are hard to read, and in a mock interview the student can\'t clearly explain how the prototype works or why it was designed that way.',
      },
      {
        tier: 'mid',
        scoreBand: '14–24',
        description:
          'The poster is legible and organized, and the student can describe the prototype, but has trouble discussing its limitations or (for team projects) their own specific role.',
      },
      {
        tier: 'high',
        scoreBand: '25–35',
        description:
          'A clear, well-organized poster with strong supporting graphics, and the student confidently explains the design reasoning, honestly discusses the prototype\'s limitations, and (for team projects) can describe every member\'s specific contribution.',
      },
    ],
    talkingPoints: [
      'Explain how your prototype works to me as if I\'ve never seen it before.',
      'What doesn\'t your prototype do yet that an ideal version would?',
      'If this is a team project, what did you personally build or test versus your teammates?',
    ],
  },
]

/** Looks up the curated anchor content for one criterion, or undefined if unauthored. */
export function anchorFor(track: RubricTrackKey, criterionKey: string): CriterionAnchor | undefined {
  return RUBRIC_ANCHORS.find((a) => a.track === track && a.criterionKey === criterionKey)
}
