import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ensureFormsSeeded } from '@/lib/fairs/forms'
import { db } from '@/lib/db'

/**
 * GET /api/fairs/forms
 *
 * Returns the full ISEF forms catalog annotated with the team's completion
 * status for each form.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

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
