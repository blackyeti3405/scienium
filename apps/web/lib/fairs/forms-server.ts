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

  for (const f of ISEF_FORMS) {
    const existing = await db.formsCatalog.findFirst({ where: { formCode: f.code } })
    if (!existing) {
      await db.formsCatalog.create({
        data: {
          formCode: f.code,
          name: f.name,
          description: f.description,
          templateUrl: FORMS_PAGE,
          requiredForLevelsJson: f.requiredFor,
        },
      })
    }
  }
}
