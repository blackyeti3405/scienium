import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LabScene } from '@/components/lab/LabScene'
import { loadLabPageData } from './loadLab'

export const metadata = { title: 'scienium' }

export default async function LabPage(
  props: {
    searchParams: Promise<{ phase?: string; lab?: string; panel?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const data = await loadLabPageData(userId, searchParams)

  return (
    <LabScene
      {...data}
      initialPanel={searchParams.panel === 'feedback' ? 'feedback' : undefined}
    />
  )
}
