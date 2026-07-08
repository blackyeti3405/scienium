'use client'

import { SectionLabel } from '@/components/ops/guide-chrome'
import {
  ABSTRACT_STRUCTURE,
  ABSTRACT_DONT_INCLUDE,
  ABSTRACT_EXAMPLES,
} from '@/lib/fairs/abstract-guide'

/**
 * Showcase abstract-writing guide — a static, authored reference rendered
 * inline below the abstract textarea in `ShowcaseEditor`: a 5-part
 * sentence-by-sentence template, an ISEF "don't include" list, and 3 worked
 * example abstracts across 3 ISEF categories. Reads only from
 * `lib/fairs/abstract-guide.ts` — no fetch, no persistence, no LLM call.
 * Chrome mirrors `ResearchGuidePanel`: `font-pixel` + gold for
 * headings/labels/badges, regular `text-sm text-white/70 leading-relaxed`
 * for every prose body.
 */
export function AbstractGuide() {
  return (
    <div data-testid="abstract-guide" className="flex flex-col gap-5 mt-3 pt-3 border-t border-white/10">
      {/* 5-part structure template */}
      <div data-testid="abstract-structure" className="flex flex-col gap-2">
        <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
          Structure — one sentence per part
        </span>
        <ol className="flex flex-col gap-2">
          {ABSTRACT_STRUCTURE.map((sentence, i) => (
            <li
              key={sentence.id}
              data-testid={`abstract-structure-${sentence.id}`}
              className="border border-white/10 bg-[#0a1628] px-3 py-2.5 flex flex-col gap-2"
            >
              <span className="font-pixel text-[9px] text-white flex items-center gap-2">
                <span className="text-[#F5C518]">{i + 1}.</span>
                {sentence.role}
              </span>
              <p className="text-sm text-white/70 leading-relaxed">{sentence.guidance}</p>
              <div>
                <SectionLabel>Sentence starters</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {sentence.sentenceStarters.map((starter, j) => (
                    <li key={j} className="text-sm text-white/70 leading-relaxed italic">
                      &ldquo;{starter}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionLabel>Common mistake</SectionLabel>
                <p className="text-sm text-white/70 leading-relaxed">{sentence.commonMistake}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Don't include list */}
      <div data-testid="abstract-dont-include" className="flex flex-col gap-2">
        <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
          Don&rsquo;t include
        </span>
        <ul className="flex flex-col gap-2">
          {ABSTRACT_DONT_INCLUDE.map((item) => (
            <li
              key={item.id}
              data-testid={`abstract-dont-include-${item.id}`}
              className="border border-white/10 bg-[#0a1628] px-3 py-2.5 flex flex-col gap-1"
            >
              <span className="font-pixel text-[8px] text-white">{item.rule}</span>
              <p className="text-sm text-white/70 leading-relaxed">{item.why}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Worked examples */}
      <div data-testid="abstract-examples" className="flex flex-col gap-3">
        <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
          Worked examples
        </span>
        {ABSTRACT_EXAMPLES.map((example) => (
          <div
            key={example.id}
            data-testid={`abstract-example-${example.id}`}
            className="border border-white/10 bg-[#0a1628] px-3 py-3 flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-pixel text-[9px] text-white">{example.title}</span>
              <span className="font-pixel text-[6px] text-[#F5C518] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] px-1.5 py-0.5">
                {example.category}
              </span>
              <span
                className={`font-pixel text-[6px] uppercase tracking-widest border px-1.5 py-0.5 ${
                  example.quality === 'strong'
                    ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/[0.08]'
                    : example.quality === 'developing'
                    ? 'text-[#F5C518] border-[#F5C518]/30 bg-[#F5C518]/[0.08]'
                    : 'text-red-400 border-red-400/30 bg-red-400/[0.08]'
                }`}
              >
                {example.quality}
              </span>
              <span className="font-pixel text-[6px] text-white/35 uppercase tracking-widest">
                {example.wordCount} words
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{example.body}</p>
            <div>
              <SectionLabel>Critique</SectionLabel>
              <p className="text-sm text-white/70 leading-relaxed">{example.critique}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
