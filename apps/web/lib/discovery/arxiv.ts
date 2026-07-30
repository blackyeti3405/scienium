/**
 * Strip the version suffix from an arXiv id so v1/v2 of the same work dedup to one
 * key. `2401.01234v2` → `2401.01234`; old-style `hep-th/0101001v1` → `hep-th/0101001`.
 */
export function normalizeArxivId(raw: string): string {
  return raw
    .trim()
    .replace(/^arxiv:/i, '')
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    .replace(/v\d+$/i, '')
}
