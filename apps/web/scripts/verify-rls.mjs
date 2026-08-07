// Data-exposure checker — `pnpm --filter web verify:rls`
//
// Checks the three things that decide whether this database is reachable by
// anything other than the app, and the one thing that would lock the app out of
// its own data.
//
// Supabase's Data API applies TWO layers, in this order: GRANTS decide whether a
// role may touch a table at all, and only then does RLS decide which rows. So the
// checks below are ordered the same way, and the grant check is the one that
// actually matters — a table with no grant to `anon` is unreachable whatever its
// policies say.
//
//   1. GRANTS   no public table is SELECTable by `anon` (skipped where the role
//               does not exist, i.e. any non-Supabase database)
//   2. RLS      every public table has RLS enabled
//   3. FORCE    no table is FORCE ROW LEVEL SECURITY
//   4. OWNER    the connecting role owns every table
//
// (3) and (4) are the blackout checks, and they are why this script exists rather
// than a one-line query. RLS with zero policies is safe ONLY because a table's
// owner is exempt from it — and that exemption is a fact about who owns the table
// versus who is connecting, not about the migration. Set FORCE, or connect as a
// non-owner without BYPASSRLS, and every SELECT quietly returns an empty set.
// Prisma does not throw: it returns nothing, which in a classroom looks exactly
// like the database was wiped mid-lesson.
//
// Against production (never prints the connection string):
//   cd apps/web && env $(grep -v '^#' .env.production.local | xargs) node scripts/verify-rls.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function main() {
  const [{ current_user: runtimeRole }] = await db.$queryRawUnsafe(`SELECT current_user`)
  const [{ has_anon: hasAnon }] = await db.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AS has_anon`,
  )

  const rows = await db.$queryRawUnsafe(`
    SELECT c.relname                AS table_name,
           c.relrowsecurity         AS rls_enabled,
           c.relforcerowsecurity    AS rls_forced,
           c.relowner::regrole::text AS owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `)

  // `has_table_privilege` resolves inherited and PUBLIC grants;
  // information_schema.role_table_grants misses both.
  const anonReadable = hasAnon
    ? (
        await db.$queryRawUnsafe(`
          SELECT c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r'
            AND has_table_privilege('anon', c.oid, 'SELECT')
          ORDER BY c.relname
        `)
      ).map((r) => r.table_name)
    : []

  const missing = rows.filter((r) => !r.rls_enabled).map((r) => r.table_name)
  const forced = rows.filter((r) => r.rls_forced).map((r) => r.table_name)
  const foreign = rows.filter((r) => r.owner !== runtimeRole).map((r) => `${r.table_name}(${r.owner})`)

  console.log(`\nData-exposure check — ${rows.length} table(s) in "public"`)
  console.log(`  connecting as : ${runtimeRole}`)
  console.log(`  anon role     : ${hasAnon ? 'present (Supabase)' : 'absent — grant check skipped'}`)
  console.log(`  RLS enabled   : ${rows.length - missing.length}/${rows.length}`)
  console.log(`  anon-readable : ${hasAnon ? anonReadable.length : 'n/a'}`)
  console.log(`  FORCE set     : ${forced.length}`)
  console.log(`  foreign-owned : ${foreign.length}`)

  const fail = (msg) => {
    console.error(`\nFAIL — ${msg}`)
    process.exitCode = 1
  }

  // Blackout risks first: these break the app, which beats an exposure warning.
  if (forced.length) {
    return fail(
      `FORCE ROW LEVEL SECURITY is set on: ${forced.join(', ')}\n` +
        `  With no policies the app reads ZERO rows and writes fail silently.\n` +
        `  Fix: ALTER TABLE <t> NO FORCE ROW LEVEL SECURITY;`,
    )
  }
  if (foreign.length) {
    return fail(
      `these tables are not owned by "${runtimeRole}": ${foreign.join(', ')}\n` +
        `  A non-owner without BYPASSRLS is subject to RLS, and with no policies\n` +
        `  reads nothing. Either connect as the owner or grant BYPASSRLS.`,
    )
  }

  if (hasAnon && anonReadable.length) {
    return fail(
      `${anonReadable.length} table(s) are SELECTable by "anon": ${anonReadable.slice(0, 8).join(', ')}` +
        `${anonReadable.length > 8 ? ', …' : ''}\n` +
        `  On Supabase these are reachable through the Data API with the\n` +
        `  publishable anon key. Fix in the SQL editor (NOT a migration — the\n` +
        `  anon role does not exist locally or in CI):\n` +
        `    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`,
    )
  }

  if (missing.length) {
    return fail(
      `RLS is OFF on: ${missing.join(', ')}\n` +
        `  Add a migration enabling it (see 20260807160000_enable_rls_all_tables).`,
    )
  }

  console.log('\nOK — RLS on, nothing forced, all tables owned by the connecting role' +
    `${hasAnon ? ', nothing anon-readable' : ''}.\n`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
