import { describe, expect, it } from 'vitest'
import sanitizeHtml from 'sanitize-html'
import { TITLE_SANITIZE_OPTS, sanitizeAbstract } from './sanitize'

/**
 * The single XSS boundary for externally-sourced HTML (Wikipedia articles,
 * arXiv/PubMed abstracts, MedlinePlus topics) — everything here feeds
 * dangerouslySetInnerHTML on pages served to a classroom of minors.
 *
 * These tests are the tripwire the module's own header asks for ("Do NOT fork a
 * looser allowlist"): loosening a scheme, admitting an attribute, or a
 * sanitize-html option typo (which fails OPEN — unknown keys are ignored) must
 * fail CI, not a pentest.
 */

describe('sanitizeAbstract — hostile input', () => {
  it('strips <script> entirely', () => {
    expect(sanitizeAbstract('safe<script>alert(1)</script>text')).toBe('safetext')
  })

  it('drops inline event handlers', () => {
    const out = sanitizeAbstract('<p onclick="alert(1)" onmouseover="x()">hi</p>')
    expect(out).toBe('<p>hi</p>')
  })

  it('drops an img with an onerror payload (tag not in allowlist)', () => {
    expect(sanitizeAbstract('<img src=x onerror=alert(1)>after')).toBe('after')
  })

  it('removes javascript: hrefs but keeps the anchor text', () => {
    const out = sanitizeAbstract('<a href="javascript:alert(1)">click</a>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('click')
  })

  it('removes data: hrefs', () => {
    const out = sanitizeAbstract('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toContain('data:')
  })

  it('removes protocol-relative hrefs (//evil.example)', () => {
    const out = sanitizeAbstract('<a href="//evil.example/x">x</a>')
    expect(out).not.toContain('//evil.example')
  })

  it('drops iframe/object/style tags', () => {
    expect(sanitizeAbstract('<iframe src="https://evil.example"></iframe>ok')).toBe('ok')
    expect(sanitizeAbstract('<object data="x"></object>ok')).toBe('ok')
    expect(sanitizeAbstract('<style>*{display:none}</style>ok')).toBe('ok')
  })

  it('drops inline style attributes', () => {
    expect(sanitizeAbstract('<p style="position:fixed">hi</p>')).toBe('<p>hi</p>')
  })
})

describe('sanitizeAbstract — legitimate academic markup survives', () => {
  it('keeps inline formatting used by real abstracts', () => {
    const input = '<i>E. coli</i> at 37<sup>o</sup>C with H<sub>2</sub>O'
    expect(sanitizeAbstract(input)).toBe(input)
  })

  it('keeps https links with their href', () => {
    const input = '<a href="https://doi.org/10.1000/x">doi</a>'
    expect(sanitizeAbstract(input)).toBe(input)
  })

  it('keeps structural article markup (headings, lists, tables)', () => {
    const input = '<h2>Methods</h2><ul><li>step</li></ul>'
    expect(sanitizeAbstract(input)).toBe(input)
  })
})

/**
 * These used to restate the option literals (`allowedSchemes` deep-equals
 * ['http','https','mailto'], `allowedTags` does not contain 'script', …). A
 * restatement of a config object in the same module cannot fail on a
 * regression — it changes with the thing it is guarding. The scheme and
 * attribute halves are already covered by the EXECUTED hostile-input cases
 * above; what remained uncovered was the long tail of embedding tags, so this
 * runs them through the sanitizer instead of reading the array.
 */
describe('every script-capable or embedding tag is discarded, not just the famous ones', () => {
  it.each(['script', 'iframe', 'object', 'embed', 'style', 'img', 'svg', 'form', 'input', 'base', 'link', 'meta', 'template', 'math'])(
    '<%s> is stripped',
    (tag) => {
      const out = sanitizeAbstract(`before<${tag} src="x" onerror="alert(1)">payload</${tag}>after`)
      expect(out).not.toContain(`<${tag}`)
      expect(out).not.toContain('onerror')
      expect(out).toContain('before')
      expect(out).toContain('after')
    },
  )

  it('an attribute the allowlist does not name is dropped on an ALLOWED tag', () => {
    // `formaction`/`srcdoc`/`xlink:href` are the shapes that turn a permitted
    // tag into a payload if the attribute allowlist ever widens.
    const out = sanitizeAbstract('<p formaction="javascript:x" srcdoc="<script>x</script>" id="x">hi</p>')
    expect(out).toBe('<p>hi</p>')
  })
})

describe('allowlist option pins', () => {
  it('title allowlist is inline-only with zero attributes', () => {
    expect(TITLE_SANITIZE_OPTS.allowedTags).toEqual(['i', 'b', 'em', 'strong', 'sub', 'sup', 'span'])
    expect(TITLE_SANITIZE_OPTS.allowedAttributes).toEqual({})
    const out = sanitizeHtml('<span onclick="x()"><a href="https://x">t</a></span>', TITLE_SANITIZE_OPTS)
    expect(out).toBe('<span>t</span>')
  })
})
