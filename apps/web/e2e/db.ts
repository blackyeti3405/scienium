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

/**
 * Every helper below takes an optional `teamId`.
 *
 * They used to be hardwired to `e2eTeamId()` — the ONE shared fixture — which
 * made them unusable from a spec that owns a disposable lab: the helper would
 * write the shared team's currency while the browser read the disposable one,
 * and the spec would fail on numbers that were never wrong. Defaulting to the
 * shared lab keeps every existing caller unchanged.
 */
export async function deleteE2eBuilding(buildingKey: string, teamId?: string): Promise<void> {
  await e2eDb.teamShopBuilding.deleteMany({
    where: { teamId: teamId ?? (await e2eTeamId()), buildingKey },
  })
}

export async function setE2eBuildingLevel(
  buildingKey: string,
  level: number,
  teamId?: string,
): Promise<void> {
  await e2eDb.teamShopBuilding.update({
    where: {
      teamId_buildingKey: { teamId: teamId ?? (await e2eTeamId()), buildingKey },
    },
    data: { level },
  })
}

export async function setE2eLabCredits(lc: number, teamId?: string): Promise<void> {
  await e2eDb.teamCurrency.update({
    where: { teamId: teamId ?? (await e2eTeamId()) },
    data: { lc },
  })
}

export async function setE2eKnowledgePoints(kp: number, teamId?: string): Promise<void> {
  await e2eDb.teamCurrency.update({
    where: { teamId: teamId ?? (await e2eTeamId()) },
    data: { kp },
  })
}

export async function getE2eLabCredits(teamId?: string): Promise<number> {
  const currency = await e2eDb.teamCurrency.findUniqueOrThrow({
    where: { teamId: teamId ?? (await e2eTeamId()) },
    select: { lc: true },
  })
  return currency.lc
}

export async function deleteE2eLabCreditClaimsToday(teamId?: string): Promise<void> {
  const now = new Date()
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  await e2eDb.labCreditClaim.deleteMany({
    where: { teamId: teamId ?? (await e2eTeamId()), day },
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
  // ADR-004: class membership lives on User.classId, reached through members.
  // `Team.classId` is vestigial and null for anything created post-ADR-004.
  const team = await e2eDb.team.findUnique({
    where: { id: await e2eTeamId() },
    select: { members: { select: { user: { select: { classId: true } } } } },
  })
  return team?.members.map((m) => m.user.classId).find((id) => id !== null) ?? null
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

  const targetUser = await e2eDb.user.upsert({
    where: { id: 'e2e_pvp_target_user' },
    create: {
      id: 'e2e_pvp_target_user',
      clerkUserId: 'e2e_pvp_target_clerk',
      name: 'E2E PvP Target Lead',
      email: 'e2e-pvp-target@example.test',
      role: 'student',
      classId,
    },
    update: { classId },
  })

  team = await e2eDb.team.create({
    data: {
      name: SECOND_TEAM_NAME,
      teamLeadId: leaderUser.id,
      phase: 'working',
      labType: 'volt_lab',
      // No `classId` on purpose — matchmaking derives class from members, so
      // this fixture proves the ADR-004 path rather than the vestigial column.
      members: { create: { userId: targetUser.id, role: 'lead' } },
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
  await e2eDb.teamMember.deleteMany({ where: { teamId: team.id } })
  await e2eDb.team.delete({ where: { id: team.id } })
  await e2eDb.user.deleteMany({ where: { id: 'e2e_pvp_target_user' } })
  console.log('[e2eDb] Removed second team')
}
