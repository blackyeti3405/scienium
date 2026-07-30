/**
 * P1-S14 verification: prove each migration's preflight actually clears the
 * duplicates the old schema permitted, against the REAL local Postgres.
 *
 * Each case runs in its OWN transaction that always throws at the end, so the
 * database is rolled back untouched. Per case: drop the unique index, inject
 * duplicate rows the pre-index schema would have allowed, run the migration's
 * preflight verbatim, then recreate the index. If the index builds, the
 * preflight works; without it the CREATE aborts — which is exactly the deploy
 * failure P1-S14 describes.
 */
import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const CASES = [
  {
    name: 'showcase_views (track_a_hardening)',
    index: 'showcase_views_showcase_id_visitor_fingerprint_day_key',
    table: 'showcase_views',
    cols: '"showcase_id","visitor_fingerprint","day"',
    migration: '20260719120000_track_a_hardening',
    dirty: `INSERT INTO "showcase_views" (id, showcase_id, visitor_fingerprint, viewed_at, day)
            SELECT 'dupe_'||id, showcase_id, visitor_fingerprint, viewed_at + interval '2 hours', day
            FROM "showcase_views"`,
  },
  {
    name: 'papers (paper_list_metadata)',
    index: 'papers_team_id_content_hash_key',
    table: 'papers',
    cols: '"team_id","content_hash"',
    migration: '20260709140000_paper_list_metadata',
    dirty: `UPDATE "papers" SET content_hash = 'COLLIDE'
            WHERE id IN (SELECT id FROM "papers" WHERE content_hash IS NOT NULL LIMIT 3)`,
  },
  {
    name: 'team_shop_buildings (plot_cell_unique)',
    index: 'team_shop_buildings_team_id_pos_x_pos_y_key',
    table: 'team_shop_buildings',
    cols: '"team_id","pos_x","pos_y"',
    migration: '20260713100000_plot_cell_unique',
    dirty: `UPDATE "team_shop_buildings" SET pos_x = 4, pos_y = 4
            WHERE id IN (SELECT id FROM "team_shop_buildings" WHERE pos_x IS NOT NULL LIMIT 3)`,
  },
  {
    name: 'discovery_nodes (citation_manager)',
    index: 'discovery_nodes_paper_id_key',
    table: 'discovery_nodes',
    cols: '"paper_id"',
    migration: '20260701040000_discovery_v2_citation_manager',
    dirty: `UPDATE "discovery_nodes" SET paper_id = (SELECT id FROM "papers" ORDER BY id LIMIT 1)
            WHERE id IN (SELECT id FROM "discovery_nodes" ORDER BY id LIMIT 3)`,
  },
]

/** Pull the preflight statement (the DELETE/UPDATE against `table`) out of the real migration. */
function preflightOf(migration, table) {
  const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8')
  // The DEDUPE statement specifically — not merely the first write to the table.
  // track_a_hardening also has an unrelated `UPDATE ... SET day` backfill, and
  // taking that one made this check silently verify the wrong statement.
  const stmts = Array.from(sql.matchAll(new RegExp(`(DELETE\\s+FROM|UPDATE)\\s+"${table}"`, 'gi')))
    .map((m) => sql.slice(m.index, sql.indexOf(';', m.index) + 1))
    .filter((s) => /row_number\s*\(/i.test(s))
  if (stmts.length !== 1) throw new Error(`expected exactly one dedupe in ${migration} for ${table}, got ${stmts.length}`)
  return stmts[0]
}

class Rollback extends Error {
  constructor(payload) {
    super('rollback')
    this.payload = payload
  }
}

const results = []
for (const c of CASES) {
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`DROP INDEX "${c.index}"`)
        await tx.$executeRawUnsafe(c.dirty)
        const dup = await tx.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM (SELECT 1 FROM "${c.table}" GROUP BY ${c.cols} HAVING count(*) > 1) d`,
        )
        const touched = await tx.$executeRawUnsafe(preflightOf(c.migration, c.table))
        await tx.$executeRawUnsafe(
          `CREATE UNIQUE INDEX "${c.index}" ON "${c.table}"(${c.cols})`,
        )
        const left = await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${c.table}"`)
        throw new Rollback({
          case: c.name,
          duplicateGroupsInjected: dup[0].n,
          preflightRowsTouched: touched,
          rowsRemaining: left[0].n,
          indexRebuilt: 'ok',
        })
      },
      { timeout: 60_000 },
    )
  } catch (e) {
    if (e instanceof Rollback) results.push(e.payload)
    else { console.error(c.name, e); results.push({ case: c.name, indexRebuilt: `FAILED` }) }
  }
}

console.table(results)
await db.$disconnect()
const bad = results.filter((r) => r.indexRebuilt !== 'ok' || !r.duplicateGroupsInjected)
if (bad.length) {
  console.error('NOT VERIFIED:', JSON.stringify(bad, null, 2))
  process.exit(1)
}
console.log('All four preflights verified against real Postgres; every transaction rolled back.')
