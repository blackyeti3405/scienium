// Idempotent dev PvP unblocker — `pnpm --filter web seed:dev-pvp`
//
// Why this exists: "reset my raid counts" is almost never what actually blocks a
// raid. `pvp_raid_quota` starts EMPTY (0 raids used), so clearing it is usually a
// no-op. The real gate is in lib/pvp/matchmaking.ts:
//
//   findRandomOpponent() → `if (classIds.length === 0) return null`
//
// A raid needs ALL of:
//   1. attacker's team at phase `working`+   (PHASE_UNLOCKS: pvp unlocks at working)
//   2. the attacker IS IN A CLASS           (User.classId — null ⇒ never any opponent)
//   3. an opponent in the SAME class, at `working`+, with a PLACED building
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

  // 1. Attacker's team must be at `working`+ for the pvp phase gate.
  if (team.phase !== 'working' && team.phase !== 'showcase') {
    await db.team.update({ where: { id: team.id }, data: { phase: 'working' } })
    note('set', `team phase ${team.phase} → working`)
  } else {
    note('ok', `team phase ${team.phase} already unlocks pvp`)
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
        phase: 'working',
        labType: team.labType ?? 'volt_lab',
        members: { create: { userId: rivalUser.id, role: 'lead' } },
        currency: { create: {} },
      },
    })
    note('created', `rival team "${RIVAL_TEAM_NAME}"`)
  } else {
    await db.team.update({ where: { id: rivalTeam.id }, data: { phase: 'working' } })
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
  //    Mirrors the attacker's own buildings so the rival can actually fight back.
  const attackerBuildings = await db.teamShopBuilding.findMany({
    where: { teamId: team.id, posX: { not: null } },
    select: { buildingKey: true, posX: true, posY: true, level: true },
  })
  const seedBuildings = attackerBuildings.length
    ? attackerBuildings
    : [{ buildingKey: 'printing_shop', posX: 0, posY: 0, level: 1 }]

  let placed = 0
  for (const b of seedBuildings) {
    const existing = await db.teamShopBuilding.findUnique({
      where: { teamId_buildingKey: { teamId: rivalTeam.id, buildingKey: b.buildingKey } },
    })
    if (existing) continue
    await db.teamShopBuilding.create({
      data: {
        teamId: rivalTeam.id,
        buildingKey: b.buildingKey,
        purchasedByUserId: rivalUser.id,
        posX: b.posX,
        posY: b.posY,
        level: b.level,
      },
    })
    placed++
  }
  const rivalPlaced = await db.teamShopBuilding.count({
    where: { teamId: rivalTeam.id, posX: { not: null } },
  })
  note(placed ? 'created' : 'ok', `rival base: ${rivalPlaced} placed building(s)`)

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
