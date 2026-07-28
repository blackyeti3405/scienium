/**
 * Proof of Expertise / Clearance Level — configuration & shared types.
 *
 * Clearance is the lab's *mastery* axis, distinct from KP (the grind axis). A team
 * raises its clearance by passing escalating "clearance exams": a member answers a
 * short set of questions generated from the team's OWN project at increasing depth,
 * and a passing aggregate score raises `TeamCurrency.clearanceLevel`. Higher tiers
 * of the Buildings shop require a minimum clearance (lib/shop.ts), so the shop has a
 * ceiling you can only lift by demonstrating you understand your work.
 *
 * Pricing/pedagogy lives here so it can be tuned without touching routes or UI.
 */

/** Highest clearance a team can reach. */
import { z } from 'zod'

export const MAX_CLEARANCE = 5

/** Aggregate score (0-100) required to pass a clearance exam. */
export const CLEARANCE_PASS_THRESHOLD = 75

export interface ClearanceLevel {
  /** 1-based level this exam grants on a pass. */
  level: number
  /** Title the team earns at this level (level 0 is "Trainee"). */
  title: string
  /** One-word theme shown on the ladder. */
  theme: string
  /** What this exam assesses — shown before the student begins. */
  blurb: string
  /** Number of questions generated for this level (deeper levels probe more). */
  questionCount: number
  /** Bonus KP granted the first time the team reaches this level. */
  kpBonus: number
}

/**
 * The five clearance exams, escalating from "explain your topic" to "defend your
 * contribution". Each draws on whatever project context exists (topic, research
 * idea, plan, sources, logs); early levels lean on the topic/sources, later ones
 * on the plan and the student's reasoning.
 */
export const CLEARANCE_LEVELS: ClearanceLevel[] = [
  {
    level: 1,
    title: 'Certified Researcher',
    theme: 'Foundations',
    blurb:
      'Explain your research topic in your own words, the key terms involved, and why the question matters.',
    questionCount: 3,
    kpBonus: 150,
  },
  {
    level: 2,
    title: 'Field Specialist',
    theme: 'Methodology',
    blurb:
      'Lay out your research question or engineering goal, your variables or approach, and why your method fits.',
    questionCount: 4,
    kpBonus: 300,
  },
  {
    level: 3,
    title: 'Senior Investigator',
    theme: 'Evidence',
    blurb:
      'Connect the literature to your approach: what prior work informs you, what results you expect, and how you would interpret them.',
    questionCount: 4,
    kpBonus: 500,
  },
  {
    level: 4,
    title: 'Principal Investigator',
    theme: 'Rigor',
    blurb:
      'Address limitations, controls, sources of error, validity, and the alternative explanations a judge would press on.',
    questionCount: 5,
    kpBonus: 800,
  },
  {
    level: 5,
    title: 'Distinguished Scientist',
    theme: 'Mastery',
    blurb:
      'Defend the novelty and broader impact of your work, withstand tough critique, and chart credible future directions.',
    questionCount: 5,
    kpBonus: 1200,
  },
]

/** Metadata for a given level, or null if out of range. */
export function levelInfo(level: number): ClearanceLevel | null {
  return CLEARANCE_LEVELS.find((l) => l.level === level) ?? null
}

/** The team's clearance title (level 0 → "Trainee"). */
export function clearanceTitle(level: number): string {
  if (level <= 0) return 'Trainee'
  return levelInfo(Math.min(level, MAX_CLEARANCE))?.title ?? 'Trainee'
}

// ─── Question / grading types (mirror the paper-quiz shapes) ──────────────────

/** A generated exam question. `key` is grading guidance — never sent to the client. */
export interface ExpertiseQuestion {
  id: string
  prompt: string
  focus: string
  key: string
}

/** What the client receives — the grading key is stripped. */
export type ClientExpertiseQuestion = Omit<ExpertiseQuestion, 'key'>

/**
 * One graded clearance answer, as the MODEL returns it (REFACTOR2 P2-S9).
 * `gradeAnswers` `safeParse`s each element — a clearance raise mints KP, so a
 * malformed row must never reach `clampScore` or the level high-water write.
 */
export const GradedExpertiseAnswerSchema = z.object({
  questionId: z.string().min(1),
  score: z.number().finite(),
  rationale: z.string().default(''),
})

export type GradedExpertiseAnswer = z.infer<typeof GradedExpertiseAnswerSchema>

export function stripExpertiseKeys(questions: ExpertiseQuestion[]): ClientExpertiseQuestion[] {
  return questions.map(({ key: _key, ...rest }) => rest)
}

// NOTE: this module is import-safe from client components (pure config/types
// only). The rubric loader, which reads from the filesystem, lives in the
// server-only sibling lib/clearance/rubric.ts so it never reaches the browser
// bundle (ShopPanel imports clearanceTitle from here).
