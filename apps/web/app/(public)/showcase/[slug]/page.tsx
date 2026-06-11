import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export default async function PublicShowcasePage({ params }: Props) {
  // TODO: fetch showcase by slug, check privacy_level
  const showcase = null

  if (!showcase) notFound()

  return (
    <div>
      {/* TODO: ShowcaseRenderer */}
    </div>
  )
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `NOVA Lab Showcase`,
    openGraph: {
      title: `NOVA Lab Showcase`,
      description: 'A student STEM project showcase on NOVA Lab',
    },
  }
}
