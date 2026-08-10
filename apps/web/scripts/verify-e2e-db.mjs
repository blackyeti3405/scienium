// Verify the E2E database is the one the suite is about to run against —
// `pnpm --filter web verify:e2e`
//
// Three assertions, three queries, ~2 seconds:
//   1. the migration HEAD (the newest committed migration folder) is applied,
//      and no migration is half-applied or rolled back;
//   2. the fixture graph seed-e2e.mjs builds actually exists, with the phase and
//      lab type the specs assume;
//   3. the database FINGERPRINT is printed — the same hash
//      /api/dev/e2e-health reports, so a CI log records which database was
//      migrated and seeded without ever printing a credential.
//
// `e2e/preflight.setup.ts` checks the same fixture from inside the run, but only
// once the server is up — in CI that is a ~7-minute production build later. This
// is the half that needs no server, so a broken database fails in seconds
// instead of after the build. It reads .env.local the same way the seeder does
// (`node --env-file`), so it can only ever look at the database the seeder wrote.
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'module'
// One owner for the fixture team's name (importing does not run its CLI).
import { FIXTURE_TEAM_NAME } from '../prisma/reset-e2e.mjs'
// The authored ISEF edition — the same module the seeder and the route read, so
// this check cannot pass against a catalog the route would not serve.
import { ISEF_EDITION } from '../lib/fairs/forms.ts'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

// Terminal phase — unlocks every feature cumulatively. Keep in lockstep with
// PHASE_ORDER in @scienium/shared-types and FIXTURE_PHASE in seed-e2e.mjs.
//
// This is the THIRD copy of this constant (seeder, dev-pvp seeder, verifier),
// and all three held the retired `working` after v0.81.0 renamed the enum. The
// seeder's copy silently left the fixture at `discovery`; this one then rejected
// the correctly-seeded fixture. If the phase model moves again, grep for it.
const FIXTURE_PHASE = 'project_development'
const FIXTURE_LAB_TYPE = 'volt_lab'

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'prisma',
  'migrations',
)
const head = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .pop()

const failures = []
const ok = (msg) => console.log(`  ok    ${msg}`)
const fail = (msg) => {
  failures.push(msg)
  console.error(`  FAIL  ${msg}`)
}

const db = new PrismaClient()
try {
  const [{ fp }] = await db.$queryRaw`
    SELECT md5(
      current_database() || ':' ||
      coalesce(host(inet_server_addr()), 'local') || ':' ||
      coalesce(inet_server_port()::text, '?')
    ) AS fp`
  console.log(`database fingerprint ${fp}\n`)

  // ── 1. Migrations at head ────────────────────────────────────────────────
  const applied = await db.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM _prisma_migrations`
  const headRow = applied.find((row) => row.migration_name === head)
  if (!headRow || !headRow.finished_at) {
    fail(`migration head ${head} is not applied — run: pnpm --filter web exec prisma migrate deploy`)
  } else {
    ok(`migration head ${head} applied (${applied.length} total)`)
  }
  const broken = applied.filter((row) => row.rolled_back_at || !row.finished_at)
  if (broken.length > 0) {
    fail(`rolled back / unfinished: ${broken.map((row) => row.migration_name).join(', ')}`)
  }

  // ── 2. The fixture graph ─────────────────────────────────────────────────
  const team = await db.team.findFirst({
    where: { name: FIXTURE_TEAM_NAME },
    select: {
      phase: true,
      labType: true,
      classId: true,
      _count: { select: { members: true } },
    },
  })
  const before = failures.length
  if (!team) {
    fail(`team "${FIXTURE_TEAM_NAME}" is missing — run: pnpm --filter web seed:e2e`)
  } else {
    if (team.phase !== FIXTURE_PHASE) fail(`team phase is ${team.phase}, expected ${FIXTURE_PHASE}`)
    if (team.labType !== FIXTURE_LAB_TYPE) {
      fail(`team labType is ${team.labType}, expected ${FIXTURE_LAB_TYPE}`)
    }
    if (team._count.members < 1) fail('team has no members')
    if (!team.classId) fail('team is not linked to a class — teacher-scope specs resolve through it')
    if (failures.length === before) {
      ok(
        `team "${FIXTURE_TEAM_NAME}" — ${FIXTURE_PHASE} / ${FIXTURE_LAB_TYPE}, ${team._count.members} member(s)`,
      )
    }
  }

  // The teacher identity is the one seed:e2e must MATERIALIZE from Clerk in CI
  // (empty database, no prior sign-in). A class owned by a teacher row proves
  // that half of the seed ran, not just the school/team half.
  const klass = team?.classId
    ? await db.class.findUnique({
        where: { id: team.classId },
        select: { name: true, teacher: { select: { role: true, email: true } } },
      })
    : null
  if (!klass?.teacher) {
    fail('the fixture class has no teacher — the Clerk-backed identities were not materialized')
  } else if (klass.teacher.role !== 'teacher') {
    fail(`the fixture class owner has role=${klass.teacher.role}, expected teacher`)
  } else {
    ok(`class "${klass.name}" owned by a teacher identity`)
  }

  // ── 3. The ISEF forms catalog ────────────────────────────────────────────
  // Seeded by seed-e2e.mjs because the app only reconciles it from the
  // maintenance cron, which CI never runs (see that file's section 9). A missing
  // catalog is invisible until a spec waits out a 15-second timeout on a form
  // title `GET /api/fairs/forms` can never serve — two seconds here instead.
  const editionCodes = ISEF_EDITION.forms.map((f) => f.code)
  const seededForms = await db.formsCatalog.count({ where: { formCode: { in: editionCodes } } })
  if (seededForms < editionCodes.length) {
    fail(
      `forms catalog has ${seededForms}/${editionCodes.length} ISEF ${ISEF_EDITION.season} codes — run: pnpm --filter web seed:e2e`,
    )
  } else {
    ok(`forms catalog — all ${editionCodes.length} ISEF ${ISEF_EDITION.season} codes present`)
  }
} finally {
  await db.$disconnect()
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed — the browser suite would fail on all of them.`)
  process.exit(1)
}
console.log('\nE2E database verified.')
