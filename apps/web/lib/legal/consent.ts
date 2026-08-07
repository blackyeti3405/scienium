import 'server-only'
import { z } from 'zod'
import { db } from '@/lib/db'
import { LEGAL } from './shared'

/**
 * Terms of Service + Privacy Policy acceptance at account creation.
 *
 * Three routes create a scienium `User` row from a form the person filled in —
 * `/api/onboarding` (create a lab), `/api/team/join` (join a lab), and
 * `/api/onboarding/teacher` — and each one is a place an agreement is formed.
 * They have separate request schemas, so the gate is shared as a fragment
 * rather than a wrapper; `test/legal-consent.test.ts` fails if a route drops it.
 *
 * The fourth `user.create` in the codebase (`lib/teacher/auth.ts`) is NOT gated
 * here on purpose: it backfills a row for a teacher whose role came from a Clerk
 * claim, with no form and no human in the loop. There is nothing to consent to
 * at that moment, and refusing the request would lock the teacher out rather
 * than collect an agreement.
 */

/**
 * Merge into a route's `z.object({...})`. A missing or `false` value is a 400
 * with this message, which the onboarding form surfaces verbatim.
 *
 * `.refine` rather than `z.literal(true)`: zod reports a literal mismatch as
 * `invalid_literal`, which `invalid_type_error` does not cover, so the custom
 * message would be lost on exactly the input this exists to reject.
 */
export const legalConsentShape = {
  acceptedLegal: z
    .boolean()
    .refine((v) => v === true, 'You must accept the Terms of Service and Privacy Policy'),
}

/**
 * Stamp acceptance, once. The `legalAcceptedAt: null` filter is the whole point:
 * onboarding routes are deliberately idempotent and re-submit freely, and an
 * unconditional write would keep moving the recorded date forward until it no
 * longer evidenced the moment the person actually agreed.
 *
 * The version comes from `LEGAL.version` server-side — a client-supplied version
 * would let the record claim agreement to documents that were never displayed.
 */
export async function recordLegalAcceptance(userId: string): Promise<void> {
  await db.user.updateMany({
    where: { id: userId, legalAcceptedAt: null },
    data: { legalAcceptedAt: new Date(), legalVersion: LEGAL.version },
  })
}
