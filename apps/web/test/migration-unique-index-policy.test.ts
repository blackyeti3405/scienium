import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * REFACTOR2 P1-S14 — a migration that adds a unique index to a table it did not
 * just create MUST first remove the rows the old schema permitted.
 *
 * This is a recurrence guard, not a style check. The defect landed four
 * separate times (`showcase_views`, `papers`, `team_shop_buildings`,
 * `discovery_nodes`), and each one aborts `CREATE UNIQUE INDEX` — and therefore
 * the entire deploy — the moment production holds a single duplicate pair. Two
 * of the four carried a comment ASSERTING no duplicates existed, which is
 * exactly the failure: an assumption about the old code is not a property of
 * the data.
 *
 * A new migration that trips this test has three honest ways out: dedupe,
 * quarantine (null the column, keep the row and its children), or add itself to
 * `EXEMPT` with a reason that holds.
 */

const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations')

/**
 * Migrations that add a unique index to a pre-existing table and legitimately
 * need no preflight. Every entry states why — a bare list would just be the
 * assumption this test exists to stop.
 */
const EXEMPT: Record<string, string> = {
  '20260705220250_team_rubric_scorer_role':
    'Replaces (team_id, criterion_key) with (team_id, criterion_key, scorer_role). Strictly WIDER than the unique it drops, so it cannot collide on rows the old index already permitted.',
  '20260708182000_codex_team_scoping':
    'Replaces (user_id, day) with (user_id, team_id, day) on codex_kp_days — again strictly wider than the dropped unique.',
  '20260725160000_showcase_share_token':
    'Indexes a column added by the same migration and backfilled with per-row random values; there are no historical values to collide.',
  '20260701004819_discovery_v2_papers_tab':
    'The (team_id, external_id) unique covers external_id, a column this migration adds. Every pre-existing row is NULL there, and Postgres treats NULLs as distinct, so no historical pair can collide.',
}

interface UniqueIndex {
  migration: string
  table: string
  offset: number
}

function migrationDirs(): string[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

function sqlOf(dir: string): string {
  try {
    return readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8')
  } catch {
    return ''
  }
}

/** Tables this migration creates itself — a fresh table has no history to clean. */
function tablesCreatedIn(sql: string): Set<string> {
  return new Set(Array.from(sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi), (m) => m[1]!))
}

