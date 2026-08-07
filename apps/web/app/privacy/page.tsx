import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { PRIVACY_POLICY_MD } from '@/lib/legal/privacy'

export const metadata: Metadata = {
  // Root layout applies the "%s · scienium" template — do not repeat the suffix.
  title: 'Privacy Policy',
  description:
    'What scienium collects, why, who it is shared with, how long it is kept, and the rights students, parents, teachers, and schools have.',
  alternates: { canonical: '/privacy' },
}

export default async function PrivacyPage() {
  const { userId } = await auth()
  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      <MarketingNav userId={userId} />
      <LegalDocument title="Privacy Policy" markdown={PRIVACY_POLICY_MD} />
      <MarketingFooter userId={userId} />
    </main>
  )
}
