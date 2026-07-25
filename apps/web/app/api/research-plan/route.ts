import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { isValidSelection } from '@/lib/research-plan/types'
import { fetchGoogleDocText, GoogleDocError } from '@/lib/research-plan/google-doc'
import { IDEA_CHECK_DAILY_LIMIT, ideaChecksUsedToday } from '@/lib/research-plan/idea-check'
import { logActivityBestEffort } from '@/lib/activity/log'
import { db } from '@/lib/db'

const MAX_STORED_TEXT = 100_000
// Sanity bound only — NOT the stored-text cap. `planText` is deliberately allowed
// well past MAX_STORED_TEXT here: the paste branch below truncates to
// MAX_STORED_TEXT on save (never rejects), matching the plan's truncate-on-save
// contract. A zod `.max(MAX_STORED_TEXT)` on this field would reject oversized
// input at parse time, before the handler's truncation ever ran — that was the
// AC10 bug. This cap just stops an absurd (multi-MB) payload from being parsed.
const MAX_PLAN_TEXT_INPUT = 1_000_000

// `.strict()` rejects extra fields; the URL is validated for the Google-Docs
// shape inside fetchGoogleDocText, so here we only bound its length. Exactly one
// of `googleDocUrl` / `planText` must be provided (paste-text fallback, F3) —
// enforced below via `.superRefine` since zod's per-field `.optional()` can't
// express "exactly one of these two".
const PlanBody = z
  .object({
    googleDocUrl: z.string().trim().max(2000).optional(),
    planText: z.string().max(MAX_PLAN_TEXT_INPUT).optional(),
    projectType: z.string().trim().max(64).optional(),
    projectSubtype: z.string().trim().max(64).optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    const hasDoc = !!body.googleDocUrl && body.googleDocUrl.trim().length > 0
    // Whitespace-only pasted text counts as "not provided".
    const hasText = !!body.planText && body.planText.trim().length > 0
    if (hasDoc && hasText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a Google Doc link or paste your plan text, not both',
        path: ['googleDocUrl'],
      })
    }
    if (!hasDoc && !hasText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a Google Doc link or paste your plan text',
        path: ['googleDocUrl'],
      })
    }
  })

/** GET /api/research-plan — current plan config, sync state, last review, quota. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const plan = await db.researchPlan.findUnique({ where: { teamId: ctx.teamId } })
  const usedToday = await ideaChecksUsedToday(ctx.teamId)

  return NextResponse.json({
    plan: plan
      ? {
          googleDocUrl: plan.googleDocUrl,
          projectType: plan.projectType,
          projectSubtype: plan.projectSubtype,
          lastSyncedAt: plan.lastSyncedAt?.toISOString() ?? null,
          hasText: !!plan.lastSyncedText,
          textPreview: plan.lastSyncedText?.slice(0, 600) ?? null,
          // Legacy rows (pre-F3) never set lastSyncedSource — every one of them got
          // its text from a doc, so a null column resolves to 'google_doc' here.
          activeSource: plan.lastSyncedSource ?? (plan.googleDocUrl ? 'google_doc' : null),
          // Full text ONLY for paste rows, so the textarea can edit-in-place without
          // ever shipping a (possibly 100k-char) Google Doc export to the client.
          planTextFull: plan.lastSyncedSource === 'paste' ? plan.lastSyncedText : null,
          // Only a structured object is a valid review (guards against any legacy value).
          lastReview:
            plan.lastReviewJson && typeof plan.lastReviewJson === 'object' ? plan.lastReviewJson : null,
          lastReviewedAt: plan.lastReviewedAt?.toISOString() ?? null,
          // The current idea-check result, so it persists across reloads.
          lastIdeaCheck:
            plan.lastIdeaCheckJson && typeof plan.lastIdeaCheckJson === 'object'
              ? plan.lastIdeaCheckJson
              : null,
          lastIdeaCheckAt: plan.lastIdeaCheckAt?.toISOString() ?? null,
        }
      : null,
    ideaCheck: { usedToday, limit: IDEA_CHECK_DAILY_LIMIT, remaining: Math.max(0, IDEA_CHECK_DAILY_LIMIT - usedToday) },
  })
}

/**
 * POST /api/research-plan — save the project type/subtype and (re)sync
 * `lastSyncedText` from exactly one of two inputs (F3 paste-text fallback):
 *   - `googleDocUrl` — fetches the doc's published text (also doubles as "Refresh").
 *   - `planText` — stores the pasted/typed text directly, no external fetch.
 * Whichever was last saved is the active source ("last-saved wins").
 */
