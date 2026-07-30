-- REFACTOR2 P2-S4 — the vocabulary deck's uniqueness is widened from
-- (user_id, term_key) to (user_id, team_id, term_key).
--
-- Every other vocabulary surface (deck GET, review, delete, the daily KP
-- ledger) is already scoped to (user, team); only this key was global per
-- student. The consequence was silent: a student in a second lab had their
-- deck build filtered against cards they could not see, `skipDuplicates`
-- swallowed the insert, and the term appeared in neither lab.
--
-- P1-S14 preflight: NONE IS NEEDED, and this is the same case as
-- 20260708182000_codex_team_scoping. The new key is strictly WIDER than the
-- one it replaces — every pair (user_id, term_key) the old unique permitted is
-- distinct, so no triple (user_id, team_id, term_key) built from those rows
-- can collide. There is no historical duplicate for a dedupe to remove.
-- Recorded as an exemption with this reason in
-- test/migration-unique-index-policy.test.ts.

DROP INDEX "vocab_cards_user_id_term_key_key";

CREATE UNIQUE INDEX "vocab_cards_user_id_team_id_term_key_key" ON "vocab_cards"("user_id", "team_id", "term_key");
