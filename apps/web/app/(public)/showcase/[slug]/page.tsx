import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { Github, Paperclip, ExternalLink, Eye } from 'lucide-react'
import { db } from '@/lib/db'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'
import {
  canViewShowcase,
  teamSchoolIds,
  type ShowcaseViewer,
  type ShowcaseForView,
  type PrivacyLevel,
} from '@/lib/showcase'
import { viewFingerprint } from '@/lib/showcase-server'

interface Props {
  params: { slug: string }
}

async function resolveViewer(): Promise<ShowcaseViewer | null> {
  const { userId } = await auth()
  if (!userId) return null
  const u = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { schoolId: true, teamMemberships: { select: { teamId: true } } },
  })
  if (!u) return { userId, schoolId: null, teamIds: [] }
  return { userId, schoolId: u.schoolId, teamIds: u.teamMemberships.map((m) => m.teamId) }
}

async function loadShowcase(slug: string) {
  return db.showcase.findUnique({
    where: { slug },
    include: {
      assets: { orderBy: { uploadedAt: 'asc' } },
      team: {
        select: {
          name: true,
          labType: true,
          members: { select: { user: { select: { schoolId: true } } } },
        },
      },
      _count: { select: { views: true } },
    },
  })
}

export async function generateMetadata({ params }: Props) {
  const sc = await loadShowcase(params.slug)
  const viewer = await resolveViewer()
  if (!sc || !canViewShowcase(toForView(sc), viewer)) {
    return { title: 'Showcase' }
  }
  const headline = sc.shortTitle || sc.title
  // OG image must be an image — use the quad chart only when it's an image file.
  const quad = sc.assets.find((a) => a.assetType === 'quad_chart')
  const ogImage = quad && quad.fileUrl && !quad.fileUrl.endsWith('.pdf')
    ? [{ url: `/api/showcase/public/asset?id=${quad.id}` }]
    : undefined
  return {
    title: headline,
    description: sc.abstract.slice(0, 200),
    openGraph: {
      title: headline,
      description: sc.abstract.slice(0, 200),
      images: ogImage,
    },
  }
}

function toForView(sc: {
  teamId: string
  privacyLevel: string
  publishedAt: Date | null
  moderationStatus: string
  team: { members: { user: { schoolId: string | null } }[] }
}): ShowcaseForView {
  return {
    teamId: sc.teamId,
    privacyLevel: sc.privacyLevel as PrivacyLevel,
    publishedAt: sc.publishedAt,
    moderationStatus: sc.moderationStatus,
    teamSchoolIds: teamSchoolIds(sc.team.members),
  }
}

