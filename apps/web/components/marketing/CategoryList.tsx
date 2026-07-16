import { Accordion } from '@/components/marketing/Accordion'

/**
 * Interactive row-list of the six lab types (replaces the old static pill row
 * in the "game layer" section on /). Same names as FlipWords/page.tsx — click
 * a row to see what field it covers; not a card grid (DESIGN.md).
 */
const CATEGORIES = [
  { label: 'BioCore', hint: 'Life sciences and biology research.' },
  { label: 'ChemWorks', hint: 'Chemistry and materials science.' },
  { label: 'Volt Lab', hint: 'Engineering, robotics, and electronics.' },
  { label: 'TerraBase', hint: 'Earth, environmental, and climate science.' },
  { label: 'MindFrame', hint: 'Psychology and social science.' },
  { label: 'Axiom', hint: 'Physics and mathematics.' },
]

export function CategoryList() {
  return (
    <Accordion
      className="mx-auto mt-8 max-w-md text-left"
      items={CATEGORIES.map((c) => ({
        trigger: (
          <span className="font-pixel" style={{ fontSize: '0.65rem', letterSpacing: '0.04em' }}>
            {c.label}
          </span>
        ),
        content: <p className="text-[15px] leading-relaxed text-[#5a6b80]">{c.hint}</p>,
      }))}
    />
  )
}
