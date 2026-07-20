import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { MAX_SUPPLEMENTS } from '@/lib/showcase'
import type { Prisma } from '@prisma/client'

/** Thrown inside the slot transaction when the supplement cap is full → 409. */
class SupplementCapError extends Error {}

// ── POST /api/citations/export (#13) ──────────────────────────────────────────
// Build a "Works Cited" bibliography (chosen style) from the team's citations and
// persist it as a Showcase `supplement` asset. Local/deterministic — no LLM. Gated
// on the `showcase` feature (the phase where the Showcase exists). Re-export
// replaces the prior works-cited supplement instead of piling up.

const Body = z.object({ style: z.enum(['apa', 'mla', 'ieee']) }).strict()

const STYLE_LABEL: Record<'apa' | 'mla' | 'ieee', string> = {
  apa: 'APA',
  mla: 'MLA',
  ieee: 'IEEE',
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'showcase' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, Body)
  if (bodyError) return bodyError
  const style = data.style

  const showcase = await db.showcase.findUnique({
    where: { teamId: ctx.teamId },
    select: { id: true },
  })
  if (!showcase) {
    return NextResponse.json({ error: 'Save your showcase details first.' }, { status: 409 })
  }

  const citations = await db.citation.findMany({
    where: { teamId: ctx.teamId },
    select: { apa: true, mla: true, ieee: true },
  })
  if (citations.length === 0) {
    return NextResponse.json(
      { error: 'No citations yet — promote or upload sources first.' },
      { status: 409 },
    )
  }

  // Sort alphabetically by the chosen style's string (a real bibliography order).
  const lines = citations
    .map((c) => c[style])
    .filter((s) => s && s.trim().length > 0)
    .sort((a, b) => a.localeCompare(b))
  const text = `Works Cited (${STYLE_LABEL[style]})\n\n${lines.join('\n')}`

  const metadata = {
    kind: 'works_cited',
    style,
    label: 'Works Cited',
    generatedAt: new Date().toISOString(),
    text,
  }

  // Replace any prior works-cited supplement so re-export overwrites (JSON filters
  // are awkward in Prisma → fetch the team's supplements, filter in JS by kind,
  // delete by id set, then create the fresh one). The whole replace + cap check
  // runs atomically under the supplement slot lock (A12) so a concurrent link
  // submission can't slip past the cap or duplicate the works-cited entry.
  let asset: { id: string; assetType: string; metadataJson: unknown }
  try {
    asset = await db.$transaction(async (tx) => {
      await lockAggregate(tx, `showcase-slot:${showcase.id}:supplement`)
      const existing = await tx.showcaseAsset.findMany({
        where: { showcaseId: showcase.id, assetType: 'supplement' },
        select: { id: true, metadataJson: true },
      })
      const priorWorksCited = existing.filter(
        (a) =>
          a.metadataJson &&
          typeof a.metadataJson === 'object' &&
          !Array.isArray(a.metadataJson) &&
          (a.metadataJson as Record<string, unknown>).kind === 'works_cited',
      )
      if (priorWorksCited.length > 0) {
        await tx.showcaseAsset.deleteMany({
          where: { id: { in: priorWorksCited.map((a) => a.id) } },
        })
      }
      if (existing.length - priorWorksCited.length >= MAX_SUPPLEMENTS) {
        throw new SupplementCapError()
      }
      return tx.showcaseAsset.create({
        data: {
          showcaseId: showcase.id,
          assetType: 'supplement',
          metadataJson: metadata as Prisma.InputJsonValue,
        },
        select: { id: true, assetType: true, metadataJson: true },
      })
    })
  } catch (err) {
    if (err instanceof SupplementCapError) {
      return NextResponse.json(
        { error: `Up to ${MAX_SUPPLEMENTS} supplement links.` },
        { status: 409 },
      )
    }
    throw err
  }

  return NextResponse.json(
    { asset: { id: asset.id, assetType: asset.assetType, metadata: asset.metadataJson } },
    { status: 201 },
  )
}
