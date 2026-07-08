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

/** Q&A panel state machine — quiz sub-phases plus the post-quiz chat view. */
export type QuizPhase = 'loading' | 'quiz' | 'grading' | 'results' | 'chat' | 'retry' | 'retrying'

export const TOTAL_SLOTS = 25
