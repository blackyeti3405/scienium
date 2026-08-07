/**
 * PvP API — GET returns PvP dashboard state (trophies, quota, spell power,
 * random opponent). POST handles two actions: 'refind' (reroll opponent) and
 * 'start_raid' (create a new raid row + snapshot the defender base).
 *
 * Depends on: requireTeamContext (auth + phase gate), combat-engine helpers
 * (getRaidQuota, consumeRaid, consumeRefind, buildSpell, buildBuildingTarget),
 * spell-power.ts (getSpellPower), and Prisma db for opponent/building lookups.
 *
 * Known shortcuts: MAX_RAIDS_PER_DAY and MAX_REFINDS_PER_DAY are hardcoded
 * at 3 (spec says tunable in v1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { getSpellPower } from '@/lib/pvp/spell-power'
import {
  getRaidQuota,
  consumeRaid,
  consumeRefind,
  buildSpell,
  buildBuildingTarget,
} from '@/lib/pvp/combat-engine'
import type { LabType, Spell, BuildingTarget, RaidSession } from '@scienium/shared-types'
import { shopBuilding } from '@/lib/shop'
import { spellForBuilding } from '@/lib/pvp/spell-catalog'
import { teamClassIds, findRandomOpponent, sharesClass } from '@/lib/pvp/matchmaking'

// ─── Tunable balancing values (spec §4, §7) ──────────────────────────────

const MAX_RAIDS_PER_DAY = 3
const MAX_REFINDS_PER_DAY = 3

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Build Spell objects for every owned shop building that has a matching Spell row. */
async function getTeamSpells(
  teamId: string,
  labType: LabType,
): Promise<Spell[]> {
  const buildings = await db.teamShopBuilding.findMany({ where: { teamId } })
  if (buildings.length === 0) return []

  const spellRecords = await db.spell.findMany({
    where: { buildingKey: { in: buildings.map((b) => b.buildingKey) } },
  })
  const spellMap = new Map(spellRecords.map((s) => [s.buildingKey, s]))

  return buildings
    .map((b) => {
      const spell = spellMap.get(b.buildingKey)
      if (!spell) return null
      return buildSpell(
        spell.id,
        spell.name,
        b.id,
        b.level,
        labType,
        spell.type,
        {
          ...spell,
          icon: spellForBuilding(b.buildingKey)?.icon,
          lingering: spellForBuilding(b.buildingKey)?.lingering,
        },
      )
    })
    .filter((s): s is Spell => s !== null)
}

/** Build BuildingTarget objects for a team's placed shop buildings. */
async function getTeamBuildings(teamId: string): Promise<BuildingTarget[]> {
  const buildings = await db.teamShopBuilding.findMany({
    where: { teamId, posX: { not: null }, posY: { not: null } },
  })
  if (buildings.length === 0) return []

  const spellRecords = await db.spell.findMany({
    where: { buildingKey: { in: buildings.map((b) => b.buildingKey) } },
  })
  const spellMap = new Map(spellRecords.map((s) => [s.buildingKey, s]))

  return buildings
    .map((b) => {
      const spell = spellMap.get(b.buildingKey)
      if (!spell) return null
      const catalog = shopBuilding(b.buildingKey)
      return buildBuildingTarget(
        b.id,
        catalog?.name ?? b.buildingKey,
        b.level,
        b.posX!,
        b.posY!,
        spell.type,
        catalog?.sprite ?? null,
      )
    })
    .filter((b): b is BuildingTarget => b !== null)
}

/** Load an opponent's public raid card (base layout + trophies). */
async function opponentCard(match: {
  id: string
  name: string
  labType: LabType | null
}) {
  const [buildings, oppTrophiesRow] = await Promise.all([
    getTeamBuildings(match.id),
    db.pvpTrophies.findUnique({
      where: { teamId: match.id },
      select: { currentTrophies: true },
    }),
  ])
  return {
    ...match,
    buildings,
    trophies: oppTrophiesRow?.currentTrophies ?? 0,
  }
}

