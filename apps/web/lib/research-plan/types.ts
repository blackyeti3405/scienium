/**
 * Project-type catalog for the Research Plan building (Feature 2B).
 *
 * A student picks an ISEF track (engineering vs science) and a subtype; that
 * choice selects the rubric the AI review grades the plan against. Each subtype's
 * `key` is also the filename of its rubric emphasis under lib/research-plan/rubrics/
 * (composed on top of the track's `_engineering.md` / `_science.md` base).
 */

export type ProjectTypeKey = 'engineering' | 'science'

export interface ProjectSubtype {
  key: string
  label: string
  blurb: string
}

export interface ProjectType {
  key: ProjectTypeKey
  label: string
  subtypes: ProjectSubtype[]
}

export const PROJECT_TYPES: ProjectType[] = [
  {
    key: 'engineering',
    label: 'Engineering',
    subtypes: [
      { key: 'robotics', label: 'Robotics & Control', blurb: 'Robots, actuators, embedded control' },
      { key: 'software', label: 'Software & Systems', blurb: 'Algorithms, apps, ML systems' },
      { key: 'electrical', label: 'Electrical & Embedded', blurb: 'Circuits, sensors, power' },
      { key: 'mechanical', label: 'Mechanical & Structural', blurb: 'Mechanisms, structures, fluids' },
      { key: 'materials', label: 'Materials & Chemical Eng.', blurb: 'Materials, processes, chemical eng.' },
    ],
  },
  {
    key: 'science',
    label: 'Science',
    subtypes: [
      { key: 'biology', label: 'Biology & Life Sciences', blurb: 'Organisms, cells, genetics, health' },
      { key: 'chemistry', label: 'Chemistry', blurb: 'Reactions, analysis, biochem' },
      { key: 'physics', label: 'Physics & Astronomy', blurb: 'Mechanics, optics, space' },
      { key: 'environmental', label: 'Environmental Science', blurb: 'Ecology, climate, pollution' },
      { key: 'behavioral', label: 'Behavioral & Social', blurb: 'Psychology, behavior, surveys' },
    ],
  },
]

export function findProjectType(key: string | null | undefined): ProjectType | undefined {
  return PROJECT_TYPES.find((t) => t.key === key)
}

export function findSubtype(
  typeKey: string | null | undefined,
  subtypeKey: string | null | undefined,
): ProjectSubtype | undefined {
  return findProjectType(typeKey)?.subtypes.find((s) => s.key === subtypeKey)
}

/** Validate a (type, subtype) pair against the catalog. */
export function isValidSelection(typeKey: string, subtypeKey: string): boolean {
  return !!findSubtype(typeKey, subtypeKey)
}
