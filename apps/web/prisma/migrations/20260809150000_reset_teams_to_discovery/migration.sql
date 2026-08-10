-- ONE-TIME reset of every existing team back to the start of the arc.
--
-- Two things changed under these rows and neither can be inferred per-team:
--
--   1. Until now `POST /api/onboarding` created every team directly in
--      `literature_review`, skipping DISCOVERY. No team's phase reflects work it
--      actually did, so there is nothing to preserve.
--   2. Gateways used to render from a hardcoded cell whether or not the team had
--      placed them (`unlockPhase` was enforced nowhere). Placement is now real
--      state, and existing teams have NO placement rows — without the backfill
--      below their plots would come up empty.
--
-- WHAT THIS TOUCHES: `teams.phase`, `teams.phase_entered_at`, and gateway
-- placements. Nothing else.
--
-- WHAT IT DELIBERATELY DOES NOT TOUCH: papers, paper proficiency, KP/clearance/LC
-- balances, purchased economy buildings and their levels/positions, logs,
-- showcases, class membership. A student who has read 20 sources still has them;
-- they walk the phase arc again, and the gates re-open as they re-clear them.
--
-- Safe to apply to an empty database (all three statements no-op on zero rows).

-- 1. Every team returns to DISCOVERY, with the phase clock restarted so pacing
--    analytics do not report a phase entered months ago.
UPDATE "teams"
SET "phase" = 'discovery'::"project_phase",
    "phase_entered_at" = now();

-- 2. Drop every existing gateway placement. Some are real repositionings the
--    student chose, but a saved position for a gateway they no longer have
--    unlocked would put a locked building back on the plot.
DELETE FROM "team_gateway_placements";

-- 3. Stand the three DISCOVERY gateways on every team's plot, at the default
--    cells from lib/gateways.ts. Keep in sync with STARTING_GATEWAYS there:
--    discovery (0,0), science_fair (1,-1), operations_hub (1,1).
--    `id` is a Prisma-side cuid() default, so raw SQL has to supply one.
INSERT INTO "team_gateway_placements" ("id", "team_id", "gateway_key", "pos_x", "pos_y", "updated_at")
SELECT gen_random_uuid()::text, t."id", g."key", g."gx", g."gy", now()
FROM "teams" t
CROSS JOIN (VALUES
  ('discovery', 0, 0),
  ('science_fair', 1, -1),
  ('operations_hub', 1, 1)
) AS g("key", "gx", "gy");
