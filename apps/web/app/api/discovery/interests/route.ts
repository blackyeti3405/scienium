import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

// ── Team interest seeds (#2 Activate TopicInterest) ───────────────────────────
// Each teammate seeds 1–3 short interest phrases that render as one-tap START
// CHIPS on the Discovery home screen. Team-scoped (IDOR-safe); pure local, no LLM.

/** Per-user cap on interests (enforced on POST). */
const MAX_INTERESTS_PER_USER = 3

// GET: the whole team's interests, oldest first, plus the caller's user id.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const rows = await db.topicInterest.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, text: true, createdByUserId: true, createdAt: true },
  })

  return NextResponse.json({
    interests: rows.map((r) => ({
      id: r.id,
      text: r.text,
      createdByUserId: r.createdByUserId,
      isMine: r.createdByUserId === ctx.dbUserId,
      createdAt: r.createdAt.toISOString(),
    })),
    currentUserId: ctx.dbUserId,
  })
}

const AddBody = z.object({ text: z.string().trim().min(2).max(40) }).strict()

// POST: add one interest for the caller. Caps at 3/user; case-insensitive de-dupe
// against the caller's own rows returns the existing row (idempotent, 200).
export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, AddBody)
  if (error) return error
  const text = data.text.trim()

  // Read, de-dupe, cap and create under one advisory lock (REFACTOR2 P2-S1).
  // Both invariants this route advertises — "at most 3" and "one row per
  // phrase" — were read-then-write races: two concurrent adds each saw 2 rows
  // and stored a 4th, and two concurrent adds of the SAME phrase each missed
  // the other and stored it twice.
  const outcome = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `topic-interests:${ctx.teamId}:${ctx.dbUserId}`)
    const mine = await tx.topicInterest.findMany({
      where: { teamId: ctx.teamId, createdByUserId: ctx.dbUserId },
      select: { id: true, text: true, createdByUserId: true, createdAt: true },
    })

    // De-dupe case-insensitively against the caller's own interests.
    const dupe = mine.find((m) => m.text.toLowerCase() === text.toLowerCase())
    if (dupe) return { kind: 'existing' as const, row: dupe }
    if (mine.length >= MAX_INTERESTS_PER_USER) return { kind: 'cap' as const, row: null }

    return {
      kind: 'created' as const,
      row: await tx.topicInterest.create({
        data: { teamId: ctx.teamId, createdByUserId: ctx.dbUserId, text },
        select: { id: true, text: true, createdByUserId: true, createdAt: true },
      }),
    }
  })

  if (outcome.kind === 'cap') {
    return NextResponse.json(
      { error: `You can add at most ${MAX_INTERESTS_PER_USER} interests.` },
      { status: 409 },
    )
  }

  const row = outcome.row
  return NextResponse.json(
    {
      interest: {
        id: row.id,
        text: row.text,
        createdByUserId: row.createdByUserId,
        isMine: true,
        createdAt: row.createdAt.toISOString(),
      },
    },
    { status: outcome.kind === 'created' ? 201 : 200 },
  )
}

const DeleteBody = z.object({ id: z.string().min(1).max(64) }).strict()

// DELETE: remove one of the CALLER'S OWN interests (IDOR guard: teamId +
// createdByUserId scope means a member can't delete a teammate's or another
// team's row). Returns { deleted: <count> } — 0 when not owned.
export async function DELETE(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, DeleteBody)
  if (error) return error

  const result = await db.topicInterest.deleteMany({
    where: { id: data.id, teamId: ctx.teamId, createdByUserId: ctx.dbUserId },
  })

  return NextResponse.json({ deleted: result.count })
}
