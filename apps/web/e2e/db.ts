import { PrismaClient } from '@prisma/client'

export const e2eDb = new PrismaClient()

let teamIdPromise: Promise<string> | null = null

export function e2eTeamId(): Promise<string> {
  teamIdPromise ??= e2eDb.team
    .findFirst({ where: { name: 'E2E Test Lab' }, select: { id: true } })
    .then((team) => {
      if (!team) throw new Error('E2E Test Lab is missing. Run pnpm --filter web seed:e2e.')
      return team.id
    })
  return teamIdPromise
}

export async function deleteE2eBuilding(buildingKey: string): Promise<void> {
  await e2eDb.teamShopBuilding.deleteMany({
    where: { teamId: await e2eTeamId(), buildingKey },
  })
}

export async function setE2eBuildingLevel(buildingKey: string, level: number): Promise<void> {
  await e2eDb.teamShopBuilding.update({
    where: {
      teamId_buildingKey: {
        teamId: await e2eTeamId(),
        buildingKey,
      },
    },
    data: { level },
  })
}

export async function setE2eLabCredits(lc: number): Promise<void> {
  await e2eDb.teamCurrency.update({
    where: { teamId: await e2eTeamId() },
    data: { lc },
  })
}

export async function setE2eKnowledgePoints(kp: number): Promise<void> {
  await e2eDb.teamCurrency.update({
    where: { teamId: await e2eTeamId() },
    data: { kp },
  })
}

export async function getE2eLabCredits(): Promise<number> {
  const currency = await e2eDb.teamCurrency.findUniqueOrThrow({
    where: { teamId: await e2eTeamId() },
    select: { lc: true },
  })
  return currency.lc
}

export async function deleteE2eLabCreditClaimsToday(): Promise<void> {
  const now = new Date()
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  await e2eDb.labCreditClaim.deleteMany({
    where: { teamId: await e2eTeamId(), day },
  })
}

export async function deleteE2eDiscoveryNodes(nodeIds: string[]): Promise<void> {
  if (nodeIds.length === 0) return

  const teamId = await e2eTeamId()
  const nodes = await e2eDb.discoveryNode.findMany({
    where: { teamId },
    select: { id: true, parentId: true },
  })
  const toDelete = new Set(nodeIds)

  for (const nodeId of toDelete) {
    for (const node of nodes) {
      if (node.parentId === nodeId) toDelete.add(node.id)
    }
  }

  await e2eDb.discoveryNode.deleteMany({
    where: { teamId, id: { in: [...toDelete] } },
  })
}

export async function deleteE2eDiscoveryNodesByTitle(
  titlePrefix: string,
  exactWikipediaTitles: string[] = [],
): Promise<void> {
  const nodes = await e2eDb.discoveryNode.findMany({
    where: {
      teamId: await e2eTeamId(),
      OR: [
        { wikipediaTitle: { startsWith: titlePrefix } },
        { wikipediaTitle: { in: exactWikipediaTitles } },
      ],
    },
    select: { id: true },
  })
  await deleteE2eDiscoveryNodes(nodes.map((node) => node.id))
}

// ─── PvP Helpers ───────────────────────────────────────────────────────────────

export async function getE2eTeamPhase(): Promise<string> {
  const team = await e2eDb.team.findUnique({
    where: { id: await e2eTeamId() },
    select: { phase: true },
  })
  return team?.phase ?? 'unknown'
}

export async function getE2eTeamClassId(): Promise<string | null> {
  const team = await e2eDb.team.findUnique({
    where: { id: await e2eTeamId() },
    select: { classId: true },
  })
  return team?.classId ?? null
}

export async function getTeamTrophies(teamId: string): Promise<number> {
  const row = await e2eDb.pvpTrophies.findUnique({
    where: { teamId },
    select: { currentTrophies: true },
  })
  return row?.currentTrophies ?? 0
}

export async function upsertTeamTrophies(teamId: string, currentTrophies: number): Promise<void> {
  await e2eDb.pvpTrophies.upsert({
    where: { teamId },
    create: { teamId, currentTrophies },
    update: { currentTrophies },
  })
}

export async function clearE2ePvpData(): Promise<void> {
  const teamId = await e2eTeamId()
  await e2eDb.pvpRaid.deleteMany({
    where: { OR: [{ attackerTeamId: teamId }, { defenderTeamId: teamId }] },
  })
  await e2eDb.pvpRaidQuota.deleteMany({ where: { teamId } })
}

export async function clearPvpData(teamId: string): Promise<void> {
  await e2eDb.pvpRaid.deleteMany({
    where: { OR: [{ attackerTeamId: teamId }, { defenderTeamId: teamId }] },
  })
  await e2eDb.pvpRaidQuota.deleteMany({ where: { teamId } })
}

export async function ensureSpellRecord(
  buildingKey: string,
  type: string,
): Promise<string> {
  const existing = await e2eDb.spell.findUnique({ where: { buildingKey } })
  if (existing) return existing.id
  const spell = await e2eDb.spell.create({
    data: {
      buildingKey,
      type: type as any,
      baseDamage: 25,
      radius: 80,
      cooldownMs: 1500,
    },
  })
  return spell.id
}

/**
 * Create or retrieve the second E2E team in the same class for matchmaking.
 * Returns the second team's id.
 */
export async function ensureSecondTeam(): Promise<string> {
  const SECOND_TEAM_NAME = 'E2E PvP Target'
  let team = await e2eDb.team.findFirst({ where: { name: SECOND_TEAM_NAME } })
  if (team) return team.id

  const classId = await getE2eTeamClassId()
  if (!classId) throw new Error('E2E Test Lab has no classId — run seed:e2e first.')

  // Get the leader user for teamLeadId and building owner
  const leaderUser = await e2eDb.user.findFirstOrThrow({ where: { name: 'E2E Leader' } })

  team = await e2eDb.team.create({
    data: {
      name: SECOND_TEAM_NAME,
      classId,
      teamLeadId: leaderUser.id,
      phase: 'working',
      labType: 'volt_lab',
    },
  })

  // Seed a placed building so the second team is matchable
  await e2eDb.teamShopBuilding.create({
    data: {
      teamId: team.id,
      buildingKey: 'workshop',
      purchasedByUserId: leaderUser.id,
      posX: 0,
      posY: 0,
      level: 1,
      costPaid: 500,
    },
  })

  // Ensure spell record for workshop
  await ensureSpellRecord('workshop', 'applied')

  // Seed base trophies
  await upsertTeamTrophies(team.id, 500)

  console.log(`[e2eDb] Created second team "${SECOND_TEAM_NAME}" (${team.id})`)
  return team.id
}

/**
 * Remove the second E2E team and all its data.
 */
export async function removeSecondTeam(): Promise<void> {
  const team = await e2eDb.team.findFirst({ where: { name: 'E2E PvP Target' } })
  if (!team) return

  await clearPvpData(team.id)
  await e2eDb.teamShopBuilding.deleteMany({ where: { teamId: team.id } })
  await e2eDb.pvpTrophies.deleteMany({ where: { teamId: team.id } })
  await e2eDb.team.delete({ where: { id: team.id } })
  console.log('[e2eDb] Removed second team')
}
