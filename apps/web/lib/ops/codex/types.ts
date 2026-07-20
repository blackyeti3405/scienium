/**
 * Field Codex (Feature F13) — content type definitions.
 *
 * The whole curriculum hierarchy is Track → Segment (Core | Branch) → Unit →
 * Lesson → Checkpoint. Content itself lives as typed TS constants under
 * `./tracks/<slug>.ts`, lazily loaded per track (see `index.ts`'s
 * `loadTrack`, mirroring `lib/data-terminal/charts-guide.ts`'s
 * `loadChartField` pattern) — nothing here is fetched from an API or
 * persisted; only per-student PROGRESS against this content is persisted
 * (see `CodexLessonProgress` in schema.prisma).
 *
 * These interfaces are intentionally DB-free so `engine.ts` (grading,
 * shuffling, gating, fluency) can be pure and unit-tested with zero mocks.
 */

// ─── Checkpoint question kinds ──────────────────────────────────────────────

export interface McOption {
  id: string
  text: string
}

/** Multiple choice — exactly one correct option. */
export interface McQuestion {
  kind: 'mc'
  id: string
  prompt: string
  options: McOption[]
  /** The correct option's id. */
  answerId: string
  /** A written explanation for EVERY option id (including the correct one) —
   *  shown when a student picks a wrong option. */
  explanations: Record<string, string>
}

export interface OrderingItem {
  id: string
  text: string
}

/** Ordering — arrange items into the one correct sequence. */
export interface OrderingQuestion {
  kind: 'ordering'
  id: string
  prompt: string
  items: OrderingItem[]
  /** The correct sequence of item ids. */
  correctOrder: string[]
  /** Written explanation shown on an incorrect ordering. */
  explanation: string
}

export interface MatchLeftItem {
  id: string
  text: string
}
export interface MatchRightItem {
  id: string
  text: string
}

/** Matching — pair every left item with its correct right item. */
export interface MatchingQuestion {
  kind: 'matching'
  id: string
  prompt: string
  left: MatchLeftItem[]
  right: MatchRightItem[]
  /** The correct [leftId, rightId] pairs — one per left item. */
  correctPairs: [string, string][]
  /** Written explanation shown on an incorrect matching. */
  explanation: string
}

export type CheckpointQuestion = McQuestion | OrderingQuestion | MatchingQuestion

export interface Checkpoint {
  /** 3–5 authored questions, any mix of the three kinds. */
  questions: CheckpointQuestion[]
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

export interface LessonSection {
  heading: string
  /** Prose body — rendered in a REGULAR (non-font-pixel) body font per the
   *  house pixel-chrome rule (chrome is font-pixel; article prose is not). */
  body: string
}

export interface Lesson {
  /** Globally-unique, slug-safe id (e.g. "biomech-core-gait-cycle-basics"). */
  id: string
  label: string
  /** Estimated reading time in minutes (for the "~N min" affordance). */
  readingMinutes: number
  sections: LessonSection[]
  /** A concrete worked example applying the lesson's concept. */
  workedExample: string
  /** "Why judges ask this" framing — ties the concept to fair judging. */
  judgeFraming: string
  checkpoint: Checkpoint
}

// ─── Unit / Segment / Track ─────────────────────────────────────────────────

export interface Unit {
  id: string
  label: string
  /** Sequential — lesson N unlocks only once lesson N-1 is complete. */
  lessons: Lesson[]
}

export type SegmentKind = 'core' | 'branch'

export interface Segment {
  id: string
  kind: SegmentKind
  label: string
  /** Sequentially gated — unit N unlocks only once every lesson of unit N-1
   *  is complete (see `unitUnlocked` in engine.ts). */
  units: Unit[]
}

export interface CodexTrack {
  slug: string
  label: string
  core: Segment
  /** 0 for Core-only tracks (this cycle's six home tracks); 3-5 for the flagship. */
  branches: Segment[]
}
