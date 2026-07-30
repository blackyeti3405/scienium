import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { awardDiscoveryVisit } from '@/lib/discovery/awardVisit'
import { recordActivity } from '@/lib/activity/log'

// ── PATCH /api/discovery/sources/[id]/reflection ──────────────────────────────
// Persists the ONE-line reflection ("In one sentence, what did they find?") onto
// the source node's ExternalSource. Team-scoped (IDOR-safe), mutate-tier.
//
// CROSS-FEATURE HOOK (#1 Discovery→economy): #1's KP award for source nodes fires
// on the null→set transition of `reflection` (first completion, by any member).
// #1 will attach that award INSIDE this same PATCH's write path. Feature A only
// ships the field + route + box — it does NOT award KP.
const ReflectionBody = z
  .object({ reflection: z.string().trim().max(500) })
  .strict()

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  // IDOR guard: the node (and its side-row) must belong to the caller's team.
  // `credibilityTier` is read server-side (never trusted from the client) so #1's
  // KP award scales peer-reviewed > preprint > open-access (epic §"anti-forgery").
  const node = await db.discoveryNode.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    include: { externalSource: { select: { id: true, reflection: true, credibilityTier: true } } },
  })
  if (!node || node.sourceType !== 'source' || !node.externalSource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error: bodyError } = await parseJson(req, ReflectionBody)
  if (bodyError) return bodyError
  const reflection = data.reflection.trim()

  // #1 (Discovery→economy): KP is awarded only for a SUBSTANTIVE reflection — a
  // real sentence (>=15 chars AND >=3 words), not a single keystroke — so it can't
  // be farmed by typing one character. The visit ledger's @@unique still makes the
  // award idempotent per node, so upgrading a throwaway note into a real sentence
  // later earns it exactly once (and re-editing a real one never re-awards).
  const words = reflection.split(/\s+/).filter(Boolean)
  const isSubstantive = reflection.length >= 15 && words.length >= 3
  let kpAwarded = 0

  await db.$transaction(async (tx) => {
    await tx.externalSource.update({
      where: { id: node.externalSource!.id },
      data: {
        reflection: reflection || null,
        reflectionByUserId: reflection ? ctx.dbUserId : null,
        reflectionAt: reflection ? new Date() : null,
      },
    })
    if (isSubstantive) {
      const res = await awardDiscoveryVisit(tx, {
        teamId: ctx.teamId,
        userId: ctx.dbUserId,
        nodeId: node.id,
        tier: node.externalSource!.credibilityTier,
      })
      kpAwarded = res.kpAwarded
      // Durable (REFACTOR2 P1-R5): the KP mint and its teacher-visible record
      // commit together — a crash between them can't leave KP awarded with no
      // evidence it happened.
      if (kpAwarded > 0) {
        await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'discovery_kp_awarded', {
          kp: kpAwarded,
          nodeCount: 1,
        })
      }
    }
  })

  return NextResponse.json({ ok: true, reflection: reflection || null, kpAwarded })
}
