/**
 * ISEF required-forms catalog (Feature 3c).
 *
 * SAFETY-CRITICAL CONTENT. This module used to ship an authored guide that
 * asserted which form is which and when each one is filled in. The 2026-07-23
 * audit (REFACTOR2.MD P0-R4) proved that mapping materially wrong: it named
 * Form 1 the Student Checklist, Form 1A the adult-sponsor approval, Form 1B an
 * off-campus-only form, and Form 1C the pre-approval research plan. Sending a
 * student into research on that guidance can miss a required approval or get a
 * project disqualified.
 *
 * The catalog below therefore carries ONLY what is directly verifiable from the
 * official forms page: the form codes and their official titles for one named
 * season. Applicability ("required for all projects", "only when you use
 * vertebrate animals") and timing ("before research", "after research") are
 * DELIBERATELY ABSENT until a qualified teacher / Scientific Review Committee
 * reviewer approves them and sets `reviewedBy` — see `ISEF_EDITION`. Until then
 * the UI must send students to the official rules, not to us.
 *
 * This module is pure authored data — CLIENT-SAFE by design (the fair checklist
 * imports it directly). The DB seeder lives in `forms-server.ts` so the Prisma
 * client can never ride into a browser bundle from here.
 */

export interface IsefFormDef {
  /** Official form code, e.g. `Form 1A`. */
  code: string
  /** Official title, verbatim from the season's forms page. */
  name: string
  /**
   * Who must file this form and when. `null` until a qualified reviewer signs
   * the edition off — the UI renders the official-rules pointer instead.
   */
  appliesTo: string | null
}

export interface IsefFormsEdition {
  /** Competition season these titles were taken from. */
  season: string
  /** Official forms index for this season. */
  formsUrl: string
  /** Official rules for this season (AI-use disclosure, applicability, timing). */
  rulesUrl: string
  /** Date the titles were read off `formsUrl` (ISO date). Provenance, not sign-off. */
  sourcedAt: string
  /**
   * ISO date after which this edition must be re-sourced before it is presented
   * as current. OPERATIONAL, not an ISEF-published date: it is the day the app
   * stops claiming these titles are this season's. Past it the guidance state is
   * `expired` and the app says so — the failure it exists to prevent is a pilot
   * running in a later school year on last season's form codes, with nothing on
   * screen admitting the catalog is old.
   */
  expiresAt: string
  /**
   * Name + role of the qualified teacher/SRC reviewer who approved the
   * applicability and timing copy. **Fail-closed gate:** while this is `null`,
   * the app presents no applicability or timing guidance of its own.
   */
  reviewedBy: string | null
  /** ISO date of that review. */
  reviewedAt: string | null
  /**
   * `guidanceDigest()` of the copy that reviewer actually signed. Binds the
   * sign-off to the exact strings: editing a form's applicability (or title)
   * after review changes the digest, the edition falls back to `stale_review`,
   * and the new copy is withheld until it is signed again. A `reviewedBy` with
   * no digest never passes — an edition cannot be marked reviewed by setting
   * one field.
   */
  reviewedDigest: string | null
  forms: IsefFormDef[]
}

/**
 * Active edition. A pilot running in the 2026-27 school year competes at ISEF
 * 2027, so the 2027 titles are the ones students will actually be handed.
 *
 * Note the official forms page still carries a legacy sentence ("Only Forms 1C,
 * 5B, 7, and the abstract are done after the research") that names a 2026 form
 * (1C) which does not exist in the 2027 set. That contradiction is exactly why
 * timing is not restated here.
 */
