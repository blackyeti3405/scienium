/**
 * ISEF required-forms catalog (Feature 3c).
 *
 * Twelve standard ISEF forms, seeded lazily into `FormsCatalog` on first API
 * call. `requiredForLevelsJson` stores the condition tags that trigger this
 * form; the UI filters/annotates by them. DB rows are keyed on `formCode`
 * (unique), so re-seeding is idempotent.
 */

import { db } from '@/lib/db'

export interface IsefFormDef {
  code: string
  name: string
  description: string
  /** Conditions under which this form is required. 'all' means every project. */
  requiredFor: string[]
}

const FORMS_PAGE = 'https://www.societyforscience.org/isef/forms/'

export const ISEF_FORMS: IsefFormDef[] = [
  {
    code: 'Form 1',
    name: 'Student Checklist',
    description:
      'Master checklist documenting every approval, signature, and supplemental form required for your project. Every ISEF entry starts here.',
    requiredFor: ['all'],
  },
  {
    code: 'Form 1A',
    name: 'Adult Sponsor Approval',
    description:
      'Your supervising adult (teacher, mentor, or parent) certifies the project plan was reviewed and approved before experimentation began.',
    requiredFor: ['all'],
  },
  {
    code: 'Form 1B',
    name: 'Approval Form',
    description:
      'Required when any portion of the research is conducted outside the school setting — university lab, hospital, private facility, or field site.',
    requiredFor: ['non_school_research'],
  },
  {
    code: 'Form 1C',
    name: 'Student Research Plan',
    description:
      'A concise written plan: research question, hypothesis, materials, procedure, data analysis approach, and risk assessment — submitted for pre-approval before you start experimenting.',
    requiredFor: ['all'],
  },
  {
    code: 'Form 2',
    name: 'Qualified Scientist',
    description:
      'Required when a student conducts research under the direct supervision of a professional scientist or in an industrial, university, or government lab.',
    requiredFor: ['qualified_scientist'],
  },
  {
    code: 'Form 3',
    name: 'Risk Assessment',
    description:
      'Documents each hazard present in your experimental setup (chemicals, electricity, lasers, sharp instruments, etc.) and the mitigation steps taken.',
    requiredFor: ['hazardous_substances'],
  },
  {
    code: 'Form 4',
    name: 'Human Participants',
    description:
      'Required for any project that involves human participants as subjects — surveys, behavioral observations, physiological measurements, or psychological studies.',
    requiredFor: ['human_subjects'],
  },
  {
    code: 'Form 5A',
    name: 'Vertebrate Animals Research',
    description:
      'Required when your project uses live vertebrate animals. Describes the species, number of animals, housing, care, and experimental procedures.',
    requiredFor: ['vertebrate_animals'],
  },
  {
    code: 'Form 5B',
    name: 'Vertebrate Animals Checklist',
    description:
      'Companion checklist to Form 5A, reviewed and signed by a supervising veterinarian or trained scientist who evaluated the animal-care plan.',
    requiredFor: ['vertebrate_animals'],
  },
  {
    code: 'Form 6A',
    name: 'Potentially Hazardous Biological Agents',
    description:
      'Required when your project uses microorganisms, recombinant DNA, or fresh/frozen tissue of human or vertebrate-animal origin.',
    requiredFor: ['hazardous_bio'],
  },
  {
    code: 'Form 6B',
    name: 'Human and Vertebrate Animal Tissue',
    description:
      'Required when using established cell lines, fixed tissue, paraffin sections, or other prepared biological materials from humans or vertebrate animals.',
    requiredFor: ['tissue'],
  },
  {
    code: 'Form 7',
    name: 'Continuation Projects',
    description:
      'Required when this project directly continues prior-year research. Documents the new research question added, new data collected this year, and a summary of prior-year results.',
    requiredFor: ['continuation'],
  },
]

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
