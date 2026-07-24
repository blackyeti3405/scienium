/**
 * PvP API — GET returns PvP dashboard state (trophies, quota, spell power,
 * random opponent). POST handles two actions: 'refind' (reroll opponent) and
 * 'start_raid' (create a new raid row + snapshot the defender base).
 *
 * Depends on: requireTeamContext (auth + phase gate), combat-engine helpers
 * (getRaidQuota, consumeRaid, consumeRefind, buildSpell, buildBuildingTarget),
 * spell-power.ts (getSpellPower), and Prisma db for opponent/building lookups.
 *
 * Known shortcuts: spell/building display names are derived from buildingKey
 * via formatBuildingName() instead of fetching a catalog. MAX_RAIDS_PER_DAY
 * and MAX_REFINDS_PER_DAY are hardcoded at 3 (spec says tunable in v1).
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

// ─── Tunable balancing values (spec §4, §7) ──────────────────────────────

const MAX_RAIDS_PER_DAY = 3
const MAX_REFINDS_PER_DAY = 3

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Derive a human-readable name from a shop building key (e.g. "power_plant" → "Power Plant"). */
function formatBuildingName(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

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
        formatBuildingName(b.buildingKey),
        b.id,
        b.level,
        labType,
        spell.type,
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
      return buildBuildingTarget(
        b.id,
        formatBuildingName(b.buildingKey),
        b.level,
        b.posX!,
        b.posY!,
        spell.type,
      )
    })
    .filter((b): b is BuildingTarget => b !== null)
}

/** Pick a random team from the same class that isn't the current team. */
async function findRandomOpponent(
  ownTeamId: string,
  classId: string,
): Promise<{ id: string; name: string; labType: LabType | null } | null> {
  const eligible = await db.team.findMany({
    where: { classId, id: { not: ownTeamId } },
    select: { id: true, name: true, labType: true },
  })
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}

// ─── GET /api/pvp ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, {
    tier: 'read',
    feature: 'pvp',
  })
  if (error) return error

  const { teamId } = ctx

  // Current team metadata — classId needed for matchmaking
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { classId: true },
  })

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

  if (team?.classId) {
    const match = await findRandomOpponent(teamId, team.classId)
    if (match) {
      const [buildings, oppTrophiesRow] = await Promise.all([
        getTeamBuildings(match.id),
        db.pvpTrophies.findUnique({
          where: { teamId: match.id },
          select: { currentTrophies: true },
        }),
      ])
      opponent = {
        ...match,
        buildings,
        trophies: oppTrophiesRow?.currentTrophies ?? 0,
      }
    }
  }

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

  let body: { action?: string; opponentTeamId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { action, opponentTeamId } = body

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
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { classId: true },
    })
    let opponent: {
      id: string
      name: string
      labType: LabType | null
      trophies: number
      buildings: BuildingTarget[]
    } | null = null

    if (team?.classId) {
      const match = await findRandomOpponent(teamId, team.classId)
      if (match) {
        const [buildings, oppTrophiesRow] = await Promise.all([
          getTeamBuildings(match.id),
          db.pvpTrophies.findUnique({
            where: { teamId: match.id },
            select: { currentTrophies: true },
          }),
        ])
        opponent = {
          ...match,
          buildings,
          trophies: oppTrophiesRow?.currentTrophies ?? 0,
        }
      }
    }

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

    const quota = await getRaidQuota(teamId)
    const raidsRemaining = Math.max(0, MAX_RAIDS_PER_DAY - quota.raidsUsed)
    if (raidsRemaining <= 0) {
      return NextResponse.json(
        { error: 'No raids remaining today' },
        { status: 400 },
      )
    }

    // Snapshot defender base at raid start
    const defenderBuildings = await getTeamBuildings(opponentTeamId)
    const attackerSpells = await getTeamSpells(teamId, labType ?? 'biocore')

    const session: RaidSession = {
      id: crypto.randomUUID(),
      attackerTeamId: teamId,
      defenderTeamId: opponentTeamId,
      timeLimit: 15_000,
      spellsAvailable: attackerSpells,
      defenderBase: defenderBuildings,
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
