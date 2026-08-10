// Idempotent dev PvP unblocker — `pnpm --filter web seed:dev-pvp`
//
// Why this exists: "reset my raid counts" is almost never what actually blocks a
// raid. `pvp_raid_quota` starts EMPTY (0 raids used), so clearing it is usually a
// no-op. The real gate is in lib/pvp/matchmaking.ts:
//
//   findRandomOpponent() → `if (classIds.length === 0) return null`
//
// A raid needs ALL of:
//   1. attacker's team at phase `literature_review`+  (PHASE_UNLOCKS: pvp unlocks there)
//   2. the attacker IS IN A CLASS           (User.classId — null ⇒ never any opponent)
//   3. an opponent in the SAME class, at `literature_review`+, with a PLACED building
//      (team_shop_buildings.pos_x NOT NULL)
//
// The dev account had classId = NULL, so no amount of quota resetting could ever
// produce an opponent. This builds the missing graph.
//
// Deliberately kept OUT of the E2E fixture ("E2E School"/"E2E Class"/"E2E Test
// Lab"): dropping the dev lab into E2E Class would make it a candidate opponent
// for the pvp specs and turn a deterministic fixture into a coin flip.
//
// Data-only, never deletes anything but the attacker's own quota rows, safe to
// re-run — a second run reports every node as "found" and writes nothing.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

const ATTACKER_EMAIL = process.argv[2] ?? 'hello@scienium.app'
const SCHOOL_NAME = 'Dev School'
const CLASS_NAME = 'Dev Class'
const RIVAL_TEAM_NAME = 'Dev Rival Lab'
// Never a real Clerk id (those are `user_…`). The rival is a punching bag that
// never signs in; the prefix guarantees a real sign-in can never collide with it
// and fork a duplicate identity — the rule prisma/seed-e2e.mjs sets out.
const RIVAL_CLERK_ID = 'dev_pvp_rival_fixture'
const RIVAL_EMAIL = 'dev-pvp-rival@scienium.invalid'

// Mirrors PHASE_ORDER in @scienium/shared-types and `phasesFrom('literature_review')`
// in lib/pvp/matchmaking.ts. Restated rather than imported because this script is
// plain .mjs run by node against the built Prisma client, with no TS pipeline —
// so if the phase model changes again, this list is what has to change with it.
const PVP_MIN_PHASE = 'literature_review'
const PVP_PHASES = ['literature_review', 'plan_refinement', 'project_development']

const report = []
const note = (state, what) => report.push(`  ${state.padEnd(7)} ${what}`)

