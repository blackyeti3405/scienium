/**
 * Showcase Wing — shared config, privacy rules, and safe link handling.
 *
 * The Showcase is the end of the arc: a team publishes its completed project as a
 * public portfolio (title, abstract, board image, visuals, a video link, repo/report
 * links). Public viewing is governed entirely by the showcase's own privacy level,
 * checked server-side — image bytes are streamed from PRIVATE R2 through an
 * access-controlled route, never a public bucket or signed URL (consistent with the
 * rest of scienium's storage posture).
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
export type ShowcaseAssetType =
  | 'board'
  | 'quad_chart'
  | 'video'
  | 'repo_link'
  | 'demo_video'
  | 'supplement'
  | 'figure'

/** True for single-slot asset types (uploading/adding replaces the existing one). */
export const SINGLE_SLOT: Record<ShowcaseAssetType, boolean> = {
  board: true,
  quad_chart: true,
  video: true,
  repo_link: true,
  demo_video: false,
  supplement: false,
  // One Data Terminal figure per showcase — attaching a new one replaces it.
  // ponytail: single slot reuses the asset route's existing replace path; add a
  // MULTI_CAP figure gallery (mirroring the link route) only if teams need several.
  figure: true,
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

/**
 * Selectable privacy levels. `school_only` is NOT offered — see
 * `canViewShowcase` (REFACTOR2 P0-R2). The union above still carries it so
 * rows written before it was withdrawn keep typechecking.
 */
export const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; blurb: string }[] = [
  { value: 'private', label: 'Private', blurb: 'Only your team can see it. A working draft.' },
  { value: 'link_only', label: 'Anyone with the link', blurb: 'Unlisted — viewable only through your secret share link, not in the gallery.' },
  { value: 'public', label: 'Public', blurb: 'Submitted for teacher review — appears in the public gallery once approved.' },
]

// ─── Abuse reporting (REFACTOR2 P1-6) ────────────────────────────────────────

/**
 * The complete reporting vocabulary, mirroring the `ShowcaseReportReason` enum
 * in schema.prisma. Deliberately short and deliberately closed: a report is a
 * ROUTING signal for a teacher, not a message, so there is no free-text field
 * anywhere in this feature — nothing a reporter types can reach a moderation
 * screen, a log line, or the security ledger.
 *
 * Doubles as the takedown vocabulary: `Showcase.takedownReason` holds one of
 * these, so "why was it reported" and "why was it removed" are the same list.
 */
export const SHOWCASE_REPORT_REASONS = [
  'inappropriate',
  'harassment',
  'privacy',
  'copyright',
  'spam',
  'other',
] as const

export type ShowcaseReportReason = (typeof SHOWCASE_REPORT_REASONS)[number]

/** Reader-facing labels for the report control and the moderation queue. */
export const REPORT_REASON_LABELS: Record<ShowcaseReportReason, string> = {
  inappropriate: 'Inappropriate or unsafe content',
  harassment: 'Bullying or harassment',
  privacy: 'Personal information about someone',
  copyright: "Someone else's work used without permission",
  spam: 'Spam or advertising',
  other: 'Something else',
}

export interface ShowcaseViewer {
  userId: string | null
  schoolId: string | null
  /** Team ids the viewer belongs to (for owner/team access to private drafts). */
  teamIds: string[]
  /**
   * Team ids the viewer is the TEACHER of. A reviewer must be able to inspect
   * the exact revision they are being asked to approve — including the board,
   * quad chart, and video (REFACTOR2 P0-R3). Before this, "View submission"
   * pointed at the public page, whose pending-content policy admitted team
   * members but not the reviewing teacher.
   */
  moderatorTeamIds: string[]
}

export interface ShowcaseForView {
  teamId: string
  privacyLevel: PrivacyLevel
  publishedAt: Date | null
  moderationStatus: string
  /** Distinct school ids of the team's members (Team has no school of its own). */
  teamSchoolIds: string[]
  /** `Showcase.takedownAt != null` — staff pulled this from public serving. */
  takenDown: boolean
}

