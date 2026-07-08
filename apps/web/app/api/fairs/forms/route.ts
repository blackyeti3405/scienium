import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { ensureFormsSeeded } from '@/lib/fairs/forms'
import { db } from '@/lib/db'

/**
 * GET /api/fairs/forms
 *
 * Returns the full ISEF forms catalog annotated with the team's completion
 * status for each form.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  await ensureFormsSeeded()

  const [catalog, statuses] = await Promise.all([
    db.formsCatalog.findMany({ orderBy: { formCode: 'asc' } }),
    db.teamFormStatus.findMany({ where: { teamId: ctx.teamId } }),
  ])

  const statusMap = new Map(statuses.map((s) => [s.formId, s]))

  const forms = catalog.map((f) => {
    const s = statusMap.get(f.id)
    return {
      id: f.id,
      code: f.formCode,
      name: f.name,
      description: f.description,
      url: f.templateUrl,
      requiredFor: f.requiredForLevelsJson as string[],
      status: s?.status ?? 'not_started',
      completedAt: s?.completedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ forms })
}