async function main() {
  const attacker = await db.user.findFirst({
    where: { email: ATTACKER_EMAIL },
    include: { activeTeam: true },
  })
  if (!attacker) throw new Error(`No user with email ${ATTACKER_EMAIL}`)
  if (!attacker.activeTeam) throw new Error(`${ATTACKER_EMAIL} has no active team`)
  const team = attacker.activeTeam
  note('found', `attacker ${attacker.name} → team "${team.name}" (${team.phase})`)

  // 1. Attacker's team must be at `literature_review`+ for the pvp phase gate.
  //
  // Only ADVANCE, never rewind. The old version wrote a flat `phase = 'working'`
  // from a three-phase model that no longer exists; against the current enum
  // that both fails the constraint AND, if it had succeeded, would have knocked
  // a late-phase dev lab back down to unlock pvp it already had. A dev
  // convenience script must never cost someone their progression state.
  if (PVP_PHASES.includes(team.phase)) {
    note('ok', `team phase ${team.phase} already unlocks pvp`)
  } else {
    await db.team.update({ where: { id: team.id }, data: { phase: PVP_MIN_PHASE } })
    note('set', `team phase ${team.phase} → ${PVP_MIN_PHASE}`)
  }

  // 2. School + class. The teacher is whoever already teaches here; falls back to
  //    the attacker so this works in a DB with no teacher account at all.
  const school = await db.school.upsert({
    where: { name: SCHOOL_NAME },
    update: {},
    create: { name: SCHOOL_NAME },
  })
  const teacher =
    (await db.user.findFirst({ where: { role: 'teacher' } })) ?? attacker

  let klass = await db.class.findFirst({ where: { name: CLASS_NAME } })
  if (!klass) {
    klass = await db.class.create({
      data: { name: CLASS_NAME, schoolId: school.id, teacherId: teacher.id },
    })
    note('created', `class "${CLASS_NAME}" (teacher ${teacher.name})`)
  } else {
    note('found', `class "${CLASS_NAME}"`)
  }

  // 3. THE ACTUAL FIX: put the attacker in that class.
  if (attacker.classId === klass.id) {
    note('ok', 'attacker already in Dev Class')
  } else {
    await db.user.update({
      where: { id: attacker.id },
      data: { classId: klass.id, schoolId: school.id },
    })
    note('set', `attacker classId ${attacker.classId ?? 'NULL'} → Dev Class`)
  }

  // 4. A rival that satisfies every leg of the eligibility query.
  const rivalUser = await db.user.upsert({
    where: { clerkUserId: RIVAL_CLERK_ID },
    update: { classId: klass.id, schoolId: school.id },
    create: {
      clerkUserId: RIVAL_CLERK_ID,
      name: 'Dev Rival',
      email: RIVAL_EMAIL,
      classId: klass.id,
      schoolId: school.id,
    },
  })

  let rivalTeam = await db.team.findFirst({ where: { name: RIVAL_TEAM_NAME } })
  if (!rivalTeam) {
    rivalTeam = await db.team.create({
      data: {
        name: RIVAL_TEAM_NAME,
        teamLeadId: rivalUser.id,
        phase: PVP_MIN_PHASE,
        labType: team.labType ?? 'volt_lab',
        members: { create: { userId: rivalUser.id, role: 'lead' } },
        currency: { create: {} },
      },
    })
    note('created', `rival team "${RIVAL_TEAM_NAME}"`)
  } else {
    await db.team.update({ where: { id: rivalTeam.id }, data: { phase: PVP_MIN_PHASE } })
    note('found', `rival team "${RIVAL_TEAM_NAME}"`)
  }

  // `inClasses` matches on members.some.user.classId, so the rival's membership
  // row is what makes the team visible to matchmaking at all.
  await db.teamMember.upsert({
    where: { userId: rivalUser.id },
    update: { teamId: rivalTeam.id },
    create: { teamId: rivalTeam.id, userId: rivalUser.id, role: 'lead' },
  })

  // 5. A placed base — `shopBuildings: { some: { posX: { not: null } } }`.
  //
  // The FULL catalogue at max tier, not a mirror of the attacker. Mirroring
  // meant a fresh dev lab with two huts produced a two-hut opponent, so the
  // raid screen showed off nothing. A rival is a demo target: it should always
  // be the best-looking base the game can draw. Level 15 is the `_t5` sprite
  // stage (lib/sprites/manifest.ts buildingStageSuffix), the top of the art.
  // Spread on a 2-cell pitch across the plot (PLOT_RADIUS is 3, so [-3,3]^2).
  // Packing them adjacent made the base render as one indistinct pile once the
  // sprites were drawn at their true 128px size: cellToScreen is
  // dx=(gx-gy)*68, dy=(gx+gy)*34, so neighbouring cells put 128px sprites only
  // 68px/34px apart. A 2-cell pitch separates them without looking like a grid.
  const rivalLayout = [
    { buildingKey: 'mechanical_testing_rig', posX: -2, posY: -2 },
    { buildingKey: 'welding_fabrication', posX: 0, posY: -2 },
    { buildingKey: 'pcb_fab', posX: 2, posY: -2 },
    { buildingKey: 'embedded_systems_lab', posX: -2, posY: 0 },
    { buildingKey: 'ai_incubator', posX: 0, posY: 0 },
    { buildingKey: 'robotics_bay', posX: 2, posY: 0 },
    { buildingKey: 'workshop', posX: -2, posY: 2 },
    { buildingKey: 'electronics_bench', posX: 0, posY: 2 },
    { buildingKey: 'cnc_mill_shop', posX: 2, posY: 2 },
    { buildingKey: 'printing_shop', posX: 3, posY: 3 },
  ]
  const RIVAL_LEVEL = 15

  let placed = 0
  let upgraded = 0
  for (const b of rivalLayout) {
    const existing = await db.teamShopBuilding.findUnique({
      where: { teamId_buildingKey: { teamId: rivalTeam.id, buildingKey: b.buildingKey } },
    })
    if (existing) {
      // Re-runs top up an older, weaker rival instead of leaving it stunted —
      // and re-place it if the layout above has since moved, which an
      // `already max level and placed somewhere` check would silently skip.
      if (existing.level >= RIVAL_LEVEL && existing.posX === b.posX && existing.posY === b.posY) {
        continue
      }
      await db.teamShopBuilding.update({
        where: { id: existing.id },
        data: { level: RIVAL_LEVEL, posX: b.posX, posY: b.posY },
      })
      upgraded++
      continue
    }
    await db.teamShopBuilding.create({
      data: {
        teamId: rivalTeam.id,
        buildingKey: b.buildingKey,
        purchasedByUserId: rivalUser.id,
        posX: b.posX,
        posY: b.posY,
        level: RIVAL_LEVEL,
      },
    })
    placed++
  }
  // 5b. Gateways. They are raid targets now (app/api/pvp/route.ts folds
  // TeamGatewayPlacement into the base snapshot), so a demo rival wants a good
  // spread of them. Deliberately on ODD cells: the economy layout above is all
  // even, so the two sets interleave instead of landing on top of each other —
  // the rival previously had `discovery` sitting exactly on `ai_incubator`.
  const rivalGateways = [
    { gatewayKey: 'discovery', posX: -1, posY: -1 },
    { gatewayKey: 'literature_review', posX: 1, posY: -1 },
    { gatewayKey: 'research_plan', posX: -1, posY: 1 },
    { gatewayKey: 'operations_hub', posX: 1, posY: 1 },
    { gatewayKey: 'science_fair', posX: -3, posY: 1 },
    { gatewayKey: 'showcase', posX: 1, posY: 3 },
    { gatewayKey: 'pvp', posX: 3, posY: -1 },
  ]
  for (const g of rivalGateways) {
    await db.teamGatewayPlacement.upsert({
      where: { teamId_gatewayKey: { teamId: rivalTeam.id, gatewayKey: g.gatewayKey } },
      update: { posX: g.posX, posY: g.posY },
      create: { teamId: rivalTeam.id, gatewayKey: g.gatewayKey, posX: g.posX, posY: g.posY },
    })
  }
  note('ok', `rival gateways: ${rivalGateways.length} placed (raidable)`)

  const rivalPlaced = await db.teamShopBuilding.count({
    where: { teamId: rivalTeam.id, posX: { not: null } },
  })
  note(
    placed || upgraded ? 'created' : 'ok',
    `rival base: ${rivalPlaced} placed building(s) at level ${RIVAL_LEVEL}` +
      (upgraded ? ` (${upgraded} upgraded)` : ''),
  )

  // 6. The originally-requested bit: clear today's quota for the attacker's team.
  const cleared = await db.pvpRaidQuota.deleteMany({ where: { teamId: team.id } })
  note('reset', `raid quota rows cleared: ${cleared.count} (default is 0 used)`)

  console.log(`\nDev PvP fixture for ${ATTACKER_EMAIL}:\n${report.join('\n')}\n`)
  console.log(`Raid away: ${team.name} → ${rivalTeam.name} (both in "${CLASS_NAME}")\n`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