export const ISEF_EDITION: IsefFormsEdition = {
  season: '2027',
  formsUrl: 'https://www.societyforscience.org/isef/forms/',
  rulesUrl:
    'https://www.societyforscience.org/isef/international-rules/rules-and-guidelines/',
  sourcedAt: '2026-07-25',
  // The 2027 season's forms are superseded once the 2028 forms page goes up,
  // which historically lands over the summer. Re-source before this date.
  expiresAt: '2027-09-01',
  reviewedBy: null,
  reviewedAt: null,
  reviewedDigest: null,
  forms: [
    { code: 'Form 1', name: 'Checklist for Adult Sponsor/Safety Assessment Form', appliesTo: null },
    { code: 'Form 1A', name: 'Student Checklist/Research Plan', appliesTo: null },
    { code: 'Form 1B', name: 'Approval Form', appliesTo: null },
    { code: 'Form 2A', name: 'Student Support Disclosure Form', appliesTo: null },
    { code: 'Form 2B', name: 'Qualified Scientist Form', appliesTo: null },
    { code: 'Form 2C', name: 'Regulated Research Institution Form', appliesTo: null },
    { code: 'Form 3', name: 'Risk Assessment Form', appliesTo: null },
    { code: 'Form 4', name: 'Human Participants Form', appliesTo: null },
    {
      code: 'Form 5A',
      name: 'Vertebrate Animal Form (For research at school, home, or at a field site)',
      appliesTo: null,
    },
    {
      code: 'Form 5B',
      name: 'Vertebrate Animal Form (For research at a Regulated Research Institution)',
      appliesTo: null,
    },
    { code: 'Form 6A', name: 'Potentially Hazardous Biological Agents Form', appliesTo: null },
    { code: 'Form 6B', name: 'Human and Vertebrate Animal Tissue Form', appliesTo: null },
    { code: 'Form 7', name: 'Continuation Projects Form', appliesTo: null },
  ],
}

export const ISEF_FORMS: IsefFormDef[] = ISEF_EDITION.forms
export const FORMS_PAGE = ISEF_EDITION.formsUrl

/**
 * Why an edition's own guidance is or is not presentable.
 *
 * `reviewed` is the ONLY state in which the app speaks for itself about which
 * form a project needs; every other state falls back to the official rules
 * pointer. They are ordered by which fact a student most needs to know: a stale
 * catalog makes even the TITLES suspect, so expiry outranks review state.
 */
export type EditionGuidanceState = 'reviewed' | 'expired' | 'stale_review' | 'unreviewed'

/**
 * Fingerprint of the guidance-bearing copy — the codes, the official titles and
 * the applicability strings. Not a security hash (it is a 32-bit FNV-1a, and
 * this module is client-safe so it cannot reach for node:crypto): it exists so
 * an EDIT after sign-off cannot ride out on someone else's review. Collisions
 * are irrelevant here because the input is not adversarial — the thing being
 * caught is a well-meaning content edit, not a forgery.
 */
export function guidanceDigest(edition: IsefFormsEdition): string {
  const text = edition.forms
    .map((f) => `${f.code}|${f.name}|${f.appliesTo ?? ''}`)
    .join('~')
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Fail-closed classification of an edition. Never throws; unknown ⇒ withheld. */
export function editionGuidanceState(
  edition: IsefFormsEdition = ISEF_EDITION,
  now: Date = new Date(),
): EditionGuidanceState {
  const expiry = Date.parse(`${edition.expiresAt}T23:59:59Z`)
  if (!Number.isFinite(expiry) || expiry < now.getTime()) return 'expired'
  if (!edition.reviewedBy || !edition.reviewedAt || !edition.reviewedDigest) return 'unreviewed'
  if (edition.reviewedDigest !== guidanceDigest(edition)) return 'stale_review'
  return 'reviewed'
}

/** True once a qualified reviewer has approved this edition's guidance copy. */
export function isEditionReviewed(
  edition: IsefFormsEdition = ISEF_EDITION,
  now: Date = new Date(),
): boolean {
  return editionGuidanceState(edition, now) === 'reviewed'
}

/**
 * THE GATE. The forms as a student may see them: applicability copy survives
 * only while the edition is `reviewed`. Authoring a string into `appliesTo` is
 * therefore never enough to publish it — someone qualified has to sign the
 * edition, and the signature has to still match what is written.
 *
 * Callers must pass the edition they are serving rather than leaning on the
 * default, so this is exercisable against a synthetic edition that DOES carry
 * copy (`test/forms-guidance-gate.test.ts`). A gate whose only input is an
 * edition with nothing to withhold cannot be told from no gate at all.
 */
export function servedForms(
  edition: IsefFormsEdition = ISEF_EDITION,
  now: Date = new Date(),
): IsefFormDef[] {
  if (isEditionReviewed(edition, now)) return edition.forms
  return edition.forms.map((f) => (f.appliesTo === null ? f : { ...f, appliesTo: null }))
}

export function getForm(code: string): IsefFormDef | undefined {
  return ISEF_EDITION.forms.find((f) => f.code === code)
}
