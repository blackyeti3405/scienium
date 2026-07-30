import type { LabType } from '@/lib/phase'
import TEMPLATES_DATA from './synthesis-templates.json'

/**
 * Synthesis Matrix column templates (Literature Review) — 7 static, authored
 * "starter grids" keyed to `Team.labType` (the only discipline signal the
 * schema actually persists — there is no `Team.isefCategory`). Mirrors the
 * `content/data-terminal/*` shape: a typed constant loaded from JSON, no
 * fetch, no LLM call. Every template is a SEED, never a fixed table — the
 * student can rename/add/remove/reorder columns on their own matrix, and the
 * "check my synthesis" call may additionally suggest up to 3 columns (see
 * `lib/literature/synthesis.ts`).
 */

export interface SynthesisColumn {
  /** Slug-safe, unique WITHIN its template. Not globally unique. */
  id: string
  label: string
  hint: string
}

export interface SynthesisTemplate {
  id: string
  label: string
  description: string
  /** LabType values this template is the default seed for; `[]` for the `general` fallback. */
  labTypes: LabType[]
  columns: SynthesisColumn[]
  optionalColumns: SynthesisColumn[]
}

export const SYNTHESIS_TEMPLATES = TEMPLATES_DATA as unknown as SynthesisTemplate[]

/**
 * Hard ceiling on a matrix's column count. Lives here (not in the
 * `server-only` `lib/literature/synthesis.ts`) so both the server-side zod
 * schema AND the client-side grid editor import the SAME literal instead of
 * each hardcoding `8` — this module has no `server-only` guard, so it's the
 * one place both sides can share.
 */
export const MAX_COLUMNS = 8

/** The discipline-neutral fallback template — used when a team has no `labType`. */
const GENERAL_TEMPLATE_ID = 'general'

/** Resolves a team's default seed template from its `labType` (null-safe). */
export function templateForLabType(labType: LabType | null): SynthesisTemplate {
  if (labType) {
    const match = SYNTHESIS_TEMPLATES.find((t) => t.labTypes.includes(labType))
    if (match) return match
  }
  const general = SYNTHESIS_TEMPLATES.find((t) => t.id === GENERAL_TEMPLATE_ID)
  if (!general) throw new Error('synthesis-templates.json is missing the "general" fallback template')
  return general
}

/** Looks up a template by id — used when a student explicitly picks one at create time. */
export function findTemplate(id: string): SynthesisTemplate | undefined {
  return SYNTHESIS_TEMPLATES.find((t) => t.id === id)
}