export default async function PublicShowcasePage({ params }: Props) {
  const sc = await loadShowcase(params.slug)
  const viewer = await resolveViewer()

  if (!sc || !canViewShowcase(toForView(sc), viewer)) notFound()

  // Record a view (deduped per visitor per day; never stores a raw IP). Skip the
  // owning team's own visits so the count reflects real audience.
  const isOwner = !!viewer && viewer.teamIds.includes(sc.teamId)
  if (!isOwner) {
    try {
      const h = headers()
      const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim()
      const fp = viewFingerprint(ip, h.get('user-agent') ?? '')
      const seen = await db.showcaseView.findFirst({
        where: { showcaseId: sc.id, visitorFingerprint: fp },
        select: { id: true },
      })
      if (!seen) await db.showcaseView.create({ data: { showcaseId: sc.id, visitorFingerprint: fp } })
    } catch {
      // View tracking must never break the page.
    }
  }

  const assetUrl = (id: string) => `/api/showcase/public/asset?id=${id}`
  const isPdf = (fileUrl: string | null) => !!fileUrl && fileUrl.endsWith('.pdf')
  const embedOf = (a?: { metadataJson: unknown }) =>
    a && typeof a.metadataJson === 'object' && a.metadataJson
      ? (a.metadataJson as { embedUrl?: string }).embedUrl
      : undefined

  const board = sc.assets.find((a) => a.assetType === 'board')
  const quad = sc.assets.find((a) => a.assetType === 'quad_chart')
  const video = sc.assets.find((a) => a.assetType === 'video')
  const repo = sc.assets.find((a) => a.assetType === 'repo_link')
  const demos = sc.assets.filter((a) => a.assetType === 'demo_video')
  const supplements = sc.assets.filter((a) => a.assetType === 'supplement')
  const labType = sc.team.labType as LabType | null
  const videoEmbed = embedOf(video)
  const headline = sc.shortTitle || sc.title

  return (
    <article className="sc-show">
      <header className="sc-show__hero">
        {labType && <span className="sc-show__lab font-pixel">{LAB_TYPE_LABELS[labType]}</span>}
        <h1 className="sc-show__title">{headline}</h1>
        {sc.shortTitle && sc.title && sc.title !== sc.shortTitle && (
          <p className="sc-show__fulltitle">{sc.title}</p>
        )}
        <div className="sc-show__meta">
          <span>by {sc.team.name}</span>
          <span className="sc-show__dot">·</span>
          <span className="inline-flex items-center gap-1">
            <Eye size={13} /> {sc._count.views.toLocaleString()} views
          </span>
        </div>
      </header>

      {/* Quad chart — the one-page summary, shown prominently. */}
      {quad && (
        <div className="sc-show__quad">
          {isPdf(quad.fileUrl) ? (
            <div className="sc-show__pdf">
              <iframe src={assetUrl(quad.id)} title="Quad chart" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(quad.id)} alt={`${headline} quad chart`} />
          )}
        </div>
      )}

      <section className="sc-show__section">
        <h2 className="sc-show__h2">Abstract</h2>
        <p className="sc-show__abstract">{sc.abstract}</p>
      </section>

      {videoEmbed && (
        <section className="sc-show__section">
          <h2 className="sc-show__h2">Video</h2>
          <div className="sc-show__video">
            <iframe
              src={videoEmbed}
              title="Project video"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
      )}

      {board && (
        <section className="sc-show__section">
          <h2 className="sc-show__h2">Project board</h2>
          {isPdf(board.fileUrl) ? (
            <div className="sc-show__pdf sc-show__pdf--tall">
              <iframe src={assetUrl(board.id)} title="Project board" />
            </div>
          ) : (
            <div className="sc-show__board">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(board.id)} alt={`${headline} project board`} />
            </div>
          )}
          <a href={assetUrl(board.id)} target="_blank" rel="noopener noreferrer" className="sc-show__openpdf">
            <ExternalLink size={13} /> Open board in full
          </a>
        </section>
      )}

      {demos.length > 0 && (
        <section className="sc-show__section">
          <h2 className="sc-show__h2">Demo videos</h2>
          <div className="sc-show__demos">
            {demos.map((d) => {
              const e = embedOf(d)
              return e ? (
                <div key={d.id} className="sc-show__video">
                  <iframe
                    src={e}
                    title="Demo video"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : null
            })}
          </div>
        </section>
      )}

      {(repo || supplements.length > 0) && (
        <section className="sc-show__section">
          <h2 className="sc-show__h2">Resources</h2>
          <div className="sc-show__links">
            {repo && <ResourceLink asset={repo} icon={<Github size={16} />} fallback="Code repository" />}
            {supplements.map((s) => (
              <ResourceLink key={s.id} asset={s} icon={<Paperclip size={16} />} fallback="Supplemental information" />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

function ResourceLink({
  asset,
  icon,
  fallback,
}: {
  asset: { metadataJson: unknown }
  icon: React.ReactNode
  fallback: string
}) {
  const meta = (typeof asset.metadataJson === 'object' && asset.metadataJson) as
    | { url?: string; label?: string }
    | null
  const url = meta?.url
  if (!url) return null
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    /* ignore */
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="sc-show__link">
      {icon}
      <span className="sc-show__link-label">{meta?.label || fallback}</span>
      <span className="sc-show__link-host">{host}</span>
      <ExternalLink size={13} className="sc-show__link-ext" />
    </a>
  )
}
