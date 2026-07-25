import { describe, it, expect } from 'vitest'
import { canonicalGoogleDocUrl, extractGoogleDocId } from '@/lib/research-plan/google-doc'

const REAL_ID = '1AbC_dEf-GhIjKlMnOpQrStUvWxYz0123456789'

describe('extractGoogleDocId — REFACTOR2 P1-S12', () => {
  it('accepts a real Google Docs URL, with or without a trailing path/query', () => {
    expect(extractGoogleDocId(`https://docs.google.com/document/d/${REAL_ID}`)).toBe(REAL_ID)
    expect(extractGoogleDocId(`https://docs.google.com/document/d/${REAL_ID}/edit?usp=sharing`)).toBe(REAL_ID)
    expect(extractGoogleDocId(`  https://docs.google.com/document/d/${REAL_ID}/edit  `)).toBe(REAL_ID)
  })

  // The regex this replaced matched the Google path ANYWHERE in the string, so
  // each of these passed validation. We then fetched the genuine doc by id but
  // stored the pasted URL, which the teacher view renders as "Open research
  // plan" — a phishing destination behind trusted wording.
  it('rejects an attacker URL that merely contains a Google Docs path', () => {
    for (const hostile of [
      `https://evil.example/?next=docs.google.com/document/d/${REAL_ID}`,
      `https://evil.example/docs.google.com/document/d/${REAL_ID}`,
      `https://docs.google.com.evil.example/document/d/${REAL_ID}`,
      `https://evil.example#docs.google.com/document/d/${REAL_ID}`,
      `http://docs.google.com/document/d/${REAL_ID}`,
      'not a url at all',
    ]) {
      expect(extractGoogleDocId(hostile)).toBeNull()
    }
  })

  // WHATWG parsing resolves dot segments before we ever see the path, so this
  // normalises to the genuine document and is correctly accepted — the same
  // normalisation a browser would apply.
  it('normalises dot segments rather than being confused by them', () => {
    expect(extractGoogleDocId(`https://docs.google.com/../document/d/${REAL_ID}`)).toBe(REAL_ID)
  })

  it('canonicalises to a URL derived only from the id', () => {
    expect(canonicalGoogleDocUrl(REAL_ID)).toBe(
      `https://docs.google.com/document/d/${REAL_ID}/edit`,
    )
  })
})
