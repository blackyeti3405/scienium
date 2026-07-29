import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logActivityBestEffort } from '@/lib/activity/log'
import { attachAssetsByKey, resolveAttachmentKeys } from '@/lib/uploads/assets'
import { awardDailyLabCredit, type LabCreditAwardOutcome } from '@/lib/economy/lab-credit'

/**
 * Project-log application service (Track B P1-2, §3.2 E).
 *
 * The read (cursor pagination + windowed entry numbering) and write (roster-
 * checked attendance, team-scoped attachment binding, daily LC award)
 * workflows behind `/api/project-log`, extracted from the route following the
 * `lib/papers/service.ts` seam: the route parses/guards, calls ONE operation,
 * and maps the typed result to HTTP.
 */

export interface LogPrincipal {
  teamId: string
  dbUserId: string
  labType: string | null
}

/** Entries per page — newest N first, older pages via `?cursor=<last id>` (PERF-4). */
const PAGE_SIZE = 30

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

export async function listProjectLog(principal: LogPrincipal, cursor: string | null) {
  // Cursor pagination instead of the old "full team history in one response":
  // newest PAGE_SIZE entries, then older pages on demand. `cursor` is the id of
  // the oldest entry the client already has.
  const rows = await db.projectLog.findMany({
    where: { teamId: principal.teamId, entryType: 'progress' },
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
        WHERE team_id = ${principal.teamId} AND entry_type = 'progress'
      ) numbered
      WHERE id IN (${Prisma.join(neededIds)})
    `)
    for (const r of ranked) numberById.set(r.id, r.entry_number)
    total = ranked[0]?.total ?? 0
  } else {
    total = await db.projectLog.count({
      where: { teamId: principal.teamId, entryType: 'progress' },
    })
  }

  // Members only ride on the first page — the client keeps them across pages.
  const members = cursor
    ? null
    : await db.teamMember.findMany({
        where: { teamId: principal.teamId },
        orderBy: { joinedAt: 'asc' },
        select: { userId: true, user: { select: { name: true } } },
      })

  function toChip(log: {
    id: string
    stage: string | null
    createdAt: Date
    createdBy: { name: string }
  }) {
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
    backlinks: referencedBy
      .map((r) => toChip(r.from))
      .filter((c): c is NonNullable<typeof c> => c !== null),
  }))

  const memberList = members?.map((m) => ({ userId: m.userId, name: m.user.name }))

  return {
    entries,
    total,
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    ...(memberList ? { members: memberList } : {}),
    labType: principal.labType,
    currentUserId: principal.dbUserId,
  }
}

export interface CreateLogInput {
  body: string
  nextSteps: string
  stage: string
  attendeeIds: string[]
  attachmentUrls: string[]
}

export type CreateLogResult =
  | { ok: true; entry: Record<string, unknown>; lcAward: LabCreditAwardOutcome }
  | { ok: false; error: string; status: number }

// Thrown inside the save transaction when a referenced upload can't be attached
// (already swept, or not this team's) so the whole log write rolls back.
class AttachmentError extends Error {}

export async function createProjectLogEntry(
  principal: LogPrincipal,
  input: CreateLogInput,
): Promise<CreateLogResult> {
  // Keep only attendee ids that are genuinely on this team, and require
  // attendance for multi-member teams (solo labs have an implicit attendee).
  const roster = await db.teamMember.findMany({
    where: { teamId: principal.teamId },
    select: { userId: true },
  })
  const rosterIds = new Set(roster.map((m) => m.userId))
  const attendeeIds = input.attendeeIds.filter((id) => rosterIds.has(id))
  if (roster.length > 1 && attendeeIds.length === 0) {
    return { ok: false, error: 'Select who was present', status: 400 }
  }

  // Resolve + team-scope the referenced uploads before we write anything —
  // id-URLs authorize through the team-scoped ledger row (SEC-6).
  const keyByUrl = await resolveAttachmentKeys(principal.teamId, input.attachmentUrls)
  if (keyByUrl === null) {
    return { ok: false, error: 'Invalid attachment reference', status: 400 }
  }
  const keys = Array.from(new Set(keyByUrl.values()))

  // Count existing entries to compute the entry number for this new one
  const existingCount = await db.projectLog.count({
    where: { teamId: principal.teamId, entryType: 'progress' },
  })

  let entry
  try {
    entry = await db.$transaction(async (tx) => {
      const created = await tx.projectLog.create({
        data: {
          teamId: principal.teamId,
          createdByUserId: principal.dbUserId,
          entryType: 'progress',
          body: input.body.trim(),
          nextSteps: input.nextSteps.trim(),
          stage: input.stage.trim(),
          attendeeIds,
          attachmentUrls: input.attachmentUrls,
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
        teamId: principal.teamId,
        objectKeys: keys,
        attachedToType: 'project_log',
        attachedToId: created.id,
      })
      if (attached !== keys.length) throw new AttachmentError()
      return created
    })
  } catch (e) {
    if (e instanceof AttachmentError) {
      return {
        ok: false,
        error: 'One or more photos are no longer available. Please re-upload and try again.',
        status: 409,
      }
    }
    throw e
  }

  logActivityBestEffort(principal.teamId, principal.dbUserId, 'log_created', { kind: 'progress' }).catch(
    console.error,
  )

  // +1 LC the first time this member files a log today (real calendar day, team
  // pool). Never blocks the saved log; only a duplicate-claim P2002 counts as
  // "already credited" — anything else is reported as recoverable (A6).
  const lcAward = await awardDailyLabCredit({
    teamId: principal.teamId,
    dbUserId: principal.dbUserId,
  })

  return { ok: true, entry: { ...entry, entryNumber: existingCount + 1 }, lcAward }
}
