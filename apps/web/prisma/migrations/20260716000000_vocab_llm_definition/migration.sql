-- Vocabulary Builder: cards whose definition is written at build time by
-- lib/literature/vocab-curate.ts, grounded in the paper's own sentence (which
-- is retained verbatim in `quote`). Previously such terms were stored as
-- `paper_context` with no definition at all.
--
-- Additive only: existing rows keep their source. Safe to run against a live
-- database — PostgreSQL 12+ permits ADD VALUE inside a transaction so long as
-- the new value is not used in the same transaction, which it is not.
ALTER TYPE "vocab_source" ADD VALUE IF NOT EXISTS 'llm_definition';
