import { randomInt } from 'crypto'

/**
 * Team join codes (Feature 1b). A lead mints a single-use `TeamInvite` code; a
 * new student redeems it via POST /api/team/join, which enforces Team.maxMembers.
 */

// Unambiguous alphabet — no 0/O/1/I/L to avoid copy/paste confusion when shared.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Default lifetime of a freshly-minted invite code. */
export const INVITE_TTL_DAYS = 7

/**
 * Lifetime of a classroom join code (SEC2-003). Long enough for a whole class
 * to enroll over a few weeks of onboarding; short enough that a code shared
 * outside the room dies on its own. Teachers regenerate to revoke early — and
 * regeneration is also how an expired code is renewed.
 */
export const CLASS_JOIN_CODE_TTL_DAYS = 30

/** Expiry timestamp for a class join code minted right now. */
export function classJoinCodeExpiry(now = new Date()): Date {
  return new Date(now.getTime() + CLASS_JOIN_CODE_TTL_DAYS * 24 * 60 * 60 * 1000)
}

/** A short, human-shareable join code (e.g. "K7M9QP"). */
export function generateInviteCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code
}

/** Normalize user-entered codes (trim + uppercase) before lookup. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase()
}
