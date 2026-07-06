/**
 * ISEF required-forms catalog (Feature 3c).
 *
 * Twelve standard ISEF forms, seeded lazily into `FormsCatalog` on first API
 * call. `requiredForLevelsJson` stores the condition tags that trigger this
 * form; the UI filters/annotates by them. DB rows are keyed on `formCode`
 * (unique), so re-seeding is idempotent.
 */

import { db } from '@/lib/db'
import type { HazardClassKey } from '@/lib/fairs/safety'

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

/**
 * Rich per-form paperwork guide content (Feature F6 — Forms & Safety guide).
 *
 * Kept as a SEPARATE constant from `ISEF_FORMS` on purpose: `ISEF_FORMS` is
 * read by `ensureFormsSeeded()` and persisted into `FormsCatalog.description`,
 * so bloating it with guide prose would re-trigger seed writes and blow up
 * the DB column. This content is joined client-side by `code` — never
 * persisted, never sent through the API route. See the plan's "Key
 * architecture decision" for the full rationale.
 */
export interface IsefFormGuide {
  /** Matches an `ISEF_FORMS[*].code`. */
  code: string
  /** What the form actually is / what section of the project it maps to. */
  whatItIs: string
  /** Concrete items the student must fill in — bullet list. */
  whatGoesIn: string[]
  /** Why this form is required — the underlying ethics/safety rationale. */
  whyItTriggers: string
  /** Which hazard-class reference sections (lib/fairs/safety.ts) this form relates to. */
  hazardClasses: HazardClassKey[]
}

