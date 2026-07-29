import { cache } from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Github, Paperclip, ExternalLink, Eye, Printer } from 'lucide-react'
import { db } from '@/lib/db'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'
import { canViewShowcase, isSafeHttpUrl, toShowcaseForView, type ShowcaseAccess } from '@/lib/showcase'
import { viewFingerprint, recordShowcaseView, resolveShowcaseViewer } from '@/lib/showcase-server'
import { PrintButton } from '@/components/showcase/PrintButton'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ print?: string }>
}

/** Asset stream URL, carrying the share token when the page was opened by one. */
function assetHref(id: string, via: ShowcaseAccess, shareToken: string | null): string {
  const base = `/api/showcase/public/asset?id=${id}`
  return via === 'share_token' && shareToken
    ? `${base}&t=${encodeURIComponent(shareToken)}`
    : base
}

/** Null-safe narrowing of an asset's `metadataJson` (stored as JSON, typed loosely). */
function readMeta<T>(a?: { metadataJson: unknown }): T | undefined {
  return a && typeof a.metadataJson === 'object' && a.metadataJson ? (a.metadataJson as T) : undefined
}

/**
 * Resolve `/showcase/<param>` by EITHER the public slug or the secret share
 * token, and report which matched (REFACTOR2 P1-R7).
 *
 * `link_only` used to be reachable at the same title-derived slug as a public
 * showcase, whose only unguessable part is six hex characters. Presenting the
 * 128-bit token is now the sole anonymous way into a `link_only` showcase;
 * `canViewShowcase` decides using `via`.
 *
 * `cache()`d because `generateMetadata` and the page body each resolve the same
 * slug during one request — without it every public showcase view ran this
 * query set twice.
 */
