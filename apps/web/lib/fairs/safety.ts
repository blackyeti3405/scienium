/**
 * Hazard-class safety reference content (Feature F6 — Forms & Safety guide).
 *
 * Four broad hazard categories that ISEF's higher-risk forms (3, 4, 5A/5B,
 * 6A/6B) map onto. Pure static reference content — no DB, no LLM, no network —
 * read directly by `FormsChecklist.tsx` and cross-referenced from
 * `lib/fairs/forms.ts`'s `ISEF_FORM_GUIDES[*].hazardClasses`. Mirrors the
 * `isef-rubric.ts` / `stats-guide.ts` "typed constant module" pattern already
 * used across this codebase for read-only reference content.
 */

export type HazardClassKey = 'chemical' | 'biological' | 'sharp-mechanical' | 'human-subjects'

export interface HazardClass {
  key: HazardClassKey
  label: string
  /** 2+ sentences describing the risk category in plain language. */
  summary: string
  /** Personal protective equipment / precautions to take before working. */
  ppe: string[]
  /** Safe-handling practices while running the experiment. */
  handling: string[]
  /** Disposal / cleanup guidance once the experiment is done. */
  disposal: string[]
}

export const HAZARD_CLASSES: HazardClass[] = [
  {
    key: 'chemical',
    label: 'Chemical',
    summary:
      'Covers any project using reagents, solvents, acids/bases, or other substances that can burn, poison, irritate, or react dangerously if mishandled. This includes household chemicals used in unusual concentrations or combinations, not just lab-grade reagents — a strong acid or bleach-and-ammonia mixture from under the sink is just as hazardous as anything from a supply catalog.',
    ppe: [
      'Splash goggles (not just glasses) whenever pouring, mixing, or heating a chemical',
      'Chemical-resistant gloves rated for the specific substance in use (nitrile is not universal — check compatibility)',
      'A lab coat or old long-sleeve layer that can be removed quickly if splashed',
      'Work in a ventilated space (open window or fume hood) for anything with fumes or vapor',
    ],
    handling: [
      'Read the label/SDS for every reagent before opening it — know the hazard pictograms, not just the name',
      'Never mix chemicals outside the documented, approved procedure — unplanned combinations are the most common source of lab accidents',
      'Keep quantities to the minimum needed for the experiment; do not scale up "just in case"',
      'Label every container you transfer a chemical into, including the date and concentration',
      'Keep an adult sponsor present for any step involving corrosive, flammable, or toxic substances',
    ],
    disposal: [
      'Follow your school\'s chemical waste procedure — never pour reagents down a sink or into regular trash unless the SDS explicitly says it is safe to do so',
      'Neutralize acids/bases only under supervision and only using the documented neutralization procedure',
      'Store waste in a labeled, sealed container until it can be collected by your school\'s hazardous-waste service',
      'Clean and decontaminate all glassware and surfaces before leaving the workspace',
    ],
  },
  {
    key: 'biological',
    label: 'Biological',
    summary:
      'Covers projects working with microorganisms (bacteria, fungi, yeast), recombinant DNA, cell/tissue cultures, or human/animal body fluids and tissue. The risk is contamination and infection, not just to the researcher but to anyone who later touches a surface, sample, or piece of equipment — biological risk is worked around with the assumption that any unknown culture could contain a pathogen.',
    ppe: [
      'Disposable gloves for any step touching cultures, tissue, or body fluids',
      'A lab coat or apron dedicated to biological work, laundered or disposed of separately from street clothes',
      'Safety glasses when working near an open flame (Bunsen burner sterilization) or centrifuge',
      'A properly maintained biosafety cabinet or, at minimum, a clean bench area wiped with disinfectant before and after use',
    ],
    handling: [
      'Use aseptic technique — sterilize tools before and after contact with any culture',
      'Never open culture plates or tubes outside the approved work area',
      'Keep recombinant DNA and microorganism work restricted to BSL-1 organisms unless a qualified scientist and Form 6A/2 are on file for anything higher',
      'Wash hands thoroughly after every session, even when gloves were worn throughout',
      'Do not eat, drink, or touch your face while handling cultures or tissue',
    ],
    disposal: [
      'Autoclave or chemically disinfect all cultures and contaminated materials before disposal — never discard live cultures in regular trash',
      'Use a designated biohazard bag/sharps-adjacent container for any tissue, swabs, or contaminated plasticware',
      'Decontaminate work surfaces with an appropriate disinfectant (e.g. diluted bleach) after every session',
      'Confirm your school\'s biological-waste pickup procedure with your adult sponsor before starting — do not stockpile waste',
    ],
  },
  {
    key: 'sharp-mechanical',
    label: 'Sharp/Mechanical',
    summary:
      'Covers cutting tools, needles, glassware, rotating or moving machine parts, lasers, and other physical hazards that can cause cuts, punctures, crush injuries, or eye damage. This class also covers electrical hazards from custom circuits, batteries, or powered devices built as part of an engineering project.',
    ppe: [
      'Safety glasses or goggles whenever cutting, drilling, grinding, or working with glassware under stress',
      'Cut-resistant gloves for handling blades, broken glass, or sharp metal stock',
      'Closed-toe shoes and tied-back hair/loose clothing around any rotating or powered tool',
      'Insulated gloves and a grounded workspace for any exposed-wiring electrical work',
    ],
    handling: [
      'Never work with sharp tools or power equipment without an adult sponsor present',
      'Cut and point blades away from your body; keep guards and safety interlocks on power tools in place, never removed for convenience',
      'Secure loose materials (clamp, vise, or hold with a jig) before cutting or drilling rather than holding freehand',
      'De-energize and unplug any electrical circuit before touching or modifying it',
      'Keep a clear, uncluttered workspace — most sharp/mechanical injuries happen when tools or materials are stacked or crowded',
    ],
    disposal: [
      'Dispose of broken glass, blades, and needles in a rigid, puncture-resistant sharps container — never in regular trash or recycling',
      'Store unused blades, tools, and battery cells safely between sessions, not left out on the bench',
      'Recycle or dispose of batteries per your school\'s battery-recycling policy rather than regular trash',
      'Report any near-miss or injury to your adult sponsor immediately, however minor',
    ],
  },
  {
    key: 'human-subjects',
    label: 'Human subjects',
    summary:
      'Covers any project where people other than the researcher are surveyed, observed, tested, or measured — this is a data-ethics and privacy hazard class rather than a physical one. The core risks are participants not truly understanding what they agreed to, personal data being exposed, or vulnerable groups (minors, at-risk populations) being studied without adequate protections.',
    ppe: [
      'Not applicable in the physical sense — the equivalent "protection" here is a written, IRB-style research plan reviewed and approved by your adult sponsor before you recruit anyone',
      'A clear, plain-language informed-consent script or form prepared in advance of any recruitment',
      'A parental/guardian consent process ready before approaching any participant under 18',
    ],
    handling: [
      'Explain the purpose, procedure, time commitment, and any risks to each participant in plain language before they agree to take part',
      'Make it explicit and easy for a participant to decline or withdraw at any point without penalty',
      'Avoid recruiting from groups you have power over (e.g. your own students if you are also a teacher, or offering grades/rewards as inducement)',
      'Do not collect more personal information than the research question actually requires',
      'Keep any survey, interview, or observation protocol identical to what your adult sponsor pre-approved — no improvising new questions on the day',
    ],
    disposal: [
      'Store all participant data de-identified wherever possible (replace names with codes) and keep the code key separate from the data',
      'Limit access to raw response data to the research team and adult sponsor only',
      'Aggregate or anonymize results before including them in any report, poster, or public presentation',
      'Retain signed consent forms for the period your fair/IRB requires, then destroy them securely rather than leaving them in a shared drive indefinitely',
    ],
  },
]

export function getHazardClass(key: HazardClassKey): HazardClass | undefined {
  return HAZARD_CLASSES.find((h) => h.key === key)
}
