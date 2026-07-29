-- Showcase attachment (Data Terminal revamp, phase F) — a team can attach an
-- exported Data Terminal figure (chart/analysis PNG) to their showcase. It is a
-- new optional, single-slot asset type served through the same private-R2 image
-- pipeline as the board and quad chart.
--
-- Additive only: existing rows keep their asset type. Safe to run against a live
-- database — PostgreSQL 12+ permits ADD VALUE inside a transaction so long as the
-- new value is not used in the same transaction, which it is not.
ALTER TYPE "asset_type" ADD VALUE IF NOT EXISTS 'figure';
