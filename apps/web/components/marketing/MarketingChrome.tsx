import Link from 'next/link'

/**
 * Shared marketing nav + footer for the public pages (`/`, `/about`). Light theme:
 * paper field, navy ink, gold as the single accent. Game UI stays dark; these
 * front-door surfaces are light. Nav links point at homepage anchors (prefixed
 * with `/`) so they work from any marketing page. `font-display` = Space Grotesk.
 */

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f4]'

const NAV_LINKS = [
  { href: '/#journey', label: 'The journey' },
  { href: '/#pvp', label: 'Battle Arena' },
  { href: '/#teachers', label: 'For teachers' },
  { href: '/about', label: 'About' },
]

export function MarketingNav({ userId }: { userId: string | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e6e5dd] bg-[#f7f7f4]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6 md:px-10">
        <Link href="/" className={`flex items-center gap-3 rounded ${FOCUS}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scienium-logo.png" alt="scienium" width={28} height={28} className="mkt-pixel" />
          <span className="font-pixel text-[#0d1b2e]" style={{ fontSize: '0.8rem' }}>scienium</span>
        </Link>
        <nav className="hidden items-center gap-8 font-pixel md:flex" style={{ fontSize: '0.6rem' }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 font-pixel" style={{ fontSize: '0.6rem' }}>
          {userId ? (
            <Link href="/game" className={`rounded text-[#0d1b2e] underline decoration-[#F5C518] decoration-2 underline-offset-4 hover:opacity-70 ${FOCUS}`}>
              Launch
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={`hidden rounded text-[#5a6b80] hover:text-[#0d1b2e] sm:inline ${FOCUS}`}>Sign in</Link>
              <Link
                href="/sign-up"
                className={`flex min-h-[44px] items-center bg-[#F5C518] px-4 text-[#0d1b2e] transition hover:brightness-95 ${FOCUS}`}
                style={{ borderRadius: 6 }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function MarketingFooter({ userId }: { userId: string | null }) {
  return (
    <footer className="border-t border-[#e6e5dd] bg-[#f2f1ea]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-12 md:flex-row md:px-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scienium-logo.png" alt="" width={22} height={22} className="mkt-pixel" />
          <span className="font-pixel text-[#5a6b80]" style={{ fontSize: '0.55rem' }}>© scienium</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-display text-sm text-[#5a6b80]">
          <Link href="/#journey" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>The journey</Link>
          <Link href="/#pvp" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Battle Arena</Link>
          <Link href="/#teachers" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>For teachers</Link>
          <Link href="/about" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>About</Link>
          {userId ? (
            <Link href="/game" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Play</Link>
          ) : (
            <Link href="/sign-in" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Sign in</Link>
          )}
        </nav>
      </div>
    </footer>
  )
}
