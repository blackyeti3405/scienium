import { randomInt } from 'crypto'

/**
 * Team join codes (Feature 1b). A lead mints a single-use `TeamInvite` code; a
 * new student redeems it via POST /api/team/join, which enforces Team.maxMembers.
 */

// Unambiguous alphabet — no 0/O/1/I/L to avoid copy/paste confusion when shared.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Default lifetime of a freshly-minted invite code. */
export const INVITE_TTL_DAYS = 7

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