function uniqueIndexesIn(dir: string, sql: string): UniqueIndex[] {
  const own = tablesCreatedIn(sql)
  const found: UniqueIndex[] = []
  for (const m of sql.matchAll(/CREATE UNIQUE INDEX\s+"[^"]+"\s*\n?\s*ON\s+"([^"]+)"/gi)) {
    const table = m[1]!
    if (own.has(table)) continue
    found.push({ migration: dir, table, offset: m.index! })
  }
  return found
}

/**
 * A DELETE or UPDATE against `table` before `offset`, plus a construct that
 * actually PICKS a winner per duplicate group.
 *
 * The second half is not decoration. The first version of this check accepted
 * any preceding write to the table, and `track_a_hardening`'s unrelated
 * `UPDATE showcase_views SET day = viewed_at::date` backfill satisfied it —
 * the guard would have passed the exact migration it exists to catch.
 */
function hasPreflight(sql: string, table: string, offset: number): boolean {
  const before = sql.slice(0, offset)
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const writes = new RegExp(`(DELETE\\s+FROM|UPDATE)\\s+"${escaped}"`, 'i').test(before)
  const picksAWinner =
    // ranked window, keeper temp table, or aggregate keeper …
    /row_number\s*\(\s*\)|GROUP\s+BY|MIN\s*\(/i.test(before) ||
    // … or a self-join that compares each row against its own group's keeper
    // (`followup_claim_unique` does it this way and is correct).
    new RegExp(`USING\\s+"${escaped}"`, 'i').test(before)
  return writes && picksAWinner
}

describe('P1-S14 — unique indexes on pre-existing tables', () => {
  const dirs = migrationDirs()

  it('finds the migration history', () => {
    expect(dirs.length).toBeGreaterThan(40)
  })

  it('every one is preceded by a dedupe or quarantine, or exempt with a reason', () => {
    const offenders: string[] = []
    for (const dir of dirs) {
      const sql = sqlOf(dir)
      for (const idx of uniqueIndexesIn(dir, sql)) {
        if (EXEMPT[dir]) continue
        if (!hasPreflight(sql, idx.table, idx.offset)) {
          offenders.push(`${dir} → unique index on pre-existing "${idx.table}" with no preflight`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('the four known offenders now carry a preflight', () => {
    const fixed: Record<string, string> = {
      '20260719120000_track_a_hardening': 'showcase_views',
      '20260709140000_paper_list_metadata': 'papers',
      '20260713100000_plot_cell_unique': 'team_shop_buildings',
      '20260701040000_discovery_v2_citation_manager': 'discovery_nodes',
    }
    for (const [dir, table] of Object.entries(fixed)) {
      const sql = sqlOf(dir)
      const idx = uniqueIndexesIn(dir, sql).find((i) => i.table === table)
      expect(idx, `${dir} should still create a unique index on ${table}`).toBeDefined()
      expect(hasPreflight(sql, table, idx!.offset), `${dir} lost its preflight`).toBe(true)
    }
  })

  it('rejects a backfill-only migration — the false pass this guard originally had', () => {
    // Verbatim shape of `track_a_hardening` before the P1-S14 fix: a column
    // backfill and nothing else. A guard that only looked for "some write to
    // the table" passed this, which made it worthless.
    const backfillOnly = `
      ALTER TABLE "showcase_views" ADD COLUMN "day" DATE;
      UPDATE "showcase_views" SET "day" = "viewed_at"::date WHERE "day" IS NULL;
      CREATE UNIQUE INDEX "x" ON "showcase_views"("showcase_id","day");`
    const at = backfillOnly.indexOf('CREATE UNIQUE INDEX')
    expect(hasPreflight(backfillOnly, 'showcase_views', at)).toBe(false)
  })

  it('accepts both dedupe idioms in use, and only before the index', () => {
    const ranked = `DELETE FROM "t" x USING (SELECT id, row_number() OVER (PARTITION BY k) rn FROM "t") r WHERE x.id=r.id AND r.rn>1;
      CREATE UNIQUE INDEX "i" ON "t"("k");`
    const selfJoin = `DELETE FROM "t" dup USING "t" keep WHERE dup.k = keep.k AND dup.id > keep.id;
      CREATE UNIQUE INDEX "i" ON "t"("k");`
    for (const sql of [ranked, selfJoin]) {
      expect(hasPreflight(sql, 't', sql.indexOf('CREATE UNIQUE INDEX'))).toBe(true)
    }
    // A dedupe placed AFTER the index does not save the deploy — the CREATE
    // has already aborted by then.
    const tooLate = `CREATE UNIQUE INDEX "i" ON "t"("k");
      DELETE FROM "t" dup USING "t" keep WHERE dup.k = keep.k AND dup.id > keep.id;`
    expect(hasPreflight(tooLate, 't', tooLate.indexOf('CREATE UNIQUE INDEX'))).toBe(false)
  })

  it('every exemption names a reason rather than just a directory', () => {
    for (const [dir, reason] of Object.entries(EXEMPT)) {
      expect(dirs, `${dir} is exempted but does not exist`).toContain(dir)
      expect(reason.length).toBeGreaterThan(40)
    }
  })

  it('no exemption is stale — each still adds a unique index to a pre-existing table', () => {
    for (const dir of Object.keys(EXEMPT)) {
      expect(uniqueIndexesIn(dir, sqlOf(dir)).length, `${dir} no longer needs its exemption`)
        .toBeGreaterThan(0)
    }
  })
})
