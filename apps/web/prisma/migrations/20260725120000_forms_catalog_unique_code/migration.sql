-- REFACTOR2 P2-S5: `ensureFormsSeeded` has always claimed `form_code` is unique
-- (its `skipDuplicates` stampede guard depends on it) but no index existed, so a
-- concurrent seed could duplicate a row.
--
-- P1-S14's lesson applies here: never add a unique index without first removing
-- the rows the old schema permitted. Dedupe keeps the LOWEST id per code so
-- existing `team_form_status.form_id` references stay valid where possible.

-- The keeper row for each code.
CREATE TEMP TABLE forms_catalog_keep AS
SELECT "form_code", MIN("id") AS keep_id
FROM "forms_catalog"
GROUP BY "form_code";

-- `team_form_status` is unique on (team_id, form_id): drop a duplicate-form
-- status row when that team already tracks the keeper, otherwise repoint it.
DELETE FROM "team_form_status" s
USING "forms_catalog" dup, forms_catalog_keep k
WHERE s."form_id" = dup."id"
  AND dup."form_code" = k."form_code"
  AND dup."id" <> k.keep_id
  AND EXISTS (
    SELECT 1 FROM "team_form_status" t
    WHERE t."team_id" = s."team_id" AND t."form_id" = k.keep_id
  );

UPDATE "team_form_status" s
SET "form_id" = k.keep_id
FROM "forms_catalog" dup, forms_catalog_keep k
WHERE s."form_id" = dup."id"
  AND dup."form_code" = k."form_code"
  AND dup."id" <> k.keep_id;

DELETE FROM "forms_catalog" dup
USING forms_catalog_keep k
WHERE dup."form_code" = k."form_code" AND dup."id" <> k.keep_id;

DROP TABLE forms_catalog_keep;

CREATE UNIQUE INDEX "forms_catalog_form_code_key" ON "forms_catalog"("form_code");
