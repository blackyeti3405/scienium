-- Enable Row Level Security on every table in `public`, with NO policies.
--
-- ## Why this is safe, and what it actually protects
--
-- scienium NEVER uses Supabase's Data API. There is no `@supabase/supabase-js`
-- anywhere in the app: every query goes through Prisma over a direct Postgres
-- connection. But Supabase auto-generates a PostgREST endpoint over `public`
-- anyway, reachable with the ANON key — which is publishable by design and must
-- be assumed known. Without RLS, that endpoint will happily serve every student
-- row in the database to anyone who has it.
--
-- Enabling RLS with no policies closes that door completely: PostgREST connects
-- as `anon`/`authenticated`, neither of which is the table owner, so with no
-- policy to permit a row, none are visible.
--
-- ## Why it does not break the app
--
-- A table's OWNER is exempt from its own RLS unless the table is additionally
-- marked FORCE ROW LEVEL SECURITY. Prisma connects as the owner (`postgres` on
-- Supabase, `scienium` locally), so every app query is unaffected — same rows,
-- same plans, no policy evaluation.
--
--   *** DO NOT ADD `FORCE ROW LEVEL SECURITY`. ***
--
-- FORCE subjects the owner to RLS too, and with zero policies that means the
-- application reads nothing at all. It would look exactly like total data loss.
--
-- ## This is defence in depth, not the security model
--
-- Tenant isolation is enforced in the application layer — `requireTeamContext`
-- scopes every query to the caller's team (see docs/SECURITY.md). RLS here is a
-- second lock on a door the app does not use, so that a Supabase-side default
-- cannot quietly expose the pilot's student data.
--
-- New tables do NOT inherit this. `pnpm --filter web verify:rls` fails on any
-- table in `public` without RLS, so a future migration that adds one gets caught.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
  END LOOP;
END
$$;
