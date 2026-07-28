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
