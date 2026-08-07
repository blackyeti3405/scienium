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
export const LEGAL = {
  /** The operator. An individual today — see the note above before changing it. */
  entity: 'Rig Saini',
  /** Product name as used in prose. */
  product: 'scienium',
  site: 'https://scienium.app',
  /** One monitored mailbox. Do not list an address nobody reads. */
  contactEmail: 'hello@scienium.app',
  /** Postal address is required by CalOPPA and the COPPA direct-notice rules. */
  address: '[address redacted]',
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
