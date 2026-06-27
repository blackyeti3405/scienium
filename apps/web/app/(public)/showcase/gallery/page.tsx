import Link from 'next/link'
import { Eye, ImageOff } from 'lucide-react'
import { db } from '@/lib/db'
import { LAB_TYPES, LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

export const metadata = {
  title: 'Project Gallery',
  description: 'Browse student STEM project showcases on scienium.',
}

interface Props {
  searchParams: { lab?: string }
}

export default async function GalleryPage({ searchParams }: Props) {
  const labFilter =
    searchParams.lab && (LAB_TYPES as readonly string[]).includes(searchParams.lab)
      ? (searchParams.lab as LabType)
      : null

  // Only truly public, approved, published showcases are listed.
  const showcases = await db.showcase.findMany({
    where: {
      privacyLevel: 'public',
      moderationStatus: 'approved',
      publishedAt: { not: null },
      ...(labFilter ? { team: { labType: labFilter } } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: 60,
    include: {
      team: { select: { name: true, labType: true } },
      // Quad chart is the card thumbnail (only when it's an image — the board is a PDF).
      assets: { where: { assetType: 'quad_chart' }, take: 1, select: { id: true, fileUrl: true } },
      _count: { select: { views: true } },
    },
  })

  return (
    <div className="sc-gallery-page">
      <header className="sc-gallery-page__head">
        <h1 className="sc-gallery-page__title">Project Gallery</h1>
        <p className="sc-gallery-page__sub">
          Real STEM projects, built and published by students on scienium.
        </p>
      </header>

      <nav className="sc-gallery-filters">
        <Link
          href="/showcase/gallery"
          className={`sc-filter font-pixel ${!labFilter ? 'sc-filter--on' : ''}`}
        >
          All labs
        </Link>
        {LAB_TYPES.map((lt) => (
          <Link
            key={lt}
            href={`/showcase/gallery?lab=${lt}`}
            className={`sc-filter font-pixel ${labFilter === lt ? 'sc-filter--on' : ''}`}
          >
            {LAB_TYPE_LABELS[lt]}
          </Link>
        ))}
      </nav>

      {showcases.length === 0 ? (
        <div className="sc-gallery-empty">
          <ImageOff size={28} className="opacity-30" />
          <p className="font-pixel text-[9px] opacity-50">
            No public projects {labFilter ? `in ${LAB_TYPE_LABELS[labFilter]} ` : ''}yet — check back soon.
          </p>
        </div>
      ) : (
        <div className="sc-gallery-grid">
          {showcases.map((sc) => {
            const quad = sc.assets[0]
            const thumb = quad && quad.fileUrl && !quad.fileUrl.endsWith('.pdf') ? quad.id : null
            const labType = sc.team.labType as LabType | null
            return (
              <Link key={sc.id} href={`/showcase/${sc.slug}`} className="sc-gcard">
                <div className="sc-gcard__thumb">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/showcase/public/asset?id=${thumb}`} alt={sc.shortTitle || sc.title} />
                  ) : (
                    <div className="sc-gcard__noimg">
                      <ImageOff size={22} className="opacity-25" />
                    </div>
                  )}
                  {labType && <span className="sc-gcard__lab font-pixel">{LAB_TYPE_LABELS[labType]}</span>}
                </div>
                <div className="sc-gcard__body">
                  <h3 className="sc-gcard__title">{sc.shortTitle || sc.title}</h3>
                  <div className="sc-gcard__meta">
                    <span className="truncate">{sc.team.name}</span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Eye size={12} /> {sc._count.views.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
