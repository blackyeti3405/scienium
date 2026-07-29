// Backfill `datasets` from the retired `experiments`/`measurements` pair —
//   node --env-file=.env.local scripts/backfill-datasets-from-experiments.mjs
//
// ## Node version / TS imports
//
// This script imports the pure conversion helpers straight from TypeScript
// source. Native Node only strips `.ts` types on Node >=22.18 / >=23.6; on the
// declared floor (`node >=20`) the import throws ERR_UNKNOWN_FILE_EXTENSION at
// load. On an older Node run it through tsx (resolves `.ts` on any Node >=18):
//   pnpm --filter web exec tsx scripts/backfill-datasets-from-experiments.mjs
// The import is wrapped so an operator on too-old a Node gets that actionable
// message and a clean exit, never a raw stack trace.
//
// ## Order of operations (production)
//
// This MUST run BEFORE the `drop_experiments` migration: it reads the old
// tables and writes each experiment out as a 4-column XY dataset. Once the
// tables are dropped there is nothing left to convert. (The drop migration now
// self-guards: it refuses to run until every experiment is backfilled.)
// Idempotent, so a re-run (e.g. after a partial failure) converts only what is
// still missing.
//
// ## Why raw SQL for the reads
//
// The drop migration removes `Experiment`/`Measurement` from the Prisma schema,
// so `db.experiment` no longer exists on the generated client. Reading the old
// rows through `$queryRaw` keeps this script working against the client that
// ships WITH the drop — the same client used to run it in production.
//
// The conversion itself is the pure, unit-tested `experimentToDataset`
// (lib/data-terminal/backfill.ts); this file is just the I/O around it.
//
// Run with `--dry` to print what would be written without writing anything.
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

// The conversion + caps live in TypeScript. Import them dynamically so a Node
// too old to strip `.ts` types fails with an actionable message instead of a
// raw ERR_UNKNOWN_FILE_EXTENSION stack trace at module load.
async function loadHelpers() {
  try {
    const [backfill, dataset] = await Promise.all([
      import('../lib/data-terminal/backfill.ts'),
      import('../lib/data-terminal/dataset.ts'),
    ])
    return { ...backfill, ...dataset }
  } catch (err) {
    if (err?.code === 'ERR_UNKNOWN_FILE_EXTENSION' || err?.code === 'ERR_UNKNOWN_MODULE_FORMAT') {
      console.error(
        `This script imports TypeScript and needs Node >=22.18 for native .ts support ` +
          `(you are on ${process.version}). Run it through tsx instead:\n` +
          `  pnpm --filter web exec tsx scripts/backfill-datasets-from-experiments.mjs`,
      )
      process.exit(1)
    }
    throw err
  }
}

/**
 * Why this experiment cannot become a dataset, or null if it can. Only the
 * per-DATASET STRUCTURAL caps (row/column/byte) are checked — the caller aborts
 * loudly on a violation rather than skipping, so no data is ever dropped
 * silently. In practice nothing here can trip: the old MAX_POINTS_PER_EXPERIMENT
 * (2000) is under the 5000-row cap, so this is defense-in-depth.
 */
function structuralCapReason(shape, h) {
  if (shape.rows.length > h.MAX_ROWS_PER_DATASET) {
    return `${shape.rows.length} rows over the ${h.MAX_ROWS_PER_DATASET} cap`
  }
  if (shape.columns.length > h.MAX_COLUMNS_PER_DATASET) {
    return `${shape.columns.length} columns over the ${h.MAX_COLUMNS_PER_DATASET} cap`
  }
  const bytes = h.datasetByteSize({ columns: shape.columns, rows: shape.rows })
  if (bytes > h.MAX_DATASET_BYTES) return `${bytes} bytes over the ${h.MAX_DATASET_BYTES} cap`
  return null
}

