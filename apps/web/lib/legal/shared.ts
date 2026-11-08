/**
 * Shared identity constants for the legal documents (`privacy.ts`, `terms.ts`).
 *
 * scienium is operated by an individual, not a company — both documents are
 * written in the first person singular for that reason ("I, Rig Saini"), with
 * "we/us/our" defined as referring to that one person so the rest of the prose
 * reads normally. **If an LLC is ever formed, changing `entity` here is not
 * enough**: the sole-proprietor phrasing in the opening paragraph of each
 * document, ToS §15/§20/§21, and Privacy §9 all name a person and would need to
 * name the entity instead.
 *
 * `docs/legal/REVIEW-NOTES.md` records what an attorney still has to decide.
 */

/**
 * Resolve the published postal address from the environment.
 *
 * Deliberately does NOT throw when unset. `LEGAL` is built at module load, and
 * `privacy.ts` / `terms.ts` interpolate it into top-level template literals, so
 * a throw here would take down `/privacy`, `/terms`, and all three onboarding
 * routes (which import `consent.ts`) rather than degrading one line of one
 * document. Instead it returns a placeholder that is impossible to mistake for
 * an address, and says so loudly in the server log in production.
 */
function postalAddress(): string {
  const fromEnv = process.env.LEGAL_CONTACT_ADDRESS?.trim()
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'LEGAL_CONTACT_ADDRESS is not set — /privacy and /terms are serving a ' +
        'placeholder in place of the postal address CalOPPA requires. Set it in ' +
        'the deployment environment.',
    )
  }
  return '[postal address not configured — set LEGAL_CONTACT_ADDRESS]'
}

export const LEGAL = {
  /** The operator. An individual today — see the note above before changing it. */
  entity: 'Rig Saini',
  /** Product name as used in prose. */
  product: 'scienium',
  site: 'https://scienium.app',
  /** One monitored mailbox. Do not list an address nobody reads. */
  contactEmail: 'hello@scienium.app',
  /**
   * Postal address, required by CalOPPA and the COPPA direct-notice rules.
   *
   * NOT hardcoded: the operator's address of record is a residence, and this
   * source is published for outside review. It comes from
   * `LEGAL_CONTACT_ADDRESS` in the deployment environment — see `.env.example`
   * and `docs/runbooks/production-launch.md`.
   */
  address: postalAddress(),
  /** US state whose law governs, and whose courts hear disputes. */
  governingState: 'California',
  governingCounty: 'Santa Clara',
  effectiveDate: 'August 6, 2026',
  version: '1.0',
  /** Minimum self-signup age. Under this, only through a consenting school. */
  minimumAge: 13,
  /** Business days we target for a rights request; also stated in the runbook. */
  requestResponseDays: 30,
} as const