const loadShowcase = cache(async function loadShowcase(param: string) {
  const sc = await db.showcase.findFirst({
    where: { OR: [{ slug: param }, { shareToken: param }] },
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
  if (!sc) return null
  // A token match wins: the slug is public, so only an exact token match may
  // upgrade the caller's access.
  const via: ShowcaseAccess = sc.shareToken === param ? 'share_token' : 'slug'
  return { sc, via }
})

/** Same request, same viewer — deduped for the `generateMetadata` + page pair. */
const loadViewer = cache(resolveShowcaseViewer)

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const found = await loadShowcase(params.slug)
  const viewer = await loadViewer()
  if (!found || !canViewShowcase(toShowcaseForView(found.sc), viewer, found.via)) {
    return { title: 'Showcase' }
  }
  const { sc } = found
  const headline = sc.shortTitle || sc.title
  // OG image must be an image — use the quad chart only when it's an image file.
  const quad = sc.assets.find((a) => a.assetType === 'quad_chart')
  const ogImage = quad && quad.fileUrl && !quad.fileUrl.endsWith('.pdf')
    ? [{ url: assetHref(quad.id, found.via, sc.shareToken) }]
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

export default async function PublicShowcasePage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const found = await loadShowcase(params.slug)
  const viewer = await loadViewer()

  if (!found || !canViewShowcase(toShowcaseForView(found.sc), viewer, found.via)) notFound()
  const { sc } = found

  // `?print=1` only ever selects a layout — the authorization check above runs
  // first and identically either way, so the flag can never leak a private or
  // unpublished showcase.
  const printMode = searchParams?.print === '1'

  // Record a view (deduped per visitor per day; never stores a raw IP). Skip the
  // owning team's own visits so the count reflects real audience, and skip print
  // renders entirely (printing is not audience traffic).
  const isOwner = !!viewer && viewer.teamIds.includes(sc.teamId)
  if (!printMode && !isOwner) {
    try {
      const h = await headers()
      const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim()
      const fp = viewFingerprint(ip, h.get('user-agent') ?? '')
      // One row per visitor per UTC day (A13) — duplicate-safe under
      // concurrent first loads via the unique key inside recordShowcaseView.
      await recordShowcaseView(sc.id, fp)
    } catch {
      // View tracking must never break the page.
    }
  }

  // Carry the share token onto every asset request, so a `link_only` page can
  // actually load its own board/quad bytes (P1-R7).
  const assetUrl = (id: string) => assetHref(id, found.via, sc.shareToken)
  const isPdf = (fileUrl: string | null) => !!fileUrl && fileUrl.endsWith('.pdf')
  const embedOf = (a?: { metadataJson: unknown }) => readMeta<{ embedUrl?: string }>(a)?.embedUrl

  const board = sc.assets.find((a) => a.assetType === 'board')
  const quad = sc.assets.find((a) => a.assetType === 'quad_chart')
  const video = sc.assets.find((a) => a.assetType === 'video')
  const repo = sc.assets.find((a) => a.assetType === 'repo_link')
  const demos = sc.assets.filter((a) => a.assetType === 'demo_video')
  const supplements = sc.assets.filter((a) => a.assetType === 'supplement')
  const figure = sc.assets.find((a) => a.assetType === 'figure')
  const labType = sc.team.labType as LabType | null
  const videoEmbed = embedOf(video)
  const headline = sc.shortTitle || sc.title

  // The Works-Cited bibliography (app/api/citations/export/route.ts) is stored as
  // a `supplement` asset whose metadata carries `kind: 'works_cited'` + the full
  // text — inline that text on the one-pager rather than only linking to it.
  const worksCited = supplements
    .map((s) => readMeta<{ kind?: string; text?: string }>(s))
    .find((m) => m?.kind === 'works_cited')?.text ?? null

  if (printMode) {
    return (
      <ShowcaseOnePager
        sc={sc}
        headline={headline}
        labType={labType}
        quad={quad}
        video={video}
        repo={repo}
        supplements={supplements}
        worksCited={worksCited}
        assetUrl={assetUrl}
        isPdf={isPdf}
      />
    )
  }

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
          <span className="sc-show__dot">·</span>
          <a href="?print=1" className="sc-show__printlink">
            <Printer size={12} /> Print one-pager
          </a>
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
            (<img src={assetUrl(quad.id)} alt={`${headline} quad chart`} />)
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
      {figure && figure.fileUrl && (
        <section className="sc-show__section">
          <h2 className="sc-show__h2">Data figure</h2>
          <div className="sc-show__quad">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(figure.id)} alt={`${headline} data figure`} />
          </div>
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
  );
}

type OnePagerAsset = { id: string; fileUrl: string | null; metadataJson: unknown }

/**
 * Compact single-page summary rendered under `?print=1`, laid out for the
 * browser's native print/Save-as-PDF (no PDF library, no server render). The
 * privacy gate above (`canViewShowcase`) already ran identically for this
 * branch — this component is a pure read/render of already-authorized data.
 */
function ShowcaseOnePager({
  sc,
  headline,
  labType,
  quad,
  video,
  repo,
  supplements,
  worksCited,
  assetUrl,
  isPdf,
}: {
  sc: { slug: string; shortTitle: string; title: string; abstract: string; team: { name: string } }
  headline: string
  labType: LabType | null
  quad?: OnePagerAsset
  video?: OnePagerAsset
  repo?: OnePagerAsset
  supplements: OnePagerAsset[]
  worksCited: string | null
  assetUrl: (id: string) => string
  isPdf: (fileUrl: string | null) => boolean
}) {
  const linkUrl = (a?: OnePagerAsset) => readMeta<{ url?: string }>(a)?.url
  const linkLabel = (a?: OnePagerAsset, fallback?: string) => readMeta<{ label?: string }>(a)?.label || fallback

  const citedSupplements = supplements.filter((s) => readMeta<{ kind?: string }>(s)?.kind !== 'works_cited')

  const links: { label: string; url: string }[] = []
  const videoUrl = linkUrl(video)
  if (videoUrl) links.push({ label: 'Project video', url: videoUrl })
  const repoUrl = linkUrl(repo)
  if (repoUrl) links.push({ label: 'Code repo', url: repoUrl })
  for (const s of citedSupplements) {
    const url = linkUrl(s)
    if (url) links.push({ label: linkLabel(s, 'Supplemental information') as string, url })
  }

  return (
    <article className="sc-onepager" data-print-onepager>
      <div className="sc-onepager__actions" data-print-hide>
        <PrintButton />
        <a href={`/showcase/${sc.slug}`} className="sc-ghost font-pixel">
          Back to showcase
        </a>
      </div>
      <header className="sc-onepager__header">
        <h1 className="sc-onepager__title">{headline}</h1>
        {sc.shortTitle && sc.title && sc.title !== sc.shortTitle && (
          <p className="sc-onepager__fulltitle">{sc.title}</p>
        )}
        <p className="sc-onepager__meta">
          by {sc.team.name}
          {labType && <span className="font-pixel"> · {LAB_TYPE_LABELS[labType]}</span>}
        </p>
      </header>
      {quad && (
        <div className="sc-onepager__quad">
          {isPdf(quad.fileUrl) ? (
            <a
              href={assetUrl(quad.id)}
              target="_blank"
              rel="noopener noreferrer"
              data-onepager-quad="link"
              className="sc-onepager__quadlink"
            >
              View quad chart (PDF)
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            (<img
              src={assetUrl(quad.id)}
              alt={`${headline} quad chart`}
              data-onepager-quad="img"
            />)
          )}
        </div>
      )}
      <section className="sc-onepager__section">
        <h2 className="sc-onepager__h2 font-pixel">Abstract</h2>
        <p className="sc-onepager__abstract">{sc.abstract}</p>
      </section>
      {links.length > 0 && (
        <section className="sc-onepager__section">
          <h2 className="sc-onepager__h2 font-pixel">Links</h2>
          <ul className="sc-onepager__links">
            {links.map((l, i) => (
              <li key={i}>
                <span className="sc-onepager__linklabel">{l.label}:</span> {l.url}
              </li>
            ))}
          </ul>
        </section>
      )}
      {worksCited && (
        <section className="sc-onepager__cited">
          <h2 className="sc-onepager__h2 font-pixel">Works Cited</h2>
          <p className="sc-onepager__citedtext">{worksCited}</p>
        </section>
      )}
    </article>
  );
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
  const meta = readMeta<{ url?: string; label?: string }>(asset)
  const url = meta?.url
  // Second, independent gate at the render boundary — the upload path validates
  // the scheme, but a legacy `metadataJson.url` saved before it did must not get
  // a free pass into an `href` (same rule `SourceReader`/`IdeaCheckView` apply).
  if (!url || !isSafeHttpUrl(url)) return null
  // Parse is guaranteed to succeed: `isSafeHttpUrl` already constructed it.
  const host = new URL(url).hostname.replace(/^www\./, '')
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="sc-show__link">
      {icon}
      <span className="sc-show__link-label">{meta?.label || fallback}</span>
      <span className="sc-show__link-host">{host}</span>
      <ExternalLink size={13} className="sc-show__link-ext" />
    </a>
  )
}
