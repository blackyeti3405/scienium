import type { Metadata, Viewport } from 'next'
import { Inter, Press_Start_2P, Space_Grotesk } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Body/display face for the public marketing pages (font-display). Chosen for
// character + readability alongside the pixel font; the in-game UI stays on Inter.
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' })

// Pixel font for in-game UI elements. Accessible fallback: monospace.
const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'scienium',
    template: '%s · scienium',
  },
  description: 'Build your virtual research lab. Advance real science.',
  openGraph: {
    title: 'scienium',
    description: 'Build your virtual research lab. Advance real science.',
    type: 'website',
    images: ['/marketing/lab.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/lab.png'],
  },
}

// Tints the mobile browser chrome (address bar / status bar) to match the
// marketing paper field instead of the browser's default white/black.
export const viewport: Viewport = {
  themeColor: '#f7f7f4',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${pixelFont.variable} ${grotesk.variable}`}>
        <head>
          {/* Progressive enhancement marker: reveal-on-scroll only hides content
              once JS is confirmed (see globals.css `.js [data-reveal]`). Runs
              before paint so no-JS clients render the marketing pages fully. */}
          <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        </head>
        <body className="font-sans antialiased">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:bg-[#F5C518] focus:px-4 focus:py-2 focus:text-[#0d1b2e] focus:outline-none focus:ring-2 focus:ring-[#0d1b2e]"
            style={{ borderRadius: 6 }}
          >
            Skip to main content
          </a>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
