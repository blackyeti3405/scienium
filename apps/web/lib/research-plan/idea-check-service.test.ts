import { describe, it, expect } from 'vitest'
import { sanitizePriorWork } from './idea-check-service'

/**
 * `sanitizePriorWork` is the server-side half of §0.7's IdeaCheckView finding
 * ("model/provider URLs go straight to href"): `priorWork` is JSON the LLM
 * itself wrote, so its `url` gets the same http(s)-only gate the client's
 * `SafeExternalLink` enforces a second time. Reproduced against the
 * pre-fix code (a bare `parsed.priorWork.slice(0, 8)` with no url check) by
 * confirming a `javascript:` url passed through untouched before this change.
 */
describe('sanitizePriorWork', () => {
  it('keeps a plain http(s) url untouched', () => {
    const out = sanitizePriorWork([{ title: 'A prior project', url: 'https://example.com/paper' }])
    expect(out[0].url).toBe('https://example.com/paper')
  })

  it('drops a javascript: url but keeps the rest of the entry', () => {
    const out = sanitizePriorWork([
      { title: 'Malicious', url: 'javascript:alert(document.cookie)', note: 'still useful text' },
    ])
    expect(out[0].url).toBeUndefined()
    expect(out[0].title).toBe('Malicious')
    expect(out[0].note).toBe('still useful text')
  })

  it('drops a data: url', () => {
    const out = sanitizePriorWork([{ title: 'x', url: 'data:text/html,<script>1</script>' }])
    expect(out[0].url).toBeUndefined()
  })

  it('leaves an entry with no url alone', () => {
    const out = sanitizePriorWork([{ title: 'No link' }])
    expect(out[0].url).toBeUndefined()
    expect(out[0].title).toBe('No link')
  })
})
