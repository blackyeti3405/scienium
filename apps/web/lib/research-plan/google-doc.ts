/**
 * Google Doc text fetch (Feature 2A — paste-a-link fallback).
 *
 * For now a student pastes an "Anyone with the link" Google Doc URL and we fetch
 * its published plain text via the public export endpoint — no OAuth. The whole
 * surface is this one abstraction so swapping in the Docs API after Google OAuth
 * lands (see docs/TODO.md) is a localized change: keep `fetchGoogleDocText` and only
 * change how the text is retrieved.
 */

/**
 * Pull the document id out of a Google Docs URL, or null if it isn't one.
 *
 * Parses the URL rather than searching it for a substring (REFACTOR2 P1-S12).
 * The old regex matched `docs.google.com/document/d/<id>` ANYWHERE in the
 * string, so `https://evil.example/?next=docs.google.com/document/d/<real-id>`
 * passed validation — we then fetched the real Google export by id but stored
 * the attacker's URL, which the teacher view renders as "Open research plan".
 */
export function extractGoogleDocId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.google.com') return null
  const m = parsed.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)
  return m ? m[1]! : null
}

/** The only URL we persist/display for a doc — never the pasted string. */
export function canonicalGoogleDocUrl(id: string): string {
  return `https://docs.google.com/document/d/${id}/edit`
}

export class GoogleDocError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/**
 * Fetch the plain-text export of an "anyone with the link" Google Doc.
 * Throws GoogleDocError with a user-facing message on bad URLs / sharing issues.
 */
export async function fetchGoogleDocText(
  url: string,
): Promise<{ text: string; canonicalUrl: string }> {
  const id = extractGoogleDocId(url)
  if (!id) {
    throw new GoogleDocError('That is not a Google Docs link', 400)
  }

  const exportUrl = `https://docs.google.com/document/d/${id}/export?format=txt`

  let res: Response
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    res = await fetch(exportUrl, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(timeout)
  } catch (err) {
    throw new GoogleDocError(`Could not reach Google Docs (${String(err)})`, 502)
  }

  // A doc that isn't link-shared redirects to a login/HTML page rather than text.
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok || contentType.includes('text/html')) {
    throw new GoogleDocError(
      'Could not read that doc. Set sharing to "Anyone with the link" and try again.',
      403,
    )
  }

  const text = (await res.text()).trim()
  if (!text) {
    throw new GoogleDocError('That document appears to be empty', 422)
  }
  return { text, canonicalUrl: canonicalGoogleDocUrl(id) }
}
