'use client'

import { useState } from 'react'
import { ISEF_CATEGORIES, type IsefCategory } from '@/lib/fairs/categories'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function CategoryBrowser() {
  const [open, setOpen] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? ISEF_CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()) ||
          c.exampleTopics.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      )
    : ISEF_CATEGORIES

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="font-pixel text-[7px] text-white/35 leading-loose">
          Regeneron ISEF 2026 has 22 competition categories. Find the one that best
          fits your project — judges are assigned per category.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories or topics…"
          className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/30 mt-1"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="font-pixel text-[8px] text-white/35 text-center py-6">No categories match.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((cat) => (
            <CategoryRow
              key={cat.code}
              cat={cat}
              isOpen={open === cat.code}
              onToggle={() => setOpen(open === cat.code ? null : cat.code)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryRow({
  cat,
  isOpen,
  onToggle,
}: {
  cat: IsefCategory
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`border rounded-sm transition-colors ${
        isOpen ? 'border-[#F5C518]/30 bg-[#F5C518]/4' : 'border-white/10 bg-white/2'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="font-pixel text-[6px] text-white/30 w-10 shrink-0">{cat.code}</span>
        <span className="flex-1 text-sm text-white/80 leading-snug">{cat.name}</span>
        {isOpen ? (
          <ChevronDown size={12} className="text-white/30 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-white/30 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-white/8 pt-2.5">
          <p className="text-[12px] text-white/55 leading-relaxed">{cat.description}</p>
          <div>
            <span className="font-pixel text-[7px] text-white/35 uppercase tracking-widest block mb-1.5">
              Example topics
            </span>
            <ul className="flex flex-col gap-1">
              {cat.exampleTopics.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-[12px] text-white/50 leading-relaxed">
                  <span className="text-[#F5C518]/50 shrink-0">▪</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
