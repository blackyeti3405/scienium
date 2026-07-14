import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { attachAssetsByKey, resolveAttachmentKeys } from '@/lib/uploads/assets'
import { db } from '@/lib/db'

const Body = z.object({
  body: z.string().min(1).max(5000),
  nextSteps: z.string().min(1).max(2000),
  stage: z.string().min(1, 'Select a project stage').max(100),
  // Bounded to avoid storage-bloat; ids are further intersected with the
  // team's actual roster before persisting (see POST). Attendance is required
  // for multi-member teams (enforced in the handler, which knows the roster).
  attendeeIds: z.array(z.string().max(64)).max(50).default([]),
  // Relative streaming paths into our own attachment view route. Bounded in
  // both count and length so a single entry can't store an unbounded blob.
  attachmentUrls: z
    .array(z.string().max(400).startsWith('/api/project-log/attachment/view'))
    .min(1, 'At least one photo is required')
    .max(20),
}).strict()

// Thrown inside the save transaction when a referenced upload can't be attached
// (already swept, or not this team's) so the whole log write rolls back.
class AttachmentError extends Error {}

// Shared shape for the `select` on a linked/back-linked log — kept as a const
// so the chip-projection reads the exact same fields on both sides.
const referenceLogSelect = {
  select: {
    id: true,
    stage: true,
    createdAt: true,
    createdBy: { select: { name: true } },
  },
} as const

