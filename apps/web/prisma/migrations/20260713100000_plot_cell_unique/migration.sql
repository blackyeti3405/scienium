-- One building per plot cell (SEC-DB), the durable backstop behind the
-- service-layer advisory lock.
--
-- REFACTOR2 P1-S14 correction: this migration created the unique index against
-- a pre-existing table with no preflight at all. Placement was unconstrained
-- before it, so two buildings sharing a cell is exactly what the old code
-- permitted — and one such pair aborts the CREATE UNIQUE INDEX and the deploy.
--
-- QUARANTINE rather than delete: the row is a purchased building the team paid
-- KP for. `pos_x`/`pos_y` are nullable and a NULL position already means
-- "owned but not yet placed" (the plot lets the team drop it anywhere free),
-- and Postgres treats NULLs as distinct in a unique index. So the earliest
-- purchase keeps the cell and any later occupant is handed back unplaced,
-- losing a position rather than a building.
UPDATE "team_shop_buildings" b
SET "pos_x" = NULL, "pos_y" = NULL
FROM (
  SELECT id,
         row_number() OVER (
           PARTITION BY "team_id", "pos_x", "pos_y"
           ORDER BY "purchased_at", "id"
         ) AS rn
  FROM "team_shop_buildings"
  WHERE "pos_x" IS NOT NULL AND "pos_y" IS NOT NULL
) ranked
WHERE b.id = ranked.id
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "team_shop_buildings_team_id_pos_x_pos_y_key" ON "team_shop_buildings"("team_id", "pos_x", "pos_y");
