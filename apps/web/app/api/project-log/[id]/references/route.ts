import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { logActivityBestEffort } from '@/lib/activity/log'
import { db } from '@/lib/db'

// v1 is log↔log linking only (progress entries linking to other progress
// entries) — see plan-F6.md. Both endpoints of a reference must belong to the
// caller's team; this is the same 404-on-miss IDOR pattern used by
// app/api/project-log/[id]/route.ts and app/api/failure-log/[id]/followup/route.ts.
const MAX_OUTGOING_REFERENCES = 10

const Body = z.object({
  targetId: z.string().min(1).max(64),
}).strict()

// POST — create a reference FROM entry [id] TO another progress entry.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  if (params.id === data.targetId) {
    return NextResponse.json({ error: "An entry can't reference itself" }, { status: 400 })
  }

  // Team-scope / IDOR: validate BOTH endpoints belong to ctx.teamId. Resolving
  // the target through a team-scoped findFirst means a guessed id from another
  // team 404s exactly like an id that doesn't exist at all.
  const [from, to] = await Promise.all([
    db.projectLog.findFirst({
      where: { id: params.id, teamId: ctx.teamId, entryType: 'progress' },
      select: { id: true },
    }),
    db.projectLog.findFirst({
      where: { id: data.targetId, teamId: ctx.teamId, entryType: 'progress' },
      select: { id: true, stage: true, createdAt: true, createdBy: { select: { name: true } } },
    }),
  ])
  if (!from) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (!to) return NextResponse.json({ error: 'Linked entry not found' }, { status: 404 })

  // Storage cap — analogous to attachmentUrls.max(20).
  const existingCount = await db.projectLogReference.count({
    where: { projectLogId: params.id },
  })
  if (existingCount >= MAX_OUTGOING_REFERENCES) {
    return NextResponse.json(
      { error: `This entry already links the maximum of ${MAX_OUTGOING_REFERENCES} entries` },
      { status: 400 },
    )
  }

  try {
    await db.projectLogReference.create({
      data: { projectLogId: params.id, referencesLogId: data.targetId },
    })
  } catch (err) {
    // P2002 = the composite PK (projectLogId, referencesLogId) already exists —
    // idempotent create, treat as success rather than error.
    if (!(typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002')) {
      throw err
    }
  }

  logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'log_edited', { kind: 'progress' }).catch(console.error)

  // entryNumber is oldest-first index+1 across the team's progress entries —
  // same derivation as the read path (GET /api/project-log).
  const ordered = await db.projectLog.findMany({
    where: { teamId: ctx.teamId, entryType: 'progress' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  const entryNumber = ordered.findIndex((e) => e.id === to.id) + 1

  return NextResponse.json({
    reference: {
      id: to.id,
      entryNumber,
      stage: to.stage,
      createdAt: to.createdAt,
      createdByName: to.createdBy.name,
    },
  }, { status: 201 })
}

// DELETE — remove the reference FROM entry [id] TO ?targetId=<id>.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const targetId = req.nextUrl.searchParams.get('targetId')
  if (!targetId) {
    return NextResponse.json({ error: 'targetId required' }, { status: 400 })
  }

  // Team-scope: confirming `from` belongs to ctx.teamId is sufficient — the
  // composite PK is (from, to), so scoping `from` alone prevents cross-team
  // deletes regardless of what targetId is passed.
  const from = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'progress' },
    select: { id: true },
  })
  if (!from) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  // deleteMany so removing an already-gone link is a no-op, not a 500.
  await db.projectLogReference.deleteMany({
    where: { projectLogId: params.id, referencesLogId: targetId },
  })

  return NextResponse.json({ ok: true })
}