/**
 * How the caller addressed this showcase.
 *
 * `slug` is a PUBLIC identifier (title-derived + six hex characters).
 * `share_token` means the caller presented the 128-bit secret — the only thing
 * that grants anonymous `link_only` access (REFACTOR2 P1-R7).
 */
export type ShowcaseAccess = 'slug' | 'share_token'

/**
 * Whether `viewer` may see a showcase's PUBLIC page. Team members always can
 * (preview their own draft); everyone else needs the showcase published+approved
 * and the privacy level to admit them **through the route they used**.
 */
export function canViewShowcase(
  sc: ShowcaseForView,
  viewer: ShowcaseViewer | null,
  via: ShowcaseAccess = 'slug',
): boolean {
  // TAKEDOWN (REFACTOR2 P1-6) — first, and above the owner check, because it is
  // the one state the owning team must not be able to keep serving. Only the
  // moderating teacher gets through, and only so the content stays REVIEWABLE:
  // a takedown removes the page, not the evidence, and an investigation that
  // has to go to the database to see what was reported is the "ad hoc database
  // change" this item exists to eliminate.
  //
  // This is THE single gate. Both public consumers (the page/one-pager and the
  // asset-byte route) reach it through `canViewShowcase`, so the bytes cannot
  // outlive the page; the gallery, which lists rather than views, filters on
  // `takedownAt: null` in its own query.
  if (sc.takenDown) return viewer?.moderatorTeamIds.includes(sc.teamId) ?? false

  const isOwner = !!viewer && viewer.teamIds.includes(sc.teamId)
  if (isOwner) return true

  // Moderator preview: the teacher of this team sees every revision, in every
  // state, exactly as stored. Scoped to teams they teach — never a global
  // teacher bypass.
  if (viewer?.moderatorTeamIds.includes(sc.teamId)) return true

  const live = sc.publishedAt != null && sc.moderationStatus === 'approved'
  if (!live) return false

  switch (sc.privacyLevel) {
    case 'public':
      // Listed in the gallery and reviewed — the slug is enough.
      return true
    case 'link_only':
      // Unlisted. The slug is NOT the secret: its only random part is six hex
      // characters (24 bits), which request limiting slows but cannot turn into
      // a capability. Only the 128-bit share token opens this (P1-R7).
      return via === 'share_token'
    case 'school_only':
      // WITHDRAWN — fails closed to private (REFACTOR2 P0-R2). `User.schoolId`
      // is self-asserted: `resolveSchool()` upserts any typed name and settings
      // let a student change it at will, so "same schoolId" proved nothing but
      // that the viewer typed the victim school's name. Restoring this level
      // requires a *verified* SchoolMembership, not a profile string. Existing
      // school_only rows degrade to team-only until then.
      return false
    case 'private':
      return false
  }
}

/** Collapses team members' school ids to a distinct, non-null list. */
export function teamSchoolIds(members: { user: { schoolId: string | null } }[]): string[] {
  return [...new Set(members.map((m) => m.user.schoolId).filter((s): s is string => !!s))]
}

/** Builds the canViewShowcase() input from a raw showcase record. */
export function toShowcaseForView(sc: {
  teamId: string
  privacyLevel: string
  publishedAt: Date | null
  moderationStatus: string
  takedownAt: Date | null
  team: { members: { user: { schoolId: string | null } }[] }
}): ShowcaseForView {
  return {
    teamId: sc.teamId,
    privacyLevel: sc.privacyLevel as PrivacyLevel,
    publishedAt: sc.publishedAt,
    moderationStatus: sc.moderationStatus,
    teamSchoolIds: teamSchoolIds(sc.team.members),
    takenDown: sc.takedownAt != null,
  }
}

// ─── Slug ───────────────────────────────────────────────────────────────────

export function slugify(input: string, fallback = 'project'): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || fallback
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