async function main() {
  const dry = process.argv.includes('--dry')
  const h = await loadHelpers()
  const { experimentToDataset, needsBackfill, backfillMarker } = h
  const db = new PrismaClient()
  try {
    // The drop migration removes `experiments`. A re-run after the drop (or on a
    // DB that never had it) is a clean no-op, not a P2010 crash — the script's
    // idempotency promise. to_regclass mirrors the drop migration's own guard.
    const [{ present }] = await db.$queryRaw`
      SELECT to_regclass('public.experiments') IS NOT NULL AS present`
    if (!present) {
      console.log('The `experiments` table is gone (drop migration already applied) — nothing to backfill.')
      return
    }

    const experiments = await db.$queryRaw`
      SELECT id, team_id, title, description, x_label, y_label, created_by_user_id, created_at
      FROM "experiments" ORDER BY created_at ASC`

    if (experiments.length === 0) {
      console.log('No experiments found — nothing to backfill.')
      return
    }

    // ponytail: the once-ever idempotency marker rides in `datasets.source_filename`
    // (`backfill:exp:<id>`) rather than a dedicated column — a one-shot backfill
    // does not earn a schema change, and source_filename is unused by a
    // hand-typed dataset. Load every marker up front so a re-run is a set lookup.
    const seen = await db.$queryRaw`
      SELECT source_filename FROM "datasets" WHERE source_filename LIKE 'backfill:exp:%'`
    const markers = new Set(seen.map((r) => r.source_filename))

    let migrated = 0
    let alreadyPresent = 0

    for (const exp of experiments) {
      if (!needsBackfill(markers, exp.id)) {
        alreadyPresent += 1
        continue
      }

      const measurements = await db.$queryRaw`
        SELECT series, x, y, note FROM "measurements"
        WHERE experiment_id = ${exp.id} ORDER BY recorded_at ASC`

      const shape = experimentToDataset(
        {
          id: exp.id,
          title: exp.title,
          description: exp.description,
          xLabel: exp.x_label,
          yLabel: exp.y_label,
        },
        measurements.map((m) => ({
          series: m.series,
          x: Number(m.x),
          y: Number(m.y),
          note: m.note,
        })),
      )

      // ponytail: backfill bypasses the per-team dataset COUNT cap
      // (MAX_DATASETS_PER_TEAM = 50) — that cap is a create-route policy for NEW
      // user writes, not a storage invariant. This is a one-time migration of
      // pre-existing data (the old model allowed 200 experiments/team) and must
      // migrate ALL of it; the create route still enforces 50 going forward.
      // The per-DATASET structural caps below stay as guards, and a violation
      // ABORTS rather than skips — skipping would drop data silently.
      const reason = structuralCapReason(shape, h)
      if (reason) {
        console.error(
          `FATAL: experiment ${exp.id} ("${shape.name}") exceeds a per-dataset cap: ` +
            `${reason}. Aborting so no experiment is dropped silently.`,
        )
        process.exit(1)
      }

      if (dry) {
        console.log(`  would migrate exp ${exp.id} → "${shape.name}" (${shape.rows.length} rows)`)
      } else {
        await db.dataset.create({
          data: {
            teamId: exp.team_id,
            name: shape.name,
            tableType: 'xy',
            columns: shape.columns,
            rows: shape.rows,
            rowCount: shape.rows.length,
            createdByUserId: exp.created_by_user_id,
            sourceFilename: backfillMarker(exp.id),
            // Preserve the experiment's original timestamp: without this the
            // dataset defaults to backfill run-time, spiking Momentum (all
            // history counted as this-week) and destroying chronology
            // (teamId+createdAt index, teacher updatedAt ordering). updatedAt is
            // @updatedAt and left to auto-set.
            createdAt: new Date(exp.created_at),
          },
        })
      }

      markers.add(backfillMarker(exp.id))
      migrated += 1
    }

    console.log(
      `\nBackfill ${dry ? '(dry run) ' : ''}complete: migrated ${migrated}, ` +
        `${alreadyPresent} already present.`,
    )
  } finally {
    await db.$disconnect()
  }
}

await main()
