import { describe, it, expect } from 'vitest'
import {
  canViewShowcase,
  PRIVACY_OPTIONS,
  teamSchoolIds,
  isSafeHttpUrl,
  parseVideoUrl,
  slugify,
  wordCount,
  type ShowcaseForView,
  type ShowcaseViewer,
} from '@/lib/showcase'

// ── canViewShowcase: the full privacy truth table ─────────────────────────────
// Authorization is the showcase's own privacy, evaluated server-side. These
// cases pin the exact matrix so a regression in the rules fails loudly.
describe('canViewShowcase', () => {
  const base: ShowcaseForView = {
    teamId: 'team-1',
    privacyLevel: 'private',
    publishedAt: new Date('2026-01-01'),
    moderationStatus: 'approved',
    teamSchoolIds: ['school-A'],
    takenDown: false,
  }
  const owner: ShowcaseViewer = { userId: 'u1', schoolId: 'school-Z', teamIds: ['team-1'], moderatorTeamIds: []  }
  const sameSchool: ShowcaseViewer = { userId: 'u2', schoolId: 'school-A', teamIds: ['team-9'], moderatorTeamIds: []  }
  const otherSchool: ShowcaseViewer = { userId: 'u3', schoolId: 'school-B', teamIds: ['team-9'], moderatorTeamIds: []  }
  const anon = null

  it('team members always see their own showcase regardless of state/privacy', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'private', publishedAt: null, moderationStatus: 'draft' }, owner)).toBe(true)
  })

  it('non-owners cannot see an unpublished showcase even if public', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'public', publishedAt: null }, sameSchool)).toBe(false)
  })

  it('non-owners cannot see a published-but-unapproved showcase', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'public', moderationStatus: 'pending_review' }, anon)).toBe(false)
  })

  it('public + approved is visible to anyone, including anonymous', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'public' }, anon)).toBe(true)
  })

  // P1-R7: the slug's only unguessable part is six hex characters (24 bits), so
  // it was never a defensible secret for a minor's project. `link_only` now
  // opens ONLY for a caller presenting the 128-bit share token.
  it('link_only opens for the share token and nothing else', () => {
    const sc = { ...base, privacyLevel: 'link_only' as const }
    expect(canViewShowcase(sc, anon, 'share_token')).toBe(true)
    expect(canViewShowcase(sc, anon, 'slug')).toBe(false)
    expect(canViewShowcase(sc, anon)).toBe(false) // default must be the safe one
    expect(canViewShowcase(sc, otherSchool, 'slug')).toBe(false)
  })

  it('public stays reachable by its slug — it is a listed, reviewed identifier', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'public' }, anon, 'slug')).toBe(true)
  })

  it('a share token does not resurrect a private or unapproved showcase', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'private' }, anon, 'share_token')).toBe(false)
    expect(
      canViewShowcase(
        { ...base, privacyLevel: 'link_only', moderationStatus: 'pending_review' },
        anon,
        'share_token',
      ),
    ).toBe(false)
    expect(
      canViewShowcase({ ...base, privacyLevel: 'link_only', publishedAt: null }, anon, 'share_token'),
    ).toBe(false)
  })

  // P0-R2: `User.schoolId` comes from a free-text name any student can type in
  // settings, so a matching schoolId proved nothing. Legacy school_only rows now
  // fail closed to team-only — including for a viewer whose school genuinely
  // matches, which is the attack.
  it('school_only is withdrawn — even a same-school viewer is denied', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'school_only' }, sameSchool)).toBe(false)
    expect(canViewShowcase({ ...base, privacyLevel: 'school_only' }, otherSchool)).toBe(false)
    expect(canViewShowcase({ ...base, privacyLevel: 'school_only' }, anon)).toBe(false)
    expect(canViewShowcase({ ...base, privacyLevel: 'school_only' }, { userId: 'u', schoolId: null, teamIds: [], moderatorTeamIds: []  })).toBe(false)
  })

  it('school_only still shows to the owning team', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'school_only' }, owner)).toBe(true)
  })

  it('school_only is not offered as a publishable option', () => {
    expect(PRIVACY_OPTIONS.map((o) => o.value)).not.toContain('school_only')
  })

  it('private is never visible to non-owners, even approved+published', () => {
    expect(canViewShowcase({ ...base, privacyLevel: 'private' }, sameSchool)).toBe(false)
    expect(canViewShowcase({ ...base, privacyLevel: 'private' }, anon)).toBe(false)
  })

  // P0-R3: a reviewer was sent to the public page, whose pending-content policy
  // admitted team members but not the reviewing teacher — they were asked to
  // approve a submission they could not open.
  describe('moderator preview', () => {
    const ourTeacher: ShowcaseViewer = {
      userId: 't1', schoolId: null, teamIds: [], moderatorTeamIds: ['team-1'],
    }
    const foreignTeacher: ShowcaseViewer = {
      userId: 't2', schoolId: null, teamIds: [], moderatorTeamIds: ['team-9'],
    }

    it('the team’s teacher sees a pending revision', () => {
      expect(
        canViewShowcase({ ...base, privacyLevel: 'public', moderationStatus: 'pending_review' }, ourTeacher),
      ).toBe(true)
    })

    it('the team’s teacher sees an unpublished private draft', () => {
      expect(
        canViewShowcase({ ...base, privacyLevel: 'private', publishedAt: null, moderationStatus: 'draft' }, ourTeacher),
      ).toBe(true)
    })

    it('a teacher of ANOTHER class sees nothing — it is not a global teacher bypass', () => {
      expect(
        canViewShowcase({ ...base, privacyLevel: 'public', moderationStatus: 'pending_review' }, foreignTeacher),
      ).toBe(false)
      expect(
        canViewShowcase({ ...base, privacyLevel: 'private', publishedAt: null }, foreignTeacher),
      ).toBe(false)
    })
  })

  // REFACTOR2 P1-6 — the takedown gate. This is THE single check both public
  // consumers reach (the page/one-pager and the asset-byte route); deleting the
  // three lines it lives in fails every case below.
  describe('takedown', () => {
    const down: ShowcaseForView = { ...base, privacyLevel: 'public', takenDown: true }
    const ourTeacher: ShowcaseViewer = {
      userId: 't1', schoolId: null, teamIds: [], moderatorTeamIds: ['team-1'],
    }

    it('a taken-down public showcase is closed to the world', () => {
      expect(canViewShowcase(down, anon)).toBe(false)
      expect(canViewShowcase(down, sameSchool)).toBe(false)
      expect(canViewShowcase(down, otherSchool)).toBe(false)
    })

    it('closes to the OWNING TEAM too — otherwise the takedown is advisory', () => {
      expect(canViewShowcase(down, owner)).toBe(false)
    })

    it('a share token does not reopen a taken-down link_only showcase', () => {
      expect(canViewShowcase({ ...down, privacyLevel: 'link_only' }, anon, 'share_token')).toBe(false)
    })

    it('the team’s teacher keeps access — a takedown removes the page, not the evidence', () => {
      expect(canViewShowcase(down, ourTeacher)).toBe(true)
    })

    it('a teacher of another class gains nothing from a takedown', () => {
      expect(
        canViewShowcase(down, { userId: 't2', schoolId: null, teamIds: [], moderatorTeamIds: ['team-9'] }),
      ).toBe(false)
    })
  })
})

