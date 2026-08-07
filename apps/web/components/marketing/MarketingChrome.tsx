'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Shared marketing nav + footer for the public pages (`/`, `/about`). Light theme:
 * paper field, navy ink, gold as the single accent. Game UI stays dark; these
 * front-door surfaces are light. Nav links point at homepage anchors (prefixed
 * with `/`) so they work from any marketing page. `font-display` = Space Grotesk.
 *
 * The section links (Journey/Battle Arena/Teachers) are `md:flex` only — below
 * that a hamburger toggle opens the same links in a dropdown, so mobile visitors
 * aren't left with zero way to jump to a section short of scrolling the whole page.
 */

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f4]'

// Same chunky 3D-press language as the homepage CTAs, scaled down to fit the
// compact 68px header.
const NAV_CTA_PRESS =
  'shadow-[3px_3px_0_0_#0d1b2e] transition-[transform,box-shadow] duration-150 ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0d1b2e] ' +
  'active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0d1b2e]'

const NAV_LINKS = [
  { href: '/#journey', label: 'The journey' },
  { href: '/#pvp', label: 'Battle Arena' },
  { href: '/#teachers', label: 'For teachers' },
  { href: '/about', label: 'About' },
  { href: '/about#contact', label: 'Contact' },
]

export function MarketingNav({ userId, launchHref = '/game' }: { userId: string | null; launchHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

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
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-4 font-pixel" style={{ fontSize: '0.6rem' }}>
            {userId ? (
              <Link href={launchHref} className={`rounded text-[#0d1b2e] underline decoration-[#F5C518] decoration-2 underline-offset-4 hover:opacity-70 ${FOCUS}`}>
                Launch
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className={`hidden min-h-[38px] items-center border border-[#0d1b2e] bg-[#f7f7f4] px-4 text-[#0d1b2e] sm:flex ${NAV_CTA_PRESS} ${FOCUS}`}
                  style={{ borderRadius: 6 }}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className={`flex min-h-[38px] items-center bg-[#F5C518] px-4 text-[#0d1b2e] ${NAV_CTA_PRESS} ${FOCUS}`}
                  style={{ borderRadius: 6 }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mkt-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center text-[#0d1b2e] md:hidden ${FOCUS}`}
            style={{ borderRadius: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              {menuOpen ? (
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mkt-mobile-menu"
          className="border-t border-[#e6e5dd] bg-[#f7f7f4] px-6 py-2 font-pixel md:hidden"
          style={{ fontSize: '0.65rem' }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded py-3 text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}
            >
              {l.label}
            </Link>
          ))}
          {!userId && (
            <Link
              href="/sign-in"
              onClick={() => setMenuOpen(false)}
              className={`block rounded py-3 text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}

export function MarketingFooter({ userId, launchHref = '/game' }: { userId: string | null; launchHref?: string }) {
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
          <Link href="/about#contact" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Contact</Link>
          {/* CalOPPA requires a conspicuous link containing the word "Privacy"
              on every page that collects personal information. The footer is on
              every marketing page, and both documents are public routes. */}
          <Link href="/privacy" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Privacy</Link>
          <Link href="/terms" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Terms</Link>
          {userId ? (
            <Link href={launchHref} className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Play</Link>
          ) : (
            <Link href="/sign-in" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Sign in</Link>
          )}
        </nav>
      </div>
    </footer>
  )
}
