# Runbook: Database restore and migration forward-fix

_Pilot-minimum procedure (PILOT-6)._

## Backups

Production Postgres is **Supabase**. Backups are Supabase-managed:

- Dashboard → Database → Backups. Free tier: daily backups, limited retention; verify the current plan's retention **before** the pilot starts and take a manual backup the day before.
- Manual snapshot any time (run locally against the **session** pooler, port 5432):

  ```bash
  pg_dump "$DIRECT_URL" --format=custom --file=scienium-$(date +%Y%m%d).dump
  ```

  Store the dump privately (it contains student names/emails — treat as PII; do not commit or upload).

## Restore

1. Announce downtime (the app has no maintenance mode; a Vercel rollback to a "closed" state is not available — just tell the class).
2. Restore in Supabase (Dashboard → Backups → Restore), or from a manual dump into a fresh database:

   ```bash
   pg_restore --clean --if-exists --no-owner --dbname "$DIRECT_URL" scienium-YYYYMMDD.dump
   ```

3. Verify: sign in as a teacher, open the roster; sign in as a student, open the lab. Check Vercel logs for `P2021`/`P2022` (missing table/column = schema drift, see below).
4. Anything created after the backup point is gone — tell affected teams; papers can be re-uploaded (reprocessing re-runs automatically via the upload flow).

## Migrations (the project convention)

`prisma migrate dev` is **blocked** in this repo (guard hook). The flow is:

```bash
# generate SQL for schema changes (shadow diff against the session pooler)
pnpm --filter web exec prisma migrate diff --script ...   # see memory/docs; writes migrations/<ts>_<name>/migration.sql
# apply committed migrations
DIRECT_URL=... pnpm --filter web exec prisma migrate deploy
```

## Forward-fix for a bad migration

Never roll a deployed migration back; fix forward:

1. Vercel → instant rollback the **app** to the previous deployment (old code must tolerate the new schema — migrations here are kept additive; see AGENTS.md house rules).
2. Write a new migration that corrects the schema (again additive where possible).
3. `prisma migrate deploy` against `DIRECT_URL`, then redeploy the app.
4. If a migration is recorded as failed in `_prisma_migrations`, resolve it explicitly:

   ```bash
   pnpm --filter web exec prisma migrate resolve --applied <migration_name>   # or --rolled-back
   ```

## Dev/E2E database

Dev + E2E run on local Docker Postgres (`scienium-postgres`, port 5433) and are disposable: recreate with `pnpm --filter web seed:e2e` (idempotent). Never point E2E at production; the wipe risk documented in project memory came from mixing them.