export async function POST(req: NextRequest) {
  // Mutating + (on the doc path) triggers an external fetch — moderate per-user +
  // per-IP limit. The paste path is pure DB write but shares the same tier — it's
  // still a mutate, and splitting tiers by branch isn't worth the complexity here.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data: body, error } = await parseJson(req, PlanBody)
  if (error) return error
  const { googleDocUrl, planText, projectType, projectSubtype } = body
  if (projectType && projectSubtype && !isValidSelection(projectType, projectSubtype)) {
    return NextResponse.json({ error: 'Invalid project type selection' }, { status: 400 })
  }

  // `.superRefine` already guarantees exactly one of these is non-empty (after
  // trim), so this branch is exhaustive.
  const usingDoc = !!googleDocUrl && googleDocUrl.trim().length > 0

  let stored: string
  let data: {
    projectType: string | null
    projectSubtype: string | null
    lastSyncedText: string
    lastSyncedAt: Date
    lastSyncedSource: 'google_doc' | 'paste'
    googleDocUrl?: string
  }

  if (usingDoc) {
    // Doc path — unchanged behaviour: fetch the live doc text, surface sharing
    // problems as a clean error instead of a 500.
    let fetched: { text: string; canonicalUrl: string }
    try {
      fetched = await fetchGoogleDocText(googleDocUrl)
    } catch (err) {
      if (err instanceof GoogleDocError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }
    stored = fetched.text.slice(0, MAX_STORED_TEXT)
    data = {
      // The CANONICAL doc URL, never the pasted string — the teacher view
      // renders this as a trusted link (REFACTOR2 P1-S12).
      googleDocUrl: fetched.canonicalUrl,
      projectType: projectType ?? null,
      projectSubtype: projectSubtype ?? null,
      lastSyncedText: stored,
      lastSyncedAt: new Date(),
      lastSyncedSource: 'google_doc',
    }
  } else {
    // Paste path — no external fetch, no Anthropic call. `googleDocUrl` is
    // intentionally omitted from `data`: on update it leaves any previously-saved
    // doc URL untouched (switching back to the doc stays one click); on create it
    // defaults to the column's null.
    const trimmed = (planText ?? '').trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Paste some plan text first' }, { status: 400 })
    }
    stored = trimmed.slice(0, MAX_STORED_TEXT)
    data = {
      projectType: projectType ?? null,
      projectSubtype: projectSubtype ?? null,
      lastSyncedText: stored,
      lastSyncedAt: new Date(),
      lastSyncedSource: 'paste',
    }
  }

  const plan = await db.researchPlan.upsert({
    where: { teamId: ctx.teamId },
    // On create, a brand-new paste-path row has no doc URL yet — `data` only
    // carries `googleDocUrl` on the doc path, so default it to null here.
    create: { teamId: ctx.teamId, googleDocUrl: null, ...data },
    update: data,
  })

  logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'plan_synced', {}).catch(console.error)

  return NextResponse.json({
    plan: {
      googleDocUrl: plan.googleDocUrl,
      projectType: plan.projectType,
      projectSubtype: plan.projectSubtype,
      lastSyncedAt: plan.lastSyncedAt?.toISOString() ?? null,
      hasText: true,
      textPreview: stored.slice(0, 600),
      activeSource: plan.lastSyncedSource ?? (plan.googleDocUrl ? 'google_doc' : null),
      planTextFull: plan.lastSyncedSource === 'paste' ? plan.lastSyncedText : null,
      lastReview:
        plan.lastReviewJson && typeof plan.lastReviewJson === 'object' ? plan.lastReviewJson : null,
      lastReviewedAt: plan.lastReviewedAt?.toISOString() ?? null,
    },
  })
}
