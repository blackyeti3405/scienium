import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Already logged in → go straight to dashboard
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">⚗️ NOVA Lab</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-md px-4 py-2 text-sm font-medium border hover:bg-accent transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="inline-block rounded-full border px-4 py-1 text-sm text-muted-foreground mb-2">
          Science Fair, Gamified 🏆
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            NOVA Lab
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl">
          Build a virtual research laboratory, earn upgrades through real science fair work,
          and turn your project into a public showcase — from first idea to competition stage.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mt-2">
          <Link
            href="/sign-up"
            className="rounded-md px-8 py-3 font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-base"
          >
            Start Your Lab →
          </Link>
          <Link
            href="/showcase/gallery"
            className="rounded-md px-8 py-3 font-semibold border hover:bg-accent transition-colors text-base"
          >
            Browse Showcases
          </Link>
        </div>
      </main>

      {/* Feature grid */}
      <section className="border-t px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-2">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NOVA Lab. Built for student scientists.
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: '🔬',
    title: 'Build Your Lab',
    description:
      'Earn buildings and upgrades by completing daily activities, literature reviews, and project milestones.',
  },
  {
    icon: '📚',
    title: 'Guided Research',
    description:
      'Explore Wikipedia, process research papers, and build a citation graph of your field — all inside the app.',
  },
  {
    icon: '⚔️',
    title: 'Battle & Compete',
    description:
      'Challenge classmates in turn-based PvP battles where your lab buildings become combat characters.',
  },
]
