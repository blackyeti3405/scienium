import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const PatchBody = z
  .object({ status: z.enum(['not_started', 'in_progress', 'complete']) })
  .strict()

/**
 * PATCH /api/fairs/forms/[formId]
 *
 * Creates or updates the team's status on one ISEF form.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { formId } = await params
  const { data, error } = await parseJson(req, PatchBody)
  if (error) return error

  const form = await db.formsCatalog.findUnique({ where: { id: formId } })
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  const row = await db.teamFormStatus.upsert({
    where: { teamId_formId: { teamId: ctx.teamId, formId } },
    create: {
      teamId: ctx.teamId,
      formId,
      status: data.status,
      completedAt: data.status === 'complete' ? new Date() : null,
    },
    update: {
      status: data.status,
      completedAt: data.status === 'complete' ? new Date() : null,
    },
  })

  return NextResponse.json({ status: row.status, completedAt: row.completedAt?.toISOString() ?? null })
}