// ─── GET /api/pvp ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, {
    tier: 'read',
    feature: 'pvp',
  })
  if (error) return error

  const { teamId } = ctx

  // Dashboard data — parallelized independent queries
  const [trophiesRow, quota, { tier, multiplier, tasksCompleted }] = await Promise.all([
    db.pvpTrophies.findUnique({
      where: { teamId },
      select: { currentTrophies: true },
    }),
    getRaidQuota(teamId),
    getSpellPower(teamId),
  ])
  const raidsRemaining = Math.max(0, MAX_RAIDS_PER_DAY - quota.raidsUsed)
  const refindsRemaining = Math.max(0, MAX_REFINDS_PER_DAY - quota.refindsUsed)

  // Random opponent from same class
  let opponent: {
    id: string
    name: string
    labType: LabType | null
    trophies: number
    buildings: BuildingTarget[]
  } | null = null

  const match = await findRandomOpponent(teamId, await teamClassIds(teamId))
  if (match) opponent = await opponentCard(match)

  return NextResponse.json({
    trophies: trophiesRow?.currentTrophies ?? 0,
    spellPower: { tier, multiplier, tasksCompleted },
    quota: {
      raidsUsed: quota.raidsUsed,
      raidsRemaining,
      refindsUsed: quota.refindsUsed,
      refindsRemaining,
    },
    opponent,
  })
}

// ─── POST /api/pvp ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'pvp',
  })
  if (error) return error

  const { teamId, labType } = ctx

  let body: { action?: string; opponentTeamId?: string; shownBaseIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { action, opponentTeamId, shownBaseIds } = body

  // ── refind ──────────────────────────────────────────────────────────

  if (action === 'refind') {
    const quota = await getRaidQuota(teamId)
    const refindsRemaining = Math.max(
      0,
      MAX_REFINDS_PER_DAY - quota.refindsUsed,
    )
    if (refindsRemaining <= 0) {
      return NextResponse.json(
        { error: 'No refinds remaining today' },
        { status: 400 },
      )
    }

    // Find a new opponent in the same class — only consume the refind if successful
    const match = await findRandomOpponent(
      teamId,
      await teamClassIds(teamId),
      shownBaseIds,
    )
    const opponent = match ? await opponentCard(match) : null

    if (!opponent) {
      return NextResponse.json(
        { error: 'No opponent found to refind to' },
        { status: 400 },
      )
    }

    await consumeRefind(teamId)

    return NextResponse.json({ opponent })
  }

  // ── start_raid ──────────────────────────────────────────────────────

  if (action === 'start_raid') {
    if (!opponentTeamId) {
      return NextResponse.json(
        { error: 'opponentTeamId is required for start_raid' },
        { status: 400 },
      )
    }

    // Scope: the opponent must be a different team sharing a class with the
    // attacker — matchmaking only offers those, but this endpoint takes the ID
    // from the request body, so enforce it here too (cross-class raids would
    // leak base layouts and drain trophies of arbitrary teams).
    if (
      opponentTeamId === teamId ||
      !(await sharesClass(teamId, opponentTeamId))
    ) {
      return NextResponse.json({ error: 'Opponent not raidable' }, { status: 403 })
    }

    const quota = await getRaidQuota(teamId)
    const raidsRemaining = Math.max(0, MAX_RAIDS_PER_DAY - quota.raidsUsed)
    if (raidsRemaining <= 0) {
      return NextResponse.json(
        { error: 'No raids remaining today' },
        { status: 400 },
      )
    }

    // Snapshot defender base at raid start
    // TODO(D-04, ENGINE-05): Also read TeamGatewayPlacement rows for the defender
    // and fold them into the snapshot so the raid engine sees the full base layout.
    // Gateways (navigation-only structures) don't have SpellType/level/damage, so
    // the BuildingTarget type needs an `isGateway` flag or a separate array. For now,
    // only TeamShopBuilding positions are included (the core targetable buildings).
    const [defenderBuildings, attackerSpells, defender] = await Promise.all([
      getTeamBuildings(opponentTeamId),
      getTeamSpells(teamId, labType ?? 'biocore'),
      db.team.findUnique({
        where: { id: opponentTeamId },
        select: { labType: true },
      }),
    ])

    const session: RaidSession = {
      id: crypto.randomUUID(),
      attackerTeamId: teamId,
      defenderTeamId: opponentTeamId,
      timeLimit: 15_000,
      spellsAvailable: attackerSpells,
      defenderBase: defenderBuildings,
      defenderLabType: defender?.labType ?? null,
      startedAt: Date.now(),
    }

    // Persist the raid row so timer enforcement uses DB createdAt
    const now = new Date()
    await db.pvpRaid.create({
      data: {
        id: session.id,
        attackerTeamId: session.attackerTeamId,
        defenderTeamId: session.defenderTeamId,
        startedAt: now,
        raidLogJson: {
          spellsAvailable: attackerSpells,
          defenderBase: defenderBuildings,
          castEvents: [],
          lastCastTs: 0,
        } as any,
      },
    })

    // Consume a raid slot
    await consumeRaid(teamId)

    return NextResponse.json({
      raidId: session.id,
      session,
    })
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}` },
    { status: 400 },
  )
}
