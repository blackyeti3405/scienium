/**
 * Showcase Wing — shared config, privacy rules, and safe link handling.
 *
 * The Showcase is the end of the arc: a team publishes its completed project as a
 * public portfolio (title, abstract, board image, visuals, a video link, repo/report
 * links). Public viewing is governed entirely by the showcase's own privacy level,
 * checked server-side — image bytes are streamed from PRIVATE R2 through an
 * access-controlled route, never a public bucket or signed URL (consistent with the
 * rest of NOVA Lab's storage posture).
 *
 * Security notes:
 *  - Video is paste-only and host-allowlisted (YouTube/Vimeo). We extract the id and
 *    build the embed src ourselves, so a pasted URL can never inject an arbitrary
 *    iframe/script. No API key, mirroring Discovery.
 *  - All other links are validated to be plain http(s) URLs and rendered as links
 *    (rel="noopener noreferrer"), never embedded.
 *  - Title/abstract are rendered as text, never HTML.
 */

// NOTE: this module is import-safe from client components (ShowcaseEditor pulls
// in PRIVACY_OPTIONS / MAX_VISUALS / PrivacyLevel). Anything that needs Node's
// `crypto` (slug + view fingerprint) lives in the server-only sibling
// lib/showcase-server.ts so it never reaches the browser bundle.

// ─── Asset model ──────────────────────────────────────────────────────────────

/**
 * The competition showcase format. Required: board (PDF), quad chart (PDF/image),
 * and the ~2-minute video (link). Optional: a GitHub link, extra demo videos, and
 * supplemental-information links.
 */
export type ShowcaseAssetType = 'board' | 'quad_chart' | 'video' | 'repo_link' | 'demo_video' | 'supplement'

/** True for single-slot asset types (uploading/adding replaces the existing one). */
export const SINGLE_SLOT: Record<ShowcaseAssetType, boolean> = {
  board: true,
  quad_chart: true,
  video: true,
  repo_link: true,
  demo_video: false,
  supplement: false,
}

/** Caps for the optional multi-slot links. */
export const MAX_DEMO_VIDEOS = 4
export const MAX_SUPPLEMENTS = 6

export const SHORT_TITLE_MAX = 50
export const TITLE_MAX = 300
export const ABSTRACT_WORD_MAX = 250
// Generous character hard-cap (zod) — the real limit is the 250-word check.
export const ABSTRACT_MAX = 4000
export const LINK_LABEL_MAX = 80
export const URL_MAX = 600

/** Counts whitespace-delimited words (used to enforce the 250-word abstract). */
export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export type PrivacyLevel = 'public' | 'school_only' | 'link_only' | 'private'

export const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; blurb: string }[] = [
  { value: 'private', label: 'Private', blurb: 'Only your team can see it. A working draft.' },
  { value: 'link_only', label: 'Anyone with the link', blurb: 'Unlisted — viewable by link, not in the gallery.' },
  { value: 'school_only', label: 'Your school', blurb: 'Signed-in students at your school can view it.' },
  { value: 'public', label: 'Public', blurb: 'Submitted for teacher review — appears in the public gallery once approved.' },
]

export interface ShowcaseViewer {
  userId: string | null
  schoolId: string | null
  /** Team ids the viewer belongs to (for owner/team access to private drafts). */
  teamIds: string[]
}

export interface ShowcaseForView {
  teamId: string
  privacyLevel: PrivacyLevel
  publishedAt: Date | null
  moderationStatus: string
  /** Distinct school ids of the team's members (Team has no school of its own). */
  teamSchoolIds: string[]
}

/**
 * Whether `viewer` may see a showcase's PUBLIC page. Team members always can
 * (preview their own draft); everyone else needs the showcase published+approved
 * and the privacy level to admit them.
 */
export function canViewShowcase(sc: ShowcaseForView, viewer: ShowcaseViewer | null): boolean {
  const isOwner = !!viewer && viewer.teamIds.includes(sc.teamId)
  if (isOwner) return true

  const live = sc.publishedAt != null && sc.moderationStatus === 'approved'
  if (!live) return false

  switch (sc.privacyLevel) {
    case 'public':
    case 'link_only':
      return true
    case 'school_only':
      return !!viewer?.schoolId && sc.teamSchoolIds.includes(viewer.schoolId)
    case 'private':
      return false
  }
}

/** Collapses team members' school ids to a distinct, non-null list. */
export function teamSchoolIds(members: { user: { schoolId: string | null } }[]): string[] {
  return [...new Set(members.map((m) => m.user.schoolId).filter((s): s is string => !!s))]
}

// ─── Slug ───────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'project'
}

// ─── Safe links ───────────────────────────────────────────────────────────────

/** True for a plain absolute http(s) URL within length bounds. */
export function isSafeHttpUrl(raw: string): boolean {
  if (!raw || raw.length > URL_MAX) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname
}

export interface ParsedVideo {
  provider: 'youtube' | 'vimeo'
  videoId: string
  embedUrl: string
}

/**
 * Parses a pasted video URL into an allowlisted provider + id. Returns null for
 * anything that isn't a recognized YouTube/Vimeo link, so we never embed an
 * arbitrary origin. The id is constrained to a safe character set.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  if (!isSafeHttpUrl(raw)) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const safeId = (id: string, re: RegExp) => (re.test(id) ? id : null)

  // YouTube: watch?v=, youtu.be/<id>, /embed/<id>, /shorts/<id>
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    let id: string | null = null
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/]+)/)
      if (m) id = m[2]
    }
    const ok = id && safeId(id, /^[A-Za-z0-9_-]{6,20}$/)
    if (ok) return { provider: 'youtube', videoId: ok, embedUrl: `https://www.youtube-nocookie.com/embed/${ok}` }
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    const ok = safeId(id, /^[A-Za-z0-9_-]{6,20}$/)
    if (ok) return { provider: 'youtube', videoId: ok, embedUrl: `https://www.youtube-nocookie.com/embed/${ok}` }
  }
  // Vimeo: vimeo.com/<digits>
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(\d{6,12})/)
    const ok = m && safeId(m[1], /^\d{6,12}$/)
    if (ok) return { provider: 'vimeo', videoId: ok, embedUrl: `https://player.vimeo.com/video/${ok}` }
  }
  return null
}

