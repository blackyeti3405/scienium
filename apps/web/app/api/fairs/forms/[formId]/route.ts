import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
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
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

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
