// Idempotent E2E fixture seeder — `pnpm --filter web seed:e2e`
//
// The Playwright suite (apps/web/e2e/) needs a fixture graph the app never
// creates on its own: School "E2E School" → Class "E2E Class" (owned by the
// DevTeacher account) → the "E2E Test Lab" team containing the E2E leader +
// student, with both students' classId/schoolId set. `teacherOwnsTeam`
// (lib/teacher/auth.ts) and GET /api/teacher/roster resolve teacher scope
// through Class rows + User.classId, so without this graph every teacher-flow
// spec dies in its beforeAll roster check (this happened 2026-07-03: zero
// Class rows existed).
//
// Data-only: never touches migrations, never deletes, safe to re-run — the
// second run reports every node as "found" and performs zero writes.
//
// The three User rows are Clerk-owned. They are never FABRICATED here — a
// made-up clerkUserId would fork a duplicate identity on real sign-in — but
// when they are absent they are MATERIALIZED by reading the real ids from the
// Clerk API (see `materializeFromClerk`). That is what lets the fixture be
// built into an empty database, which every CI run provisions; before it, the
// CI E2E lane would have aborted here the moment its secrets were configured.
// Without CLERK_SECRET_KEY, sign in once instead:
//   pnpm --filter web exec playwright test --project=setup

// To clear the accumulated content this seeder deliberately never deletes:
//   pnpm --filter web reset:e2e     (see prisma/reset-e2e.mjs)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

const SCHOOL_NAME = 'E2E School'
const CLASS_NAME = 'E2E Class'
const TEAM_NAME = 'E2E Test Lab'

const report = []
const note = (node, outcome, detail = '') =>
  report.push({ node, outcome, ...(detail ? { detail } : {}) })

/**
 * Locate a Clerk-backed user row. E2E_*_IDENTIFIER values are Clerk usernames
 * in this repo (not emails), so try: exact email (if the identifier has an
 * '@'), then email prefix `<identifier>@`, then the known display name.
 */
async function findUser(identifier, fallbackName, roleFilter) {
  const where = roleFilter ? { role: roleFilter } : {}
  if (identifier?.includes('@')) {
    const byEmail = await db.user.findFirst({ where: { ...where, email: identifier } })
    if (byEmail) return { user: byEmail, via: `email=${identifier}` }
  }
  if (identifier) {
    const byPrefix = await db.user.findFirst({
      where: { ...where, email: { startsWith: `${identifier}@` } },
    })
    if (byPrefix) return { user: byPrefix, via: `email prefix ${identifier}@…` }
  }
  const byName = await db.user.findFirst({ where: { ...where, name: fallbackName } })
  if (byName) return { user: byName, via: `name="${fallbackName}"` }
  return { user: null, via: null }
}

/**
 * Materialize a missing user row from Clerk itself.
 *
 * The original design refused to create `User` rows at all, on the grounds that
 * a made-up `clerkUserId` would fork a duplicate identity on real sign-in. That
 * reasoning is sound and this does not violate it: the id is READ FROM CLERK, so
 * it is the same id the app would write on first sign-in.
 *
 * Without this, the fixture cannot be seeded into an EMPTY database — which is
 * exactly what CI provisions on every run (a `postgres:16` service). The CI E2E
 * lane would abort at this step the moment its secrets were configured; it has
 * simply never been exercised, because the whole job is gated on a secret that
 * is not set. Requires `CLERK_SECRET_KEY` (already needed by the suite).
 */
async function materializeFromClerk(identifier, fallbackName, role) {
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret || !identifier) return { user: null, via: null }

  const query = identifier.includes('@')
    ? `email_address=${encodeURIComponent(identifier)}`
    : `username=${encodeURIComponent(identifier)}`
  const res = await fetch(`https://api.clerk.com/v1/users?${query}&limit=1`, {
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => null)
  if (!res || !res.ok) return { user: null, via: null }

  const [clerkUser] = await res.json()
  if (!clerkUser) return { user: null, via: null }

  const email =
    clerkUser.email_addresses?.find((e) => e.id === clerkUser.primary_email_address_id)
      ?.email_address ?? clerkUser.email_addresses?.[0]?.email_address
  if (!email) return { user: null, via: null }

  const user = await db.user.create({
    data: {
      clerkUserId: clerkUser.id,
      name: clerkUser.first_name ?? clerkUser.username ?? fallbackName,
      email,
      role,
    },
  })
  return { user, via: `Clerk API (${query.split('=')[0]})` }
}

