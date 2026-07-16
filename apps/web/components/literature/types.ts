import type { CredibilityTier } from '@prisma/client'

// ─── Shared Literature Review types + constants ───────────────────────────────
// Extracted verbatim from LiteratureFeature.tsx during its component split — the
// shell, hooks, and workflow components all import from here.

export interface Paper {
  id: string
  title: string
  authors: string[]
  status: 'uploading' | 'processing' | 'ready' | 'error'
  proficiencyDemonstrated: boolean
  fileUrl?: string
  createdAt: string
  /** 0–100 while `status === 'uploading'` — real bytes from `uploadWithProgress`. */
  uploadProgress?: number
  /** F12: resolved at read time (promoted source's tier, or DOI-derived, or
   * `null` for "self-uploaded — verify yourself"). */
  credibilityTier?: CredibilityTier | null
  /** DOI the tier was derived from, when found (badge tooltip context). */
  doi?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface QuizQuestionView {
  id: string
  prompt: string
  focus: string
}

export interface GradeResult {
  score: number
  passed: boolean
  threshold: number
  /** KP granted by this grading (0 unless this attempt beat the source's prior best). */
  kpEarned?: number
  results: {
    questionId: string
    score: number
    rationale: string
    /** Present only for questions scored below the pass threshold. */
    strongAnswer?: string
  }[]
}

/** Q&A panel state machine — quiz sub-phases plus the post-quiz chat and
 *  explain-it-back views. */
export type QuizPhase =
  | 'loading'
  | 'quiz'
  | 'grading'
  | 'results'
  | 'chat'
  | 'retry'
  | 'retrying'
  | 'explain'

export const TOTAL_SLOTS = 25

// ─── Explain it back ────────────────────────────────────────────────────────

export interface ExplainVerdict {
  accuracy: number
  completeness: number
  correctPoints: string[]
  missedPoints: string[]
  misconceptions: string[]
  followUpQuestion: string
}

export interface ExplainAttempt {
  attemptNo: number
  text: string
  accuracy: number
  completeness: number
  overall: number
  passed: boolean
  verdict: ExplainVerdict
}

export interface ExplainState {
  attemptCount: number
  bestScore: number
  passed: boolean
  latestText: string
  verdict: ExplainVerdict
  threshold: { accuracy: number; completeness: number }
  attempts: ExplainAttempt[]
}

// ─── Synthesis Matrix ───────────────────────────────────────────────────────

export interface SynthesisMatrixListItem {
  id: string
  title: string
  templateId: string
  paperCount: number
  updatedAt: string
  lastCheckedAt: string | null
}

export interface SynthesisColumnView {
  id: string
  label: string
  hint?: string
}

export interface SynthesisCellView {
  paperId: string
  columnId: string
  text: string
}

export interface SynthesisFindingView {
  columnId: string
  paperIds: string[]
  claim: string
  studentNoticed: boolean
}

export interface SynthesisVerdictView {
  agreements: SynthesisFindingView[]
  contradictions: SynthesisFindingView[]
  gaps: { text: string; columnId?: string }[]
  cellIssues: { paperId: string; columnId: string; note: string }[]
  suggestedColumns: { label: string; hint: string }[]
  summary: string
}

export interface SynthesisMatrixView {
  id: string
  title: string
  templateId: string
  columns: SynthesisColumnView[]
  papers: { id: string; title: string; authors: string[] }[]
  cells: SynthesisCellView[]
  lastCheck: SynthesisVerdictView | null
  lastCheckedAt: string | null
  kpAwarded: number
  updatedAt: string
}
