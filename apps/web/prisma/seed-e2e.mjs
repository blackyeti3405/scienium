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
// The three User rows themselves are Clerk-owned (created by the app on first
// authenticated request) and are deliberately NOT fabricated here: a row with
// a made-up clerkUserId would fork a duplicate identity on real sign-in.
// If they're missing, run the Playwright auth setup once to materialize them:
//   pnpm --filter web exec playwright test --project=setup
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

try {
  // ── 1. Users (locate-only) ────────────────────────────────────────────────
  const [leader, student, teacher] = await Promise.all([
    findUser(process.env.E2E_LEADER_IDENTIFIER, 'E2E Leader', undefined),
    findUser(process.env.E2E_STUDENT_IDENTIFIER, 'E2E Student', undefined),
    findUser(process.env.E2E_TEACHER_IDENTIFIER, 'DevTeacher', 'teacher'),
  ])
  const missing = [
    ['E2E leader', leader],
    ['E2E student', student],
    ['DevTeacher', teacher],
  ].filter(([, r]) => !r.user)
  if (missing.length > 0) {
    console.error(
      `ABORT — user row(s) missing: ${missing.map(([label]) => label).join(', ')}.\n` +
        'These rows are created by the app on first sign-in and cannot be seeded.\n' +
        'Materialize them with:  pnpm --filter web exec playwright test --project=setup\n' +
        'then re-run:            pnpm --filter web seed:e2e',
    )
    process.exit(1)
  }
  note('user: E2E leader', 'found', `via ${leader.via}`)
  note('user: E2E student', 'found', `via ${student.via}`)
  note('user: DevTeacher', 'found', `via ${teacher.via}`)

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
  let klass = await db.class.findFirst({ where: { teacherId: teacher.user.id } })
  if (klass) {
    note(`class: ${klass.name}`, 'found')
  } else {
    klass = await db.class.create({
      data: { schoolId: school.id, name: CLASS_NAME, teacherId: teacher.user.id },
    })
    note(`class: ${CLASS_NAME}`, 'created')
  }

  // ── 4. Team ───────────────────────────────────────────────────────────────
  let team = await db.team.findFirst({ where: { name: TEAM_NAME } })
  if (team) {
    note(`team: ${TEAM_NAME}`, 'found')
  } else {
    team = await db.team.create({ data: { name: TEAM_NAME, teamLeadId: leader.user.id } })
    note(`team: ${TEAM_NAME}`, 'created')
  }

  // ── 5. Memberships ────────────────────────────────────────────────────────
  for (const [label, user, role] of [
    ['leader', leader.user, 'lead'],
    ['student', student.user, 'member'],
  ]) {
    const existing = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
    })
    if (existing) {
      note(`membership: ${label}`, 'found')
    } else {
      await db.teamMember.create({ data: { userId: user.id, teamId: team.id, role } })
      note(`membership: ${label}`, 'created', `role=${role}`)
    }
  }

  // ── 6. Class/school links on the student users ────────────────────────────
  for (const [label, user] of [
    ['leader', leader.user],
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
  if (teacher.user.schoolId === school.id) {
    note('links: teacher schoolId', 'found')
  } else {
    await db.user.update({ where: { id: teacher.user.id }, data: { schoolId: school.id } })
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
  const KP_BASELINE = 20000
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
