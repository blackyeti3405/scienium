import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { safeHref } from '@/lib/markdown/safe-href'

/**
 * Markdown render policy for untrusted text (LLM output + student writing).
 *
 * `react-markdown` does not render raw HTML without `rehype-raw` (absent), so
 * the residual sink is link-shaped: a `javascript:` href, or a plausible link
 * to an attacker's page inside a model reply a teacher is reading. `safeHref`
 * is the load-bearing part of the policy.
 *
 * The sweep at the bottom is the part that actually keeps this true: a new
 * component rendering `<ReactMarkdown>` directly would bypass the whole policy,
 * and nothing else would notice.
 */

describe('safeHref — scheme allowlist', () => {
  it.each(['https://example.com', 'http://example.com', 'mailto:a@b.com'])(
    'allows %s',
    (href) => {
      expect(safeHref(href)).toBe(href)
    },
  )

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)  ',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('drops %j', (href) => {
    expect(safeHref(href)).toBeUndefined()
  })

  it('keeps in-app relative and fragment links', () => {
    expect(safeHref('/lab')).toBe('/lab')
    expect(safeHref('#section')).toBe('#section')
  })

  it('drops an empty or missing href', () => {
    expect(safeHref(undefined)).toBeUndefined()
    expect(safeHref('')).toBeUndefined()
  })

  it('a protocol-relative URL resolves to https, not a scheme bypass', () => {
    // '//evil.example' parses against the base as https://evil.example — it is
    // an ordinary external link, not a javascript: smuggle.
    expect(safeHref('//evil.example')).toBe('//evil.example')
  })
})

describe('every untrusted-markdown sink uses SafeMarkdown', () => {
  // A policy one component forgets is not a policy. This is the tripwire.
  const WEB_ROOT = join(__dirname, '..')

  function collectTsx(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) out.push(...collectTsx(p))
      else if (entry.endsWith('.tsx')) out.push(p)
    }
    return out
  }

  const files = collectTsx(join(WEB_ROOT, 'components')).map((p) => relative(WEB_ROOT, p))

  it('finds the component tree (sweep is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('SafeMarkdown is the ONLY component importing react-markdown', () => {
    const importers = files.filter((f) =>
      /from ['"]react-markdown['"]/.test(readFileSync(join(WEB_ROOT, f), 'utf8')),
    )
    expect(importers).toEqual(['components/ui/SafeMarkdown.tsx'])
  })

  it('SafeMarkdown never enables rehype-raw (which would restore the HTML sink)', () => {
    // Assert on an actual import / plugin wiring, not a mention — the file's own
    // doc comment explains why rehype-raw is absent, and a bare /rehype-raw/
    // match would fail on that explanation.
    const src = readFileSync(join(WEB_ROOT, 'components', 'ui', 'SafeMarkdown.tsx'), 'utf8')
    expect(src).not.toMatch(/from ['"]rehype-raw['"]/)
    expect(src).not.toMatch(/rehypePlugins/)
  })

  it('no component anywhere imports rehype-raw', () => {
    const importers = files.filter((f) =>
      /from ['"]rehype-raw['"]/.test(readFileSync(join(WEB_ROOT, f), 'utf8')),
    )
    expect(importers).toEqual([])
  })

  it('SafeMarkdown keeps its link and image overrides', () => {
    const src = readFileSync(join(WEB_ROOT, 'components', 'ui', 'SafeMarkdown.tsx'), 'utf8')
    expect(src).toMatch(/components=\{\{/)
    expect(src).toMatch(/noopener noreferrer/)
    expect(src).toMatch(/img\s*\(/)
  })
})
