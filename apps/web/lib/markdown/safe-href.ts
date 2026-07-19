/**
 * Link policy for markdown rendered from untrusted text (LLM output, student
 * writing). Kept in a plain `.ts` module — no JSX — so it is directly testable
 * in the node test environment, matching how the other pure client helpers are
 * split out (`components/literature/quizDerive.ts`, `synthesisSlug.ts`).
 *
 * `react-markdown` does not render raw HTML unless `rehype-raw` is enabled (it
 * is not, and `test/safe-markdown.test.ts` pins that), so the residual sink is
 * link-shaped rather than script-shaped:
 *
 *   - `[click](javascript:alert(1))` — a scheme the renderer would otherwise
 *     hand straight to `href`;
 *   - `[safe-looking](https://evil.example)` — a plausible link inside a model
 *     reply that a student, or a teacher reviewing that reply, may click.
 */

/** Schemes a rendered link may use. Everything else is dropped. */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:']

/**
 * Resolve an href to a safe value, or `undefined` to drop the link entirely
 * (the label still renders as plain text — the reader sees the words, but has
 * nothing to click).
 */
export function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const trimmed = href.trim()
  // Relative and fragment links stay in-app and cannot carry a scheme.
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  try {
    // A base is required so a relative href parses; an absolute href ignores it.
    const url = new URL(trimmed, 'https://scienium.app')
    return ALLOWED_SCHEMES.includes(url.protocol) ? trimmed : undefined
  } catch {
    return undefined
  }
}
