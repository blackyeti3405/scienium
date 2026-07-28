import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { ISEF_EDITION, editionGuidanceState, servedForms } from '@/lib/fairs/forms'
import { db } from '@/lib/db'

/**
 * GET /api/fairs/forms
 *
 * Returns the ACTIVE ISEF edition's forms annotated with the team's completion
 * status. Names come from the authored edition, never from the stored row: a DB
 * seeded under an older edition would otherwise keep serving retired codes and
 * stale titles (REFACTOR2 P0-R4). Rows for codes outside the active edition stay
 * in the table — `TeamFormStatus` FKs point at them — but are not served.
 *
 * Applicability/timing copy passes through `servedForms` (REFACTOR2 §0.8), not
 * straight off the literal: while the edition is unreviewed, expired, or edited
 * since sign-off, `appliesTo` is withheld and the client shows the official-rules
 * pointer instead. The route is the gate because it is the last place the app
 * controls before the copy is a student's to act on.
 *
 * A PURE READ (REFACTOR2 P2-S6): seeding the catalog used to happen here, so
 * the first student to open the checklist after a deploy paid for — and raced
 * on — a global catalog write. `ensureFormsSeeded` now runs on the maintenance
 * cron (`app/api/cron/papers`). A code the edition names but the table has not
 * caught up to is simply not served yet, which is what the `if (!id)` skip
 * below already did for retired codes.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const [catalog, statuses] = await Promise.all([
    db.formsCatalog.findMany({
      where: { formCode: { in: ISEF_EDITION.forms.map((f) => f.code) } },
      select: { id: true, formCode: true },
    }),
    db.teamFormStatus.findMany({ where: { teamId: ctx.teamId } }),
  ])

  const idByCode = new Map(catalog.map((f) => [f.formCode, f.id]))
  const statusMap = new Map(statuses.map((s) => [s.formId, s]))

  const guidance = editionGuidanceState(ISEF_EDITION)
  const forms = servedForms(ISEF_EDITION).flatMap((def) => {
    const id = idByCode.get(def.code)
    if (!id) return []
    const s = statusMap.get(id)
    return [
      {
        id,
        code: def.code,
        name: def.name,
        appliesTo: def.appliesTo,
        url: ISEF_EDITION.formsUrl,
        status: s?.status ?? 'not_started',
        completedAt: s?.completedAt?.toISOString() ?? null,
      },
    ]
  })

  return NextResponse.json({
    forms,
    edition: {
      season: ISEF_EDITION.season,
      formsUrl: ISEF_EDITION.formsUrl,
      rulesUrl: ISEF_EDITION.rulesUrl,
      // One field, not a `reviewed` boolean beside it: the client needs to say
      // WHY it is falling back, and a derived duplicate is a second thing to
      // keep in step.
      guidance,
    },
  })
}
