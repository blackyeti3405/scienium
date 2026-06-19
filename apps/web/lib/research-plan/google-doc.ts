/**
 * Google Doc text fetch (Feature 2A — paste-a-link fallback).
 *
 * For now a student pastes an "Anyone with the link" Google Doc URL and we fetch
 * its published plain text via the public export endpoint — no OAuth. The whole
 * surface is this one abstraction so swapping in the Docs API after Google OAuth
 * lands (see TODO.md) is a localized change: keep `fetchGoogleDocText` and only
 * change how the text is retrieved.
 */

/** Pull the document id out of a Google Docs URL, or null if it isn't one. */
export function extractGoogleDocId(url: string): string | null {
  const m = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
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
export async function fetchGoogleDocText(url: string): Promise<string> {
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
  return text
}