export const ISEF_FORM_GUIDES: IsefFormGuide[] = [
  {
    code: 'Form 1',
    whatItIs:
      'Form 1 is the master Student Checklist — not a document you write content into, but a routing table that tells you and your adult sponsor exactly which of the other 11 forms apply to your project before you start any experimentation. It is the first thing every ISEF-affiliated fair asks for, because it is how a fair director confirms nothing was skipped.',
    whatGoesIn: [
      'Your project title, category, and whether it is an individual or team entry',
      'A yes/no answer for each condition that triggers another form (off-campus research, human participants, vertebrate animals, hazardous biological agents, hazardous chemicals/devices, continuation project)',
      'Signature lines confirming the checklist was reviewed with your adult sponsor before research began',
    ],
    whyItTriggers:
      'Every ISEF-affiliated project needs Form 1 because it is the compliance backbone of the whole paperwork system — the fair cannot verify any other approval exists without first knowing which approvals were supposed to happen. Filling it out honestly and early is what prevents a project from being disqualified at check-in for a missing signature discovered too late to fix.',
    hazardClasses: [],
  },
  {
    code: 'Form 1A',
    whatItIs:
      'Form 1A is the Adult Sponsor Approval — a signed statement from the teacher, mentor, or parent who oversaw your project that they reviewed your plan and safety considerations before you began. It exists to put a responsible adult\'s name on record as having actually looked at the project before the first experiment, not after.',
    whatGoesIn: [
      'The adult sponsor\'s name, role (teacher/mentor/parent), and contact information',
      'Confirmation they reviewed the Research Plan (Form 1C) and any risk-assessment content before experimentation started',
      'A dated signature — the date must be before your earliest recorded experiment date',
    ],
    whyItTriggers:
      'Every project needs Form 1A because ISEF rules require an adult with subject-matter or safety oversight to have signed off before risk is introduced, not as a retroactive rubber stamp. This is the paperwork equivalent of "ask before you start," and fair directors check the signature date against your logbook dates specifically to catch after-the-fact approvals.',
    hazardClasses: [],
  },
  {
    code: 'Form 1B',
    whatItIs:
      'Form 1B is the Approval Form for research conducted anywhere other than your own school — a university lab, hospital, private company, government facility, or an outdoor field site. It documents that the host institution knew a student researcher would be present and agreed to the arrangement.',
    whatGoesIn: [
      'The name and address of the outside research site',
      'The name and title of the site\'s designated supervisor/qualified individual',
      'A description of what portion of the research happens at that site versus at school',
      'The site supervisor\'s signature acknowledging the student\'s presence and activities',
    ],
    whyItTriggers:
      'Form 1B is required specifically when research leaves the school setting because the fair has no direct visibility into an outside lab\'s safety culture or supervision — the form is how that accountability gets documented on paper instead of assumed. It pairs with Form 2 whenever the outside supervisor is also a qualified scientist directing the work.',
    hazardClasses: [],
  },
  {
    code: 'Form 1C',
    whatItIs:
      'Form 1C is the Student Research Plan — the single most important document in the packet, because it is what your adult sponsor (and, for higher-risk projects, an Institutional Review Board or Scientific Review Committee) actually reads and approves before you touch any materials. It is where your research question turns into a concrete, reviewable plan.',
    whatGoesIn: [
      'Your research question and hypothesis, stated specifically enough to be testable',
      'A full materials list, including quantities and sources for anything hazardous',
      'A step-by-step procedure describing exactly what you will do, in order',
      'Your data-analysis approach — what you will measure and how you will interpret it',
      'A risk assessment section identifying any hazards in your procedure and how you will mitigate them',
    ],
    whyItTriggers:
      'Every project needs Form 1C because it is the pre-approval gate: reviewers need to see the actual planned procedure — not just a topic idea — before any experimentation happens, so that hazards, ethical concerns, or missing approvals can be caught while they are still easy to fix. It is also the document later reviewers cross-check your actual results against, so vague or padded plans tend to cause problems at judging, not just at approval time.',
    hazardClasses: [],
  },
  {
    code: 'Form 2',
    whatItIs:
      'Form 2 is the Qualified Scientist form — required whenever a professional scientist (not your teacher or parent) directly supervises your work, typically in an industrial, university, or government lab setting. It names that scientist and documents their qualifications and role.',
    whatGoesIn: [
      'The qualified scientist\'s name, institutional affiliation, and area of expertise',
      'A description of the specific supervision they provided (which steps, how often, in person vs. remote)',
      'Confirmation of the facility\'s safety training or orientation the student received',
      'The scientist\'s signature acknowledging their supervisory role',
    ],
    whyItTriggers:
      'Form 2 triggers because working under a professional scientist changes who is accountable for day-to-day safety and technique supervision away from your school-based adult sponsor — the fair needs to know exactly who that person is and that they agreed to the responsibility. It commonly accompanies Form 1B when the qualified scientist\'s lab is also an off-campus site.',
    hazardClasses: [],
  },
  {
    code: 'Form 3',
    whatItIs:
      'Form 3 is the Risk Assessment — required whenever your procedure involves hazardous chemicals, devices, or activities (open flames, high voltage, lasers, sharp tools, pressurized systems, etc.). It is where you demonstrate you thought through what could go wrong and planned for it, not just that you plan to "be careful."',
    whatGoesIn: [
      'Each specific hazard named individually — do not write "chemicals," name the exact substance, its concentration, and the hazard it poses (corrosive, flammable, toxic, etc.)',
      'The mitigation steps for each named hazard — PPE required, engineering controls (fume hood, ventilation), and procedural safeguards (adult supervision, quantity limits)',
      'A disposal procedure for every hazardous material or byproduct generated, including where and how it will be discarded',
      'An emergency plan — what to do and who to contact if something goes wrong during the procedure',
    ],
    whyItTriggers:
      'Form 3 triggers because chemical, electrical, and mechanical hazards can cause real physical harm, and ISEF requires proof the student identified those specific risks in advance rather than discovering them mid-experiment. Naming each hazard individually (rather than a blanket "safety will be observed" statement) is what a reviewer is actually checking for — see the Chemical and Sharp/Mechanical hazard-class references below for the underlying PPE, handling, and disposal practices this form is built on.',
    hazardClasses: ['chemical', 'sharp-mechanical'],
  },
  {
    code: 'Form 4',
    whatItIs:
      'Form 4 is the Human Participants form — required for any project where people other than the researcher are surveyed, observed, measured, or tested, including behavioral studies, physiological measurements, and psychological research. It is ISEF\'s version of an IRB (Institutional Review Board) protocol, adapted for a school-fair context.',
    whatGoesIn: [
      'The exact informed-consent language participants (or their parent/guardian, if minors) will read and sign before taking part',
      'A description of the recruitment method — who will be asked to participate and how they will be approached',
      'The confidentiality protections in place — how personal data will be stored, who can access it, and how it will be de-identified',
      'A description of any risk, discomfort, or deception involved, however minor, and how participants will be debriefed afterward',
    ],
    whyItTriggers:
      'Form 4 triggers because research on human subjects carries a real risk of participants being misled, exposed, or having private information mishandled if the study is not designed with informed consent and confidentiality built in from the start — this is the same underlying concern a university IRB reviews for, just scaled to a student project. See the Human subjects hazard-class reference below for what informed-consent language and data-handling practices actually need to look like in practice.',
    hazardClasses: ['human-subjects'],
  },
  {
    code: 'Form 5A',
    whatItIs:
      'Form 5A is the Vertebrate Animal Research form — required whenever your project involves live vertebrate animals (mammals, birds, fish, reptiles, amphibians) as subjects. It documents the full animal-welfare plan, not just that animals are involved.',
    whatGoesIn: [
      'The species, strain, and number of animals used, with justification for that sample size',
      'Housing conditions — enclosure type, environmental enrichment, temperature/light cycle',
      'The care and feeding schedule and who is responsible for daily animal welfare',
      'The exact experimental procedures performed on the animals, including any that could cause pain, stress, or distress, and how those are minimized',
      'A euthanasia or end-of-study plan, if applicable, following accepted veterinary practice',
    ],
    whyItTriggers:
      'Form 5A triggers because vertebrate animal research carries a direct animal-welfare obligation — ISEF requires evidence the housing, handling, and any invasive or stressful procedures meet accepted standards of humane care, mirroring the review a university Institutional Animal Care and Use Committee (IACUC) would perform. Species, housing, and supervision detail are exactly what a reviewer checks for, because vague answers here are the most common reason 5A projects get sent back for revision.',
    hazardClasses: ['biological'],
  },
  {
    code: 'Form 5B',
    whatItIs:
      'Form 5B is the Vertebrate Animal Checklist — a companion document to Form 5A, reviewed and signed by a supervising veterinarian, animal-care professional, or trained scientist who independently evaluated the animal-care plan described in 5A. It exists as a second, independent set of eyes on the same plan, not a duplicate of Form 5A\'s content.',
    whatGoesIn: [
      'The reviewing veterinarian or scientist\'s name, credentials, and relationship to the project',
      'A checklist confirming housing, feeding, and handling plans meet accepted animal-welfare standards',
      'Any conditions or modifications the reviewer required before approving the plan',
      'The reviewer\'s signature and date, which must precede any animal work beginning',
    ],
    whyItTriggers:
      'Form 5B triggers alongside 5A specifically because animal-welfare review is not something a student\'s own plan can self-certify. An independent, qualified reviewer has to confirm the housing and procedures are humane before any animal is used — the same independent-check principle behind Form 6B\'s biological-material review.',
    hazardClasses: ['biological'],
  },
  {
    code: 'Form 6A',
    whatItIs:
      'Form 6A is the Potentially Hazardous Biological Agents (PHBA) Risk Assessment — required whenever your project works with microorganisms, recombinant or synthetic DNA, or fresh/frozen tissue, blood, or other body fluids of human or vertebrate-animal origin. It is the biosafety equivalent of Form 3.',
    whatGoesIn: [
      'The specific microorganism(s) used, including species/strain and biosafety level (BSL) classification',
      'Details of any recombinant DNA work — the source organism, vector, and insert, and confirmation it falls within permitted risk levels',
      'The tissue-culture or body-fluid materials used, their source, and how they were obtained safely and legally',
      'Containment and decontamination procedures — how cultures/materials are handled, stored, and destroyed after use',
    ],
    whyItTriggers:
      'Form 6A triggers because microorganisms, recombinant DNA, and human/animal-origin tissue all carry contamination and infection risk if handled outside proper biosafety containment — the form exists to confirm the project stays within permitted biosafety levels and that the student understands aseptic technique before working with anything that could carry a pathogen. See the Biological hazard-class reference below for the PPE, handling, and disposal practices this form assumes are in place.',
    hazardClasses: ['biological'],
  },
  {
    code: 'Form 6B',
    whatItIs:
      'Form 6B is the Human and Vertebrate Animal Tissue form — required when a project uses already-prepared biological materials of human or vertebrate-animal origin, such as established cell lines, fixed (non-living) tissue, paraffin-embedded sections, or purchased/donated specimens, rather than fresh/live material. It is the lighter-weight companion to Form 6A, used when the material is no longer biologically active rather than a live culture.',
    whatGoesIn: [
      'The exact tissue or cell line used and its documented source (supplier, biobank, or donor institution)',
      'Confirmation the material is fixed/preserved (not fresh, not capable of further biological activity) or, if a live cell line, its established, characterized identity',
      'The institution or supplier\'s certification that the material was obtained and provided under applicable ethical/legal guidelines',
      'How the material will be stored, used, and disposed of during the project',
    ],
    whyItTriggers:
      'Form 6B triggers because even prepared, non-living human or animal tissue was originally sourced from a person or animal, and the fair needs documentation that acquisition followed ethical and legal channels. This is a lighter-weight cousin of Form 6A for materials that no longer carry live-culture infection risk but still carry origin/consent concerns.',
    hazardClasses: ['biological'],
  },
  {
    code: 'Form 7',
    whatItIs:
      'Form 7 is the Continuation Projects form — required when this year\'s project directly builds on research you (or your team) conducted in a prior year, rather than starting a brand-new question from scratch. It exists to draw a clear line between what was already reviewed last year and what is genuinely new this year.',
    whatGoesIn: [
      'A summary of what was done and concluded in the prior year\'s project',
      'The specific new research question, hypothesis, or variable being added this year',
      'A description of what new data was collected this year that was not part of the earlier project',
      'A clear statement of how this year\'s contribution is distinct from and builds on last year\'s work, not a repeat of it',
    ],
    whyItTriggers:
      'Form 7 triggers because ISEF wants to credit each year\'s genuinely new contribution rather than let a single dataset be re-entered as if it were new research. The form is how judges see exactly which parts of the project are new this cycle versus inherited from last year\'s approved work.',
    hazardClasses: [],
  },
]

export function getFormGuide(code: string): IsefFormGuide | undefined {
  return ISEF_FORM_GUIDES.find((g) => g.code === code)
}

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
