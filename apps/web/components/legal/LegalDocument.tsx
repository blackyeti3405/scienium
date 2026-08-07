import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renderer for the two legal documents (`lib/legal/privacy.ts`, `terms.ts`).
 *
 * Deliberately NOT `SafeMarkdown`: that component exists for text the server does
 * not control, so it forces every link into a disowned new tab and drops images.
 * These documents are authored in-repo and rely on same-page anchor links for
 * their table of contents, which `target="_blank"` would break.
 *
 * The project has no Tailwind typography plugin, so element styling is explicit
 * here — one place, matching the light marketing system (paper field, navy ink,
 * gold accent) from DESIGN.md.
 */

/** GitHub-style heading slug, so the in-document contents links resolve. */
function slug(node: React.ReactNode): string {
  return String(node)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function LegalDocument({ title, markdown }: { title: string; markdown: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:px-10 md:py-20">
      <h1 className="font-pixel text-[#0d1b2e]" style={{ fontSize: '1.15rem', lineHeight: 1.6 }}>
        {title}
      </h1>
      <div className="mt-3 h-1 w-24 bg-[#F5C518]" />

      <article className="mt-10 font-display text-[0.98rem] leading-[1.75] text-[#243a56] [&_strong]:text-[#0d1b2e]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              // scroll-mt clears the sticky 68px marketing header when an anchor lands.
              <h2
                id={slug(children)}
                className="mt-14 scroll-mt-24 border-t border-[#e6e5dd] pt-8 font-pixel text-[#0d1b2e]"
                style={{ fontSize: '0.8rem', lineHeight: 1.7 }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                id={slug(children)}
                className="mt-8 scroll-mt-24 font-display text-lg font-bold text-[#0d1b2e]"
              >
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mt-5">{children}</p>,
            ul: ({ children }) => <ul className="mt-5 list-disc space-y-2 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="mt-5 list-decimal space-y-2 pl-6">{children}</ol>,
            li: ({ children }) => <li className="pl-1">{children}</li>,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-[#0d1b2e] underline decoration-[#F5C518] decoration-2 underline-offset-2 hover:opacity-70"
                // Only outbound links get the disowned tab; anchors stay in place.
                {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            ),
            // Tables carry the data-category and provider disclosures, which are
            // the widest content here — they scroll rather than break the page.
            table: ({ children }) => (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-[0.9rem]">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-[#e6e5dd] bg-[#f2f1ea] px-3 py-2 text-left align-top font-bold text-[#0d1b2e]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-[#e6e5dd] px-3 py-2 align-top">{children}</td>
            ),
            hr: () => <hr className="mt-10 border-[#e6e5dd]" />,
            blockquote: ({ children }) => (
              <blockquote className="mt-5 border-l-4 border-[#F5C518] pl-4 italic">{children}</blockquote>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
