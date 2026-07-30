/**
 * PvP Raid Action API — POST /api/pvp/[battleId]/action
 *
 * Handles 'cast_spell' during an active raid. Validates raid ownership,
 * active status (endedAt === null), 15s time limit (enforced server-side via
 * DB createdAt — never client timestamps), and 1.5s cast delay (via
 * raidLogJson.lastCastTs). Applies AOE damage via combat-engine.resolveCast(),
 * persists updated building health to raidLogJson after every cast. When the
 * timer expires, calls combat-engine.completeRaid() to finalize the row and
 * update both teams' trophy counts.
 *
 * Depends on: requireTeamContext, combat-engine (resolveCast, completeRaid),
 * spell-power (getSpellPower for the daily multiplier), Prisma db.
 *
 * Known shortcuts: none. Trophy math and row finalization are handled by
 * completeRaid() — the single source of truth for raid completion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { getSpellPower } from '@/lib/pvp/spell-power'
import {
  resolveCast,
  completeRaid,
  RAID_TIME_LIMIT_MS,
} from '@/lib/pvp/combat-engine'
import type {
  Spell,
  BuildingTarget,
  RaidCastEvent,
  RaidSession,
} from '@scienium/shared-types'

// ─── raidLogJson shape stored on PvpRaid rows ─────────────────────────────

interface RaidLog {
  spellsAvailable: Spell[]
  defenderBase: BuildingTarget[]
  castEvents: RaidCastEvent[]
  lastCastTs: number
}

// ─── POST /api/pvp/[battleId]/action ──────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { battleId: string } },
) {
  const { ctx, error } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'pvp',
  })
  if (error) return error

  const { teamId } = ctx
  const { battleId } = params

  // Parse body
  let body: {
    action?: string
    spellId?: string
    x?: number
    y?: number
    clientTs?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, spellId, x, y, clientTs } = body

  if (action !== 'cast_spell' && action !== 'complete') {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    )
  }

  // ── Load and validate raid ───────────────────────────────────────────

  const raid = await db.pvpRaid.findUnique({ where: { id: battleId } })
  if (!raid) {
    return NextResponse.json({ error: 'Raid not found' }, { status: 404 })
  }
  if (raid.attackerTeamId !== teamId) {
    return NextResponse.json({ error: 'Not your raid' }, { status: 403 })
  }

  // Active = endedAt is null. Completed raids have endedAt set.
  if (raid.endedAt !== null) {
    // Already finalized — return the stored result
    return NextResponse.json(
      {
        error: 'Raid already ended',
        percentDestroyed: raid.percentDestroyed ?? 0,
        trophiesDelta: raid.trophiesDelta ?? 0,
      },
      { status: 400 },
    )
  }

  // ── complete: finalize the raid from stored state ──────────────────────
  // No spell cast required — used when the client detects timer expiry or
  // all buildings destroyed and needs the server to finalize + return results.

  if (action === 'complete') {
    return await finalizeFromStoredLog(battleId, raid)
  }

  // Validate cast_spell required fields
  if (
    !spellId ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof clientTs !== 'number'
  ) {
    return NextResponse.json(
      { error: 'spellId, x, y, and clientTs are required' },
      { status: 400 },
    )
  }

  // ── Enforce 15-second time limit (DB createdAt is authoritative) ─────

  // Server-authoritative 15s window: Date.now() - raid.startedAt.getTime()
  // must be <= 15000ms. Client timestamps are advisory only.
  const elapsed = Date.now() - raid.startedAt.getTime()
  if (elapsed >= RAID_TIME_LIMIT_MS) {
    // Timer expired before this cast — finalize from stored log
    return await finalizeFromStoredLog(battleId, raid)
  }

  // ── Parse raid log and enforce cast delay ────────────────────────────

  const raidLog: RaidLog = (raid.raidLogJson as unknown as RaidLog) ?? {
    spellsAvailable: [],
    defenderBase: [],
    castEvents: [],
    lastCastTs: 0,
  }

  // Server-authoritative cooldown: lastCastTs must be >= 1500ms ago.
  // Client cooldown UX is presentation only.
  if (raidLog.lastCastTs > 0 && Date.now() - raidLog.lastCastTs < 1500) {
    return NextResponse.json(
      { error: 'Cast delay not met — 1.5s required between casts' },
      { status: 429 },
    )
  }

  // ── Resolve spell power multiplier (current day's tier) ──────────────

  const { multiplier } = await getSpellPower(teamId)

  // ── Reconstruct RaidSession and apply damage ─────────────────────────

  // Non-destructive raid invariant: defender buildings are reconstructed from
  // raidLogJson snapshot only. team_shop_buildings rows are NEVER read or
  // mutated on the cast path. All damage exists only inside the raid instance.

  const session: RaidSession = {
    id: raid.id,
    attackerTeamId: raid.attackerTeamId,
    defenderTeamId: raid.defenderTeamId,
    timeLimit: RAID_TIME_LIMIT_MS,
    spellsAvailable: raidLog.spellsAvailable,
    defenderBase: raidLog.defenderBase,
    startedAt: raid.startedAt.getTime(),
  }

  // Validate spell is available in this raid session
  if (!session.spellsAvailable.find((s) => s.id === spellId)) {
    return NextResponse.json(
      { error: 'Spell not available in this raid' },
      { status: 400 },
    )
  }

  const castEvent: RaidCastEvent = { spellId, x, y, clientTs }
  resolveCast(session, castEvent, multiplier)

  // ── Persist updated raid log ─────────────────────────────────────────

  // Raid log stores {spellId, x, y, clientTs} per cast. Client damage is
  // never stored. Log enables replay/dispute verification.
  const updatedLog: RaidLog = {
    spellsAvailable: raidLog.spellsAvailable,
    defenderBase: session.defenderBase,
    castEvents: [...raidLog.castEvents, castEvent],
    lastCastTs: Date.now(),
  }

  await db.pvpRaid.update({
    where: { id: battleId },
    data: { raidLogJson: updatedLog as any },
  })

  // ── Compute percent destroyed ────────────────────────────────────────

  const totalMaxHealth = session.defenderBase.reduce(
    (sum, b) => sum + b.maxHealth,
    0,
  )
  const totalDamageDealt = session.defenderBase.reduce(
    (sum, b) => sum + (b.maxHealth - b.currentHealth),
    0,
  )
  const percentDestroyed =
    totalMaxHealth > 0 ? (totalDamageDealt / totalMaxHealth) * 100 : 0

  // ── Check if timer expired after this cast ───────────────────────────

  const elapsedAfterCast = Date.now() - raid.startedAt.getTime()
  if (elapsedAfterCast >= RAID_TIME_LIMIT_MS) {
    // completeRaid reads trophies and persists the result from the snapshot only.
    // Defender team_shop_buildings rows are NEVER mutated here — invariant upheld.
    const result = await completeRaid(session, battleId)
    return NextResponse.json({
      defenderBase: session.defenderBase,
      percentDestroyed: Math.round(percentDestroyed * 100) / 100,
      ended: true,
      result,
    })
  }

  return NextResponse.json({
    defenderBase: session.defenderBase,
    percentDestroyed: Math.round(percentDestroyed * 100) / 100,
    ended: false,
  })
}

// ─── Completion helpers ───────────────────────────────────────────────────

/**
 * Handle the edge case where the client sends a cast but the server-side
 * timer already expired. Finalize from the stored raidLogJson state
 * without applying the late cast. Delegates to completeRaid() which
 * handles all trophy math and row finalization.
 */
async function finalizeFromStoredLog(
  raidId: string,
  raid: {
    attackerTeamId: string
    defenderTeamId: string
    raidLogJson: any
  },
): Promise<NextResponse> {
  const raidLog: RaidLog = (raid.raidLogJson as unknown as RaidLog) ?? {
    spellsAvailable: [],
    defenderBase: [],
    castEvents: [],
    lastCastTs: 0,
  }

  const session: RaidSession = {
    id: raidId,
    attackerTeamId: raid.attackerTeamId,
    defenderTeamId: raid.defenderTeamId,
    timeLimit: RAID_TIME_LIMIT_MS,
    spellsAvailable: raidLog.spellsAvailable,
    defenderBase: raidLog.defenderBase,
    startedAt: 0, // not meaningful — timer already expired
  }

  const result = await completeRaid(session, raidId)

  return NextResponse.json({
    defenderBase: session.defenderBase,
    percentDestroyed: result.percentDestroyed,
    ended: true,
    result,
  })
}