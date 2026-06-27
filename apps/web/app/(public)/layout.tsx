import Link from 'next/link'

/**
 * Public shell for the Showcase Wing — the only unauthenticated surface in the
 * app (gallery + individual showcase pages). It deliberately does NOT render the
 * lab chrome; it's a clean, portfolio-style frame so shared links look like a
 * polished public site rather than a game screen.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sc-public">
      <header className="sc-public__nav">
        <Link href="/showcase/gallery" className="sc-public__brand font-pixel">
          ⚗ scienium
        </Link>
        <Link href="/showcase/gallery" className="sc-public__navlink font-pixel">
          Project Gallery
        </Link>
      </header>
      <main className="sc-public__main">{children}</main>
      <footer className="sc-public__footer">
        <span>Built by students on scienium — build your virtual research lab, advance real science.</span>
      </footer>
    </div>
  )
}
