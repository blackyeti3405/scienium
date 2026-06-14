import { redirect } from 'next/navigation'

/** The lab scene is the single home surface — redirect the old dashboard to it. */
export default function DashboardPage() {
  redirect('/lab')
}
