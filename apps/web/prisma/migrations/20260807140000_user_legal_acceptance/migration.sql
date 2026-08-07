-- Terms of Service + Privacy Policy acceptance, recorded at onboarding.
--
-- Hand-written rather than generated: the working tree carries an unrelated
-- in-flight schema change (the ProjectPhase collapse), and `migrate diff` would
-- have swept it into this migration.
--
-- Both columns are nullable with no default and no backfill ON PURPOSE. Rows
-- created before this gate existed did not accept anything, and stamping them
-- with a timestamp would manufacture consent that never happened. NULL is the
-- honest value, and it is what a "who has not accepted the current version"
-- query needs to be able to find.
ALTER TABLE "users" ADD COLUMN "legal_accepted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "legal_version" TEXT;