describe('teamSchoolIds', () => {
  it('collapses to a distinct, non-null list', () => {
    expect(
      teamSchoolIds([
        { user: { schoolId: 'a' } },
        { user: { schoolId: 'a' } },
        { user: { schoolId: null } },
        { user: { schoolId: 'b' } },
      ]),
    ).toEqual(['a', 'b'])
  })
})

describe('isSafeHttpUrl', () => {
  it('accepts http/https', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true)
    expect(isSafeHttpUrl('http://example.com/x')).toBe(true)
  })
  it('rejects other schemes and junk', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,x')).toBe(false)
    expect(isSafeHttpUrl('ftp://x')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
  it('rejects over-long URLs', () => {
    expect(isSafeHttpUrl('https://e.com/' + 'a'.repeat(700))).toBe(false)
  })
})

describe('parseVideoUrl', () => {
  it('parses youtube watch/short/embed/youtu.be to nocookie embed', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      const v = parseVideoUrl(url)
      expect(v?.provider).toBe('youtube')
      expect(v?.videoId).toBe('dQw4w9WgXcQ')
      expect(v?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    }
  })
  it('parses vimeo numeric ids', () => {
    const v = parseVideoUrl('https://vimeo.com/123456789')
    expect(v).toEqual({
      provider: 'vimeo',
      videoId: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    })
  })
  it('rejects unknown hosts and unsafe input', () => {
    expect(parseVideoUrl('https://evil.com/watch?v=abcdef')).toBeNull()
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull()
    expect(parseVideoUrl('https://youtube.com/watch?v=<script>')).toBeNull()
  })
})

describe('slugify', () => {
  it('lowercases, strips punctuation, trims, caps length', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('  ---x---  ')).toBe('x')
    expect(slugify('')).toBe('project')
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60)
  })
})

describe('wordCount', () => {
  it('counts whitespace-delimited words', () => {
    expect(wordCount('')).toBe(0)
    expect(wordCount('   ')).toBe(0)
    expect(wordCount('one two   three')).toBe(3)
  })
})
