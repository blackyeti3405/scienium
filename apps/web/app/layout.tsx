import type { Metadata } from 'next'
import { Inter, Press_Start_2P } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Pixel font for in-game UI elements. Accessible fallback: monospace.
const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NOVA Lab',
    template: '%s · NOVA Lab',
  },
  description: 'Build your virtual research lab. Advance real science.',
  openGraph: {
    title: 'NOVA Lab',
    description: 'Build your virtual research lab. Advance real science.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${pixelFont.variable}`}>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
