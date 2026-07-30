import 'server-only'
import { db } from '@/lib/db'
import { ISEF_EDITION } from '@/lib/fairs/forms'

/**
 * DB side of the ISEF forms catalog (Feature 3c). The catalog itself lives in
 * `forms.ts`, which stays client-safe; this module owns the lazy seeder so the
 * Prisma client never rides into a browser bundle.
 *
 * Rows exist only to give `TeamFormStatus` a stable id to hang a checkbox on —
 * every string a student reads comes from the authored edition at request time
 * (see `app/api/fairs/forms/route.ts`). Rows for retired codes are left in place
 * so historical `TeamFormStatus` FKs stay valid; the route filters them out.
 *
 * Seeding is keyed on **code coverage, not row count** (REFACTOR2 P1-R16): a
 * count-based fast path silently suppresses a same-size edition change, which is
 * exactly how the wrong 2026 catalog would have survived this correction.
 */
export async function ensureFormsSeeded(): Promise<void> {
  const codes = ISEF_EDITION.forms.map((f) => f.code)
  const existing = await db.formsCatalog.findMany({
    where: { formCode: { in: codes } },
    select: { formCode: true },
  })
  if (existing.length === codes.length) return

  const have = new Set(existing.map((f) => f.formCode))
  await db.formsCatalog.createMany({
    data: ISEF_EDITION.forms
      .filter((f) => !have.has(f.code))
      .map((f) => ({
        formCode: f.code,
        name: f.name,
        description: `Official ISEF ${ISEF_EDITION.season} form.`,
        templateUrl: ISEF_EDITION.formsUrl,
        requiredForLevelsJson: [],
      })),
    // Race-safe against a concurrent seeder via the unique index on form_code.
    skipDuplicates: true,
  })
}
