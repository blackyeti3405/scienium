import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { TERMS_OF_SERVICE_MD } from '@/lib/legal/terms'

export const metadata: Metadata = {
  // Root layout applies the "%s · scienium" template — do not repeat the suffix.
  title: 'Terms of Service',
  description:
    'The agreement covering use of scienium: who may use it, acceptable use, who owns student work, AI-generated content, safety, and liability.',
  alternates: { canonical: '/terms' },
}

export default async function TermsPage() {
  const { userId } = await auth()
  return (
    <main id="main-content" className="min-h-screen bg-[#f7f7f4] text-[#0d1b2e]">
      <MarketingNav userId={userId} />
      <LegalDocument title="Terms of Service" markdown={TERMS_OF_SERVICE_MD} />
      <MarketingFooter userId={userId} />
    </main>
  )
}
