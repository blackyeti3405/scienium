import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal nav */}
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
          ⚗️ scienium
        </Link>
      </header>

      {/* Centered auth widget */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
