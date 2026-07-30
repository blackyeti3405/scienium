-- ONE TEAM AT A TIME, enforced by the database (REFACTOR2 §0.7).
--
-- `team_members` was PRIMARY KEY (user_id, team_id), which permits a user to
-- hold two live memberships. The application has not written that state since
-- v0.48.0 (`leaveOtherTeams` runs inside the join transaction), and four call
-- sites are written against the rule — `pickActiveTeam`, the teacher roster,
-- teacher analytics, and `lib/teacher/student-overview.ts`, whose §0.7 defect
-- was precisely a team and a role read from two DIFFERENT membership rows.
--
-- PREFLIGHT FIRST (P1-S14). The unique index below aborts the whole deploy if
-- production holds one duplicate, and "the old code never wrote that" is an
-- assumption about code, not a property of the data — the exact reasoning that
-- let this defect land four times before. So the surplus rows are removed
-- first, using the SAME selection rule the application already applies.

-- 1. Keep one membership per user: the one `users.active_team_id` points at if
--    a row backs it, else the most recently joined. That is `pickActiveTeam`
--    (lib/team/active-team.ts) expressed in SQL — the surviving row is the one
--    the app already treats as authoritative, so this deletes only rows that
--    were already invisible to every read path. `team_id` breaks a joined_at
--    tie so the result is deterministic.
DELETE FROM "team_members" tm
USING (
  SELECT
    user_id,
    team_id,
    ROW_NUMBER() OVER (
      PARTITION BY m.user_id
      ORDER BY (m.team_id = u.active_team_id) DESC, m.joined_at DESC, m.team_id DESC
    ) AS rank
  FROM "team_members" m
  LEFT JOIN "users" u ON u.id = m.user_id
) ranked
WHERE tm.user_id = ranked.user_id
  AND tm.team_id = ranked.team_id
  AND ranked.rank > 1;

-- 2. Repair any lead pointer the delete stranded. `teams.team_lead_id` is NOT
--    NULL, so a team whose lead just lost its membership would otherwise be led
--    by a non-member. Hand it to the earliest remaining member, matching
--    `leaveTeam`'s succession rule (lib/team/membership.ts).
UPDATE "teams" t
SET "team_lead_id" = (
  SELECT m.user_id FROM "team_members" m
  WHERE m.team_id = t.id ORDER BY m.joined_at ASC, m.user_id ASC LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 FROM "team_members" m WHERE m.team_id = t.id AND m.user_id = t."team_lead_id"
)
AND EXISTS (SELECT 1 FROM "team_members" m WHERE m.team_id = t.id);

-- 3. NOT DONE, deliberately: archiving teams this delete emptied.
--    The obvious next step is `UPDATE teams SET archived_at = NOW()` for teams
--    with no members left, matching `leaveTeam`. It is omitted because the
--    predicate cannot distinguish a team THIS migration emptied from one that
--    was already empty — and this database has 11 pre-existing member-less,
--    unarchived teams. Running it archived all 11, which is a behaviour change
--    to rows that have nothing to do with the constraint being added. A
--    migration's job here is to make the index safe, not to retro-apply an
--    archival policy to historical data. An emptied team is left in exactly the
--    state those 11 are already in.

-- 4. Now the constraint can be created safely.
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");
