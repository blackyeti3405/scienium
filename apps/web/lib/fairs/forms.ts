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
   * Name + role of the qualified teacher/SRC reviewer who approved the
   * applicability and timing copy. **Fail-closed gate:** while this is `null`,
   * the app presents no applicability or timing guidance of its own.
   */
  reviewedBy: string | null
  /** ISO date of that review. */
  reviewedAt: string | null
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
  reviewedBy: null,
  reviewedAt: null,
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

/** True once a qualified reviewer has approved this edition's guidance copy. */
export function isEditionReviewed(edition: IsefFormsEdition = ISEF_EDITION): boolean {
  return !!edition.reviewedBy && !!edition.reviewedAt
}

export function getForm(code: string): IsefFormDef | undefined {
  return ISEF_EDITION.forms.find((f) => f.code === code)
}
