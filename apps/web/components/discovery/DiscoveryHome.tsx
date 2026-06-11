'use client'

import { useState } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'

// ── Accordion content ───────────────────────────────────────────────────────

const ITEMS = [
  {
    title: 'What is a Wikipedia deep dive?',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          A <strong className="text-foreground">Wikipedia deep dive</strong> is an
          idea-generation technique originally conceived by{' '}
          <strong className="text-foreground">Rishab Jain</strong> — science fair champion and
          author. The core idea is simple: open a Wikipedia article on any subject, then follow
          the hyperlinks that catch your eye, letting one topic lead naturally to the next and
          uncovering unexpected connections along the way.
        </p>
        <p>
          NOVA Lab has adapted this into its current interactive form. As you click through
          links, a <strong className="text-foreground">live branching tree diagram</strong> is
          built automatically, mapping your exact path. You can split into two directions at any
          article, star entries worth revisiting, prune dead ends, and backtrack through any
          node — turning a freeform browse into a structured, visual map of ideas.
        </p>
      </div>
    ),
  },
  {
    title: 'How are they useful?',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Deep dives give you <strong className="text-foreground">rapid, broad exposure</strong>{' '}
          to a whole landscape of topics in a single session. Instead of committing to one
          subject upfront, you surface dozens of related fields, sub-disciplines, and adjacent
          ideas — perfect for the early research phase of a science fair project when you need
          inspiration but aren&apos;t sure where to focus yet.
        </p>
        <p>
          Anything that sparks genuine interest can be{' '}
          <strong className="text-foreground">starred</strong> as you go. By the end of a
          20-minute session your starred list becomes a curated shortlist of angles to pursue
          more deeply — saving you hours of unfocused googling later.
        </p>
      </div>
    ),
  },
  {
    title: 'How do I use them?',
    body: (
      <ol className="space-y-3.5 text-sm text-muted-foreground">
        {(
          [
            ['🔍', 'Search a topic', 'Type any subject into the search bar. This becomes the root node of your tree.'],
            ['📖', 'Read the article', 'Skim the Wikipedia article that loads. Blue underlined links are clickable and can become branches.'],
            ['🌿', 'Select up to 2 branches', "Click 1–2 blue links that interest you. They'll highlight and appear in the Branch Selections panel on the right."],
            ['➡️', 'Commit and move forward', 'Press "Branch into articles →" to lock in your choices, expand the tree, and jump to the first new article.'],
            ['🔁', 'Explore freely', 'Keep branching, or click any node in the tree to jump back and take a different path.'],
            ['⭐', 'Star what matters', 'Click the ☆ icon on any tree node to star it. Starred articles appear in the sidebar and here on the home screen.'],
            ['🗑', 'Prune dead ends', 'Right-click any tree node to delete it and all its children — keeping your tree focused.'],
          ] as [string, string, string][]
        ).map(([icon, label, desc], i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 text-base leading-5 mt-0.5">{icon}</span>
            <span>
              <strong className="text-foreground">{label}</strong>
              {' — '}
              {desc}
            </span>
          </li>
        ))}
      </ol>
    ),
  },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  starredNodes: DiscoveryNode[]
  hasExisting: boolean
  onContinue: () => void
  onOpenStarred: (nodeId: string) => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function DiscoveryHome({ starredNodes, hasExisting, onContinue, onOpenStarred }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero ── */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">🔭</div>
          <h1 className="text-2xl font-bold tracking-tight">Topic Discovery</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Explore ideas through Wikipedia — let curiosity branch your thinking.
          </p>
        </div>

        {/* ── Accordion ── */}
        <div className="space-y-2">
          {ITEMS.map((item, i) => {
            const isOpen = open.has(i)
            return (
              <div
                key={i}
                className="border rounded-lg overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-sm">{item.title}</span>
                  <span
                    className={`text-muted-foreground text-[10px] transition-transform duration-200 ml-4 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t bg-muted/5">
                    {item.body}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Starred topics ── */}
        {starredNodes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="text-yellow-500">★</span>
              Starred Topics
              <span className="text-xs font-normal text-muted-foreground">
                ({starredNodes.length})
              </span>
            </h2>
            <div className="grid gap-2">
              {starredNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    onOpenStarred(n.id)
                    onContinue()
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-muted/40 hover:border-yellow-400/40 transition-all text-left group"
                >
                  <span className="text-yellow-500 text-base shrink-0">★</span>
                  <span className="flex-1 text-sm font-medium truncate">{n.title}</span>
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          onClick={onContinue}
          className="w-full rounded-lg py-3.5 px-4 font-semibold text-sm
            bg-primary text-primary-foreground
            hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
        >
          {hasExisting ? '🌿 Continue Exploring' : '🚀 Start Exploring'}
        </button>

      </div>
    </div>
  )
}
