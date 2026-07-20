import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { completeLesson } from '@/lib/ops/codex/complete-service'

/**
 * POST /api/ops/codex/complete — thin adapter (Track B P1-2): guard, Zod
 * parse, one application-service call, HTTP mapping. The progression gate,
 * server-side grading, once-ever KP claim, and atomic daily-cap enforcement
 * live in `lib/ops/codex/complete-service.ts`.
 */

// A checkpoint has at most 5 questions, each answer a small bounded payload —
// caps the submission size regardless of question kind.
const AnswerSchema = z.union([
  z.object({ kind: z.literal('mc'), id: z.string().trim().min(1).max(64), selectedOptionId: z.string().trim().min(1).max(64) }).strict(),
  z.object({ kind: z.literal('ordering'), id: z.string().trim().min(1).max(64), order: z.array(z.string().trim().min(1).max(64)).max(10) }).strict(),
  z
    .object({
      kind: z.literal('matching'),
      id: z.string().trim().min(1).max(64),
      pairs: z.array(z.tuple([z.string().trim().min(1).max(64), z.string().trim().min(1).max(64)])).max(10),
    })
    .strict(),
])

const CompleteBody = z
  .object({
    trackSlug: z.string().trim().min(1).max(64),
    lessonId: z.string().trim().min(1).max(120),
    submission: z.object({ answers: z.array(AnswerSchema).max(5) }).strict(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CompleteBody)
  if (bodyError) return bodyError

  const result = await completeLesson({ dbUserId: ctx.dbUserId, teamId: ctx.teamId }, data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { ok: _ok, ...body } = result
  return NextResponse.json(body)
}
