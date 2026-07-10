import type { Metadata } from 'next'
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
  title: {
    default: 'scienium',
    template: '%s · scienium',
  },
  description: 'Build your virtual research lab. Advance real science.',
  openGraph: {
    title: 'scienium',
    description: 'Build your virtual research lab. Advance real science.',
    type: 'website',
  },
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
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
