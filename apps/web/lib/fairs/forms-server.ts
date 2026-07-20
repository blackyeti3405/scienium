import 'server-only'
import { db } from '@/lib/db'
import { ISEF_FORMS, FORMS_PAGE } from '@/lib/fairs/forms'

/**
 * DB side of the ISEF forms catalog (Feature 3c). The catalog/guides themselves
 * live in `forms.ts`, which stays client-safe; this module owns the lazy seeder
 * so the Prisma client never rides into a browser bundle.
 *
 * Rows are keyed on `formCode` (unique), so re-seeding is idempotent.
 */
export async function ensureFormsSeeded(): Promise<void> {
  const count = await db.formsCatalog.count()
  if (count >= ISEF_FORMS.length) return

  // Batched top-up (one read + one write), mirroring lib/fairs/match.ts —
  // never a per-form find/create loop. `skipDuplicates` on the unique
  // `formCode` makes a concurrent seeding stampede race-safe.
  const existing = await db.formsCatalog.findMany({
    where: { formCode: { in: ISEF_FORMS.map((f) => f.code) } },
    select: { formCode: true },
  })
  const have = new Set(existing.map((f) => f.formCode))
  const missing = ISEF_FORMS.filter((f) => !have.has(f.code))
  if (missing.length === 0) return

  await db.formsCatalog.createMany({
    data: missing.map((f) => ({
      formCode: f.code,
      name: f.name,
      description: f.description,
      templateUrl: FORMS_PAGE,
      requiredForLevelsJson: f.requiredFor,
    })),
    skipDuplicates: true,
  })
}
