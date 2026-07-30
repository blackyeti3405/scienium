import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { generateStudyPlan, setManualTrackSelection } from '@/lib/ops/codex/study-plan-service'

/**
 * /api/ops/codex/study-plan — thin adapter (Track B P1-2). The sourceHash
 * cache, atomic daily re-run cap, and manual-selection rules live in
 * `lib/ops/codex/study-plan-service.ts`.
 */

/** POST — generate or regenerate the team's Study Plan. Tier `ai` (Anthropic-backed). */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const result = await generateStudyPlan({ teamId: ctx.teamId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { ok: _ok, ...body } = result
  return NextResponse.json(body)
}

const PatchBody = z
  .object({
    action: z.enum(['add', 'remove']),
    trackSlug: z.string().trim().min(1).max(64),
  })
  .strict()

/** PATCH — add/remove a manual track selection. Tier `mutate`. */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PatchBody)
  if (bodyError) return bodyError

  const result = await setManualTrackSelection({ teamId: ctx.teamId }, data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ manualTrackSlugs: result.manualTrackSlugs })
}
