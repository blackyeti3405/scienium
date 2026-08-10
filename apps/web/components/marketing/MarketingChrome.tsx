'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'

/**
 * Shared marketing nav + footer for the public pages (`/`, `/about`). Light theme:
 * paper field, navy ink, gold as the single accent. Game UI stays dark; these
 * front-door surfaces are light. Nav links point at homepage anchors (prefixed
 * with `/`) so they work from any marketing page. `font-display` = Space Grotesk.
 *
 * The section links (Journey/Battle Arena/Teachers) are `lg:flex` only — below
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

// The marketing site is a single page — every nav link is an anchor on `/`,
// never a subpage. Keep these in sync with the section ids in app/page.tsx.
// Rendered as plain <a>, NOT next/link: Link intercepts the click and does
// its own instant hash jump, which pre-empts SmoothAnchorScroll entirely.
const NAV_LINKS = [
  { href: '/#journey', label: 'The journey' },
  { href: '/#pvp', label: 'Battle Arena' },
  { href: '/#teachers', label: 'For teachers' },
  { href: '/#author', label: 'About' },
]

export function MarketingNav({ userId, launchHref = '/game' }: { userId: string | null; launchHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#e6e5dd] bg-[#f7f7f4]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 md:px-10">
        <Link href="/" className={`flex shrink-0 items-center gap-2 rounded sm:gap-3 ${FOCUS}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scienium-logo.png" alt="scienium" width={28} height={28} className="mkt-pixel shrink-0" />
          <span className="font-pixel whitespace-nowrap text-[0.6rem] text-[#0d1b2e] sm:text-[0.8rem]">scienium</span>
        </Link>
        <nav className="hidden items-center gap-8 font-pixel lg:flex" style={{ fontSize: '0.6rem' }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`rounded text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <div className="flex items-center gap-4 font-pixel" style={{ fontSize: '0.6rem' }}>
            {userId ? (
              // Signed in, the pair mirrors the signed-out pair exactly: the
              // ghost slot becomes Sign out where Sign in was, and the gold CTA
              // becomes Launch where Get started was. There was previously no
              // way to sign out from the marketing site at all — the only
              // sign-out lived behind the lab, so a signed-in visitor on `/`
              // was stuck.
              <>
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className={`hidden min-h-[38px] shrink-0 items-center whitespace-nowrap border border-[#0d1b2e] bg-[#f7f7f4] px-4 text-[#0d1b2e] sm:flex ${NAV_CTA_PRESS} ${FOCUS}`}
                    style={{ borderRadius: 6 }}
                  >
                    Sign out
                  </button>
                </SignOutButton>
                <Link
                  href={launchHref}
                  className={`flex min-h-[38px] shrink-0 items-center whitespace-nowrap bg-[#F5C518] px-3 text-[#0d1b2e] sm:px-4 ${NAV_CTA_PRESS} ${FOCUS}`}
                  style={{ borderRadius: 6 }}
                >
                  Launch
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className={`hidden min-h-[38px] shrink-0 items-center whitespace-nowrap border border-[#0d1b2e] bg-[#f7f7f4] px-4 text-[#0d1b2e] sm:flex ${NAV_CTA_PRESS} ${FOCUS}`}
                  style={{ borderRadius: 6 }}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className={`flex min-h-[38px] shrink-0 items-center whitespace-nowrap bg-[#F5C518] px-3 text-[#0d1b2e] sm:px-4 ${NAV_CTA_PRESS} ${FOCUS}`}
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
            className={`flex h-11 w-11 shrink-0 items-center justify-center text-[#0d1b2e] lg:hidden ${FOCUS}`}
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
          className="border-t border-[#e6e5dd] bg-[#f7f7f4] px-6 py-2 font-pixel lg:hidden"
          style={{ fontSize: '0.65rem' }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded py-3 text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}
            >
              {l.label}
            </a>
          ))}
          {userId ? (
            // Below `lg` the header only has room for the gold CTA, so the
            // hamburger is where Sign out has to live on a phone.
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={`block w-full rounded py-3 text-left text-[#5a6b80] transition-colors hover:text-[#0d1b2e] ${FOCUS}`}
              >
                Sign out
              </button>
            </SignOutButton>
          ) : (
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
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>
              {l.label}
            </a>
          ))}
          {/* CalOPPA requires a conspicuous link containing the word "Privacy"
              on every page that collects personal information. The footer is on
              every marketing page, and both documents are public routes. */}
          <Link href="/privacy" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Privacy</Link>
          <Link href="/terms" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Terms</Link>
          {userId ? (
            <>
              <Link href={launchHref} className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Play</Link>
              {/* Mirrors the header: wherever a signed-out visitor is offered
                  Sign in, a signed-in one is offered Sign out. */}
              <SignOutButton redirectUrl="/">
                <button type="button" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>
                  Sign out
                </button>
              </SignOutButton>
            </>
          ) : (
            <Link href="/sign-in" className={`rounded py-2 hover:text-[#0d1b2e] ${FOCUS}`}>Sign in</Link>
          )}
        </nav>
      </div>
    </footer>
  )
}