/** Entries per page — newest N first, older pages via `?cursor=<last id>` (PERF-4). */
const PAGE_SIZE = 30

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  // Cursor pagination instead of the old "full team history in one response":
  // newest PAGE_SIZE entries, then older pages on demand. `cursor` is the id of
  // the oldest entry the client already has.
  const cursor = req.nextUrl.searchParams.get('cursor')

  const rows = await db.projectLog.findMany({
    where: { teamId: ctx.teamId, entryType: 'progress' },
    // Tie-break on id so pagination and the numbering window below agree on
    // one total order even for identical createdAt values.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1, // +1 = "is there an older page?" probe
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      nextSteps: true,
      stage: true,
      attendeeIds: true,
      attachmentUrls: true,
      createdAt: true,
      lastEditedAt: true,
      createdBy: { select: { id: true, name: true } },
      lastEditedBy: { select: { id: true, name: true } },
      references: { select: { to: referenceLogSelect } },
      referencedBy: { select: { from: referenceLogSelect } },
    },
  })
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  // Entry numbers are 1-based oldest-first over the WHOLE log, but we no longer
  // load the whole log — derive them (plus the total for the "N entries" header
  // and next entry number) from one windowed ranking query, covering both the
  // page's own rows and every chip target they reference (which may live on a
  // page the client hasn't loaded).
  const chipTargetIds = page.flatMap((r) => [
    ...r.references.map((ref) => ref.to.id),
    ...r.referencedBy.map((ref) => ref.from.id),
  ])
  const neededIds = Array.from(new Set([...page.map((r) => r.id), ...chipTargetIds]))

  let total = 0
  const numberById = new Map<string, number>()
  if (neededIds.length > 0) {
    const ranked = await db.$queryRaw<{ id: string; entry_number: number; total: number }[]>(Prisma.sql`
      SELECT id, entry_number, total FROM (
        SELECT id,
               (ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC))::int AS entry_number,
               (COUNT(*) OVER ())::int AS total
        FROM "project_logs"
        WHERE team_id = ${ctx.teamId} AND entry_type = 'progress'
      ) numbered
      WHERE id IN (${Prisma.join(neededIds)})
    `)
    for (const r of ranked) numberById.set(r.id, r.entry_number)
    total = ranked[0]?.total ?? 0
  } else {
    total = await db.projectLog.count({ where: { teamId: ctx.teamId, entryType: 'progress' } })
  }

  // Members only ride on the first page — the client keeps them across pages.
  const members = cursor
    ? null
    : await db.teamMember.findMany({
        where: { teamId: ctx.teamId },
        orderBy: { joinedAt: 'asc' },
        select: { userId: true, user: { select: { name: true } } },
      })

  function toChip(log: { id: string; stage: string | null; createdAt: Date; createdBy: { name: string } }) {
    const entryNumber = numberById.get(log.id)
    if (entryNumber === undefined) return null // defensive: shouldn't happen post DELETE-cascade fix
    return {
      id: log.id,
      entryNumber,
      stage: log.stage,
      createdAt: log.createdAt,
      createdByName: log.createdBy.name,
    }
  }

  // Project references/referencedBy into chip-ready arrays and drop the raw
  // relation fields so the wire shape stays clean. Rows are already newest-first.
  const entries = page.map(({ references, referencedBy, ...rest }) => ({
    ...rest,
    entryNumber: numberById.get(rest.id) ?? 0,
    links: references.map((r) => toChip(r.to)).filter((c): c is NonNullable<typeof c> => c !== null),
    backlinks: referencedBy.map((r) => toChip(r.from)).filter((c): c is NonNullable<typeof c> => c !== null),
  }))

  const memberList = members?.map((m) => ({ userId: m.userId, name: m.user.name }))

  return NextResponse.json({
    entries,
    total,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    ...(memberList ? { members: memberList } : {}),
    labType: ctx.labType,
    currentUserId: ctx.dbUserId,
  })
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  // Keep only attendee ids that are genuinely on this team, and require
  // attendance for multi-member teams (solo labs have an implicit attendee).
  const roster = await db.teamMember.findMany({
    where: { teamId: ctx.teamId },
    select: { userId: true },
  })
  const rosterIds = new Set(roster.map((m) => m.userId))
  const attendeeIds = (data.attendeeIds ?? []).filter((id) => rosterIds.has(id))
  if (roster.length > 1 && attendeeIds.length === 0) {
    return NextResponse.json({ error: 'Select who was present' }, { status: 400 })
  }

  // Resolve + team-scope the referenced uploads before we write anything —
  // id-URLs authorize through the team-scoped ledger row (SEC-6).
  const keyByUrl = await resolveAttachmentKeys(ctx.teamId, data.attachmentUrls)
  if (keyByUrl === null) {
    return NextResponse.json({ error: 'Invalid attachment reference' }, { status: 400 })
  }
  const keys = Array.from(new Set(keyByUrl.values()))

  // Count existing entries to compute the entry number for this new one
  const existingCount = await db.projectLog.count({
    where: { teamId: ctx.teamId, entryType: 'progress' },
  })

  let entry
  try {
    entry = await db.$transaction(async (tx) => {
      const created = await tx.projectLog.create({
        data: {
          teamId: ctx.teamId,
          createdByUserId: ctx.dbUserId,
          entryType: 'progress',
          body: data.body.trim(),
          nextSteps: data.nextSteps.trim(),
          stage: data.stage.trim(),
          attendeeIds,
          attachmentUrls: data.attachmentUrls,
        },
        select: {
          id: true,
          body: true,
          nextSteps: true,
          stage: true,
          attendeeIds: true,
          attachmentUrls: true,
          createdAt: true,
          lastEditedAt: true,
          createdBy: { select: { id: true, name: true } },
          lastEditedBy: { select: { id: true, name: true } },
        },
      })
      // Bind the uploads to this log. Every referenced key is freshly uploaded, so
      // all must flip temporary -> attached; if one doesn't, it was already swept
      // (form left open past the TTL) and the log would persist a broken photo —
      // roll the whole save back rather than store a dangling reference.
      const attached = await attachAssetsByKey(tx, {
        teamId: ctx.teamId,
        objectKeys: keys,
        attachedToType: 'project_log',
        attachedToId: created.id,
      })
      if (attached !== keys.length) throw new AttachmentError()
      return created
    })
  } catch (e) {
    if (e instanceof AttachmentError) {
      return NextResponse.json(
        { error: 'One or more photos are no longer available. Please re-upload and try again.' },
        { status: 409 },
      )
    }
    throw e
  }

  logActivity(ctx.teamId, ctx.dbUserId, 'log_created', { kind: 'progress' }).catch(console.error)

  // +1 LC the first time this member files a log today (real calendar day, team pool).
  try {
    const today = new Date()
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    await db.$transaction(async (tx) => {
      await tx.labCreditClaim.create({ data: { userId: ctx.dbUserId, teamId: ctx.teamId, day } })
      await tx.teamCurrency.update({ where: { teamId: ctx.teamId }, data: { lc: { increment: 1 } } })
    })
  } catch {
    // P2002 (claim already exists today) = already credited; ignore. Never block the log.
  }

  return NextResponse.json({ entry: { ...entry, entryNumber: existingCount + 1 } }, { status: 201 })
}
