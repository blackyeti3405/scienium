import { db } from '@/lib/db'
import { LAB_TYPES, type LabType } from '@/lib/phase'
import { GalleryBrowser } from './GalleryBrowser'

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

  const cards = showcases.map((sc) => {
    const quad = sc.assets[0]
    const thumb = quad && quad.fileUrl && !quad.fileUrl.endsWith('.pdf') ? quad.id : null
    return {
      id: sc.id,
      slug: sc.slug,
      shortTitle: sc.shortTitle,
      title: sc.title,
      teamName: sc.team.name,
      labType: sc.team.labType as LabType | null,
      views: sc._count.views,
      thumbId: thumb,
    }
  })

  return (
    <div className="sc-gallery-page">
      <header className="sc-gallery-page__head">
        <h1 className="sc-gallery-page__title">Project Gallery</h1>
        <p className="sc-gallery-page__sub">
          Real STEM projects, built and published by students on scienium.
        </p>
      </header>

      <GalleryBrowser labFilter={labFilter} showcases={cards} />
    </div>
  )
}
