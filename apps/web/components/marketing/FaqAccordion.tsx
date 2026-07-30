import { Accordion } from '@/components/marketing/Accordion'

/**
 * FAQ for the /about Contact section. Grounded in what's actually in the spec
 * (docs/SPEC.md §12.3, §15.6) rather than invented claims — cost is the one
 * honest "not finalized yet" answer since no pricing plan is shipped.
 */
const FAQS = [
  {
    q: 'What does scienium cost?',
    a: "scienium is free for students to play. We're finalizing school and district pricing for teacher features (class rosters, reports); a teacher account works standalone in the meantime.",
  },
  {
    q: 'What devices does it run on?',
    a: 'Any modern browser, on a laptop or a school Chromebook — no install, no app store. There is no dedicated mobile app yet.',
  },
  {
    q: 'What happens to student data and privacy?',
    a: "Showcases default to private and only become public with verified parental consent for minors; school-only publishing needs teacher approval. Teams control their own privacy level at every step.",
  },
  {
    q: 'How does a classroom pilot work?',
    a: "A teacher creates a class, students join with a class code, and teams work through the phases at their own pace. Two transitions need teacher sign-off (starting data collection, and advancing to competition) — everything else is self-paced.",
  },
]

export function FaqAccordion() {
  return (
    <Accordion
      items={FAQS.map((f) => ({
        trigger: <span className="text-lg font-semibold text-[#0d1b2e]">{f.q}</span>,
        content: <p className="max-w-[56ch] text-[15px] leading-relaxed text-[#5a6b80]">{f.a}</p>,
      }))}
    />
  )
}