try {
  // ── 1. Users (locate-only) ────────────────────────────────────────────────
  // Single-account dev setups can point E2E_STUDENT at the leader (so the user's
  // own account isn't conscripted as a second team member). When the identifiers
  // match, the student IS the leader — the co-member specs (codex/vega) collapse
  // to one account and skip their cross-member assertions.
  const studentIsLeader =
    process.env.E2E_STUDENT_IDENTIFIER === process.env.E2E_LEADER_IDENTIFIER
  const [leader, teacher] = await Promise.all([
    findUser(process.env.E2E_LEADER_IDENTIFIER, 'E2E Leader', undefined),
    findUser(process.env.E2E_TEACHER_IDENTIFIER, 'DevTeacher', 'teacher'),
  ])
  let student = studentIsLeader
    ? leader
    : await findUser(process.env.E2E_STUDENT_IDENTIFIER, 'E2E Student', undefined)

  // Empty database (every CI run provisions one): pull the real ids from Clerk
  // rather than aborting. See `materializeFromClerk`.
  const resolved = { leader, student, teacher }
  for (const [key, identifierEnv, fallbackName, role] of [
    ['leader', 'E2E_LEADER_IDENTIFIER', 'E2E Leader', 'student'],
    ['student', 'E2E_STUDENT_IDENTIFIER', 'E2E Student', 'student'],
    ['teacher', 'E2E_TEACHER_IDENTIFIER', 'DevTeacher', 'teacher'],
  ]) {
    if (resolved[key].user) continue
    resolved[key] = await materializeFromClerk(
      process.env[identifierEnv],
      fallbackName,
      role,
    )
    if (resolved[key].user) note(`user: ${fallbackName}`, 'created', 'from the Clerk API')
  }
  student = studentIsLeader ? resolved.leader : resolved.student

  const missing = [
    ['E2E leader', resolved.leader],
    ['E2E student', student],
    ['DevTeacher', resolved.teacher],
  ].filter(([, r]) => !r.user)
  if (missing.length > 0) {
    console.error(
      `ABORT — user row(s) missing: ${missing.map(([label]) => label).join(', ')}.\n` +
        'They could not be found locally, and the Clerk API lookup did not resolve them.\n' +
        'Check CLERK_SECRET_KEY and the E2E_*_IDENTIFIER values, or materialize them by\n' +
        'signing in once:        pnpm --filter web exec playwright test --project=setup\n' +
        'then re-run:            pnpm --filter web seed:e2e',
    )
    process.exit(1)
  }
  const leaderRec = resolved.leader
  const teacherRec = resolved.teacher
  note('user: E2E leader', 'found', `via ${leaderRec.via}`)
  note('user: E2E student', 'found', `via ${student.via}`)
  note('user: DevTeacher', 'found', `via ${teacherRec.via}`)

  // ── 2. School ─────────────────────────────────────────────────────────────
  let school = await db.school.findUnique({ where: { name: SCHOOL_NAME } })
  if (school) {
    note(`school: ${SCHOOL_NAME}`, 'found')
  } else {
    school = await db.school.create({ data: { name: SCHOOL_NAME } })
    note(`school: ${SCHOOL_NAME}`, 'created')
  }

  // ── 3. Class owned by DevTeacher ──────────────────────────────────────────
  // Any class owned by the teacher satisfies teacherOwnsTeam; only create when
  // the teacher owns none.
  let klass = await db.class.findFirst({ where: { teacherId: teacherRec.user.id } })
  if (klass) {
    note(`class: ${klass.name}`, 'found')
  } else {
    klass = await db.class.create({
      data: { schoolId: school.id, name: CLASS_NAME, teacherId: teacherRec.user.id },
    })
    note(`class: ${CLASS_NAME}`, 'created')
  }

  // ── 4. Team ───────────────────────────────────────────────────────────────
  // The suite exercises features across every phase (literature, buildings,
  // showcase, …) so the fixture team sits at the terminal `showcase` phase, which
  // unlocks all features cumulatively. `labType` is `volt_lab` because the
  // placement/upgrade specs buy that lab's buildings (3D Printing Shop, Robotics
  // Bay) — lab-specific buildings only render for a matching labType. Without both,
  // the phase-gated shop is empty / building specs can't find their buy button.
  const FIXTURE_PHASE = 'showcase'
  const FIXTURE_LAB_TYPE = 'volt_lab'
  let team = await db.team.findFirst({ where: { name: TEAM_NAME } })
  if (team) {
    note(`team: ${TEAM_NAME}`, 'found')
    if (team.phase !== FIXTURE_PHASE || team.labType !== FIXTURE_LAB_TYPE) {
      await db.team.update({
        where: { id: team.id },
        data: { phase: FIXTURE_PHASE, labType: FIXTURE_LAB_TYPE },
      })
      note(`team: phase/labType`, 'updated', `${FIXTURE_PHASE} / ${FIXTURE_LAB_TYPE}`)
    }
  } else {
    team = await db.team.create({
      data: {
        name: TEAM_NAME,
        teamLeadId: leaderRec.user.id,
        classId: klass.id,
        phase: FIXTURE_PHASE,
        labType: FIXTURE_LAB_TYPE,
      },
    })
    note(`team: ${TEAM_NAME}`, 'created', `${FIXTURE_PHASE} / ${FIXTURE_LAB_TYPE}`)
  }

  // ── 5. Memberships ────────────────────────────────────────────────────────
  //
  // `TeamMember.userId` is `@@unique` (v0.71.0, one team at a time), so an
  // account that already belongs to a DIFFERENT team cannot simply gain a second
  // row — `create` fails P2002. That is not hypothetical: a fresh dev account
  // completes onboarding by creating its own lab, so pointing
  // `E2E_STUDENT_IDENTIFIER` at one crashed this step before it reached the
  // class links.
  //
  // The stale membership is deleted with a RAW delete, not `departTeam` — the
  // same reasoning `e2e/lab.ts` records: departing runs lead-transfer and
  // archive-if-last side effects meant for a real student leaving a real team,
  // which must not fire because a fixture conscripted an account. The lab the
  // account leaves is left as-is, which can leave its `team_lead_id` pointing at
  // a non-member; that state is tolerated everywhere it matters (`applyLead`
  // demotes through `updateMany`, `disposeLab` does not care) and is reversible
  // by rejoining. It is announced rather than done quietly, because losing your
  // dev lab's membership to a seeder should never be a surprise.
  for (const [label, user, role] of [
    ['leader', leaderRec.user, 'lead'],
    ['student', student.user, 'member'],
  ]) {
    const existing = await db.teamMember.findUnique({ where: { userId: user.id } })
    if (existing?.teamId === team.id) {
      note(`membership: ${label}`, 'found')
      continue
    }
    if (existing) {
      const other = await db.team.findUnique({
        where: { id: existing.teamId },
        select: { name: true },
      })
      await db.teamMember.delete({
        where: { userId_teamId: { userId: user.id, teamId: existing.teamId } },
      })
      note(
        `membership: ${label} vacated`,
        'updated',
        `left "${other?.name ?? existing.teamId}" — one team at a time`,
      )
    }
    await db.teamMember.create({ data: { userId: user.id, teamId: team.id, role } })
    note(`membership: ${label}`, 'created', `role=${role}`)
  }

  // ── 6. Class/school links on the student users ────────────────────────────
  for (const [label, user] of [
    ['leader', leaderRec.user],
    ['student', student.user],
  ]) {
    if (user.classId === klass.id && user.schoolId === school.id) {
      note(`links: ${label} classId/schoolId`, 'found')
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { classId: klass.id, schoolId: school.id },
      })
      note(`links: ${label} classId/schoolId`, 'updated')
    }
  }
  if (team.classId === klass.id) {
    note('links: team classId', 'found')
  } else {
    await db.team.update({ where: { id: team.id }, data: { classId: klass.id } })
    note('links: team classId', 'updated')
  }

  for (const [label, user] of [
    ['leader', leaderRec.user],
    ['student', student.user],
  ]) {
    if (user.activeTeamId === team.id) {
      note(`links: ${label} activeTeamId`, 'found')
    } else {
      await db.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } })
      note(`links: ${label} activeTeamId`, 'updated')
    }
  }
  if (teacherRec.user.schoolId === school.id) {
    note('links: teacher schoolId', 'found')
  } else {
    await db.user.update({ where: { id: teacherRec.user.id }, data: { schoolId: school.id } })
    note('links: teacher schoolId', 'updated')
  }

  // ── 7. Currency baseline ──────────────────────────────────────────────────
  // placement.spec.ts buys the 3D Printing Shop (CLR 1, 3,600 KP) and
  // upgrades.spec.ts buys the Robotics Bay (CLR 3, 9,000 KP), so the suite
  // needs clearanceLevel ≥ 3 and a KP cushion; both drift downward as runs
  // spend KP (observed 2026-07-05: clearance 0 / 150 KP made both specs fail
  // deterministically on a missing .shop-card__buy). Restore UP to the
  // baseline only — never lower an above-baseline value, and never touch LC
  // (upgrades.spec.ts seeds and resets LC itself).
  const KP_BASELINE = 100000
  const CLEARANCE_BASELINE = 3
  const currency = await db.teamCurrency.findUnique({ where: { teamId: team.id } })
  if (currency && currency.kp >= KP_BASELINE && currency.clearanceLevel >= CLEARANCE_BASELINE) {
    note('currency: KP/clearance baseline', 'found', `kp=${currency.kp} clr=${currency.clearanceLevel}`)
  } else if (currency) {
    await db.teamCurrency.update({
      where: { teamId: team.id },
      data: {
        kp: Math.max(currency.kp, KP_BASELINE),
        clearanceLevel: Math.max(currency.clearanceLevel, CLEARANCE_BASELINE),
      },
    })
    note(
      'currency: KP/clearance baseline',
      'updated',
      `kp ${currency.kp}→${Math.max(currency.kp, KP_BASELINE)}, clr ${currency.clearanceLevel}→${Math.max(currency.clearanceLevel, CLEARANCE_BASELINE)}`,
    )
  } else {
    await db.teamCurrency.create({
      data: { teamId: team.id, kp: KP_BASELINE, clearanceLevel: CLEARANCE_BASELINE },
    })
    note('currency: KP/clearance baseline', 'created', `kp=${KP_BASELINE} clr=${CLEARANCE_BASELINE}`)
  }

  // ── 8. Gateway layout ─────────────────────────────────────────────────────
  // The isometric scene's DEFAULT gateway cells sit close enough that one 128px
  // sprite covers a neighbour's hit area: Playwright then reports "subtree
  // intercepts pointer events" and cannot click "Open Discovery" at all, failing
  // specs with nothing to do with buildings. The fixture used to be saved from
  // this only by whatever positions `placement.spec.ts` happened to leave behind
  // — i.e. the suite's clickability depended on test execution order.
  //
  // Seeding an explicit spread makes it reproducible, and makes the layout
  // something `reset:e2e` may clear because this restores it.
  const GATEWAY_LAYOUT = [
    ['discovery', 1, 3],
    ['literature_review', -1, 3],
    ['operations_hub', 3, 3],
    ['pvp', 3, 1],
    ['research_plan', -2, 1],
    ['science_fair', 3, -1],
    ['showcase', 1, -2],
  ]
  let placed = 0
  for (const [gatewayKey, posX, posY] of GATEWAY_LAYOUT) {
    const existing = await db.teamGatewayPlacement.findUnique({
      where: { teamId_gatewayKey: { teamId: team.id, gatewayKey } },
    })
    if (existing) continue
    await db.teamGatewayPlacement.create({
      data: { teamId: team.id, gatewayKey, posX, posY },
    })
    placed++
  }
  note('gateway layout', placed === 0 ? 'found' : 'created', `${placed} placement(s)`)

  // ── Report ────────────────────────────────────────────────────────────────
  const width = Math.max(...report.map((r) => r.node.length))
  for (const r of report) {
    console.log(`${r.node.padEnd(width)}  ${r.outcome.toUpperCase()}${r.detail ? `  (${r.detail})` : ''}`)
  }
  const writes = report.filter((r) => r.outcome !== 'found').length
  console.log(
    writes === 0
      ? '\nAll fixtures present — no writes performed.'
      : `\n${writes} node(s) created/updated. Re-run to confirm idempotency (expect zero writes).`,
  )
} finally {
  await db.$disconnect()
}
