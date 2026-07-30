'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { safeHref } from '@/lib/markdown/safe-href'

/**
 * The single markdown render sink for untrusted text.
 *
 * Every consumer of this component renders content the server does NOT fully
 * control: LLM output (paper chat, Vega study, teacher-visible Q&A) or student
 * writing (project logs). HTML sinks are already funnelled through one
 * sanitizer allowlist (`lib/discovery/sanitize.ts`); markdown was the remaining
 * unguarded class.
 *
 * `react-markdown` does not render raw HTML unless `rehype-raw` is added (it is
 * not), so the residual risk is **link-shaped**, not script-shaped:
 *
 *   - `[click me](javascript:alert(1))` — a scheme the renderer would otherwise
 *     pass through to `href`;
 *   - `[totally safe](https://evil.example)` — a plausible-looking link that a
 *     student (or a teacher reading AI output about a student) may click;
 *   - `![x](http://attacker/track.png)` — a beacon that leaks a page view.
 *
 * The policy below closes all three: an allowlisted scheme set, links forced to
 * open in a disowned tab, and images dropped entirely. Prefer this over a bare
 * `<ReactMarkdown>` for anything a user or a model produced.
 */

export function SafeMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children: linkChildren, ...props }) {
          const safe = safeHref(href)
          // A dropped href renders as plain text — the reader still sees the
          // label, but there is nothing to click.
          if (!safe) return <span {...props}>{linkChildren}</span>
          return (
            <a
              {...props}
              href={safe}
              target="_blank"
              // noopener/noreferrer: the opened page gets no window.opener
              // handle back into the app and no referrer.
              rel="noopener noreferrer nofollow"
            >
              {linkChildren}
            </a>
          )
        },
        // Remote images in model output are a tracking beacon with no product
        // value here — model replies are text. Drop them; keep the alt text.
        img({ alt }) {
          return <span className="text-white/40">{alt ? `[image: ${alt}]` : '[image]'}</span>
        },
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
