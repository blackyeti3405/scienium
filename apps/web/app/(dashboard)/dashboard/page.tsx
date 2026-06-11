import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName ?? 'Scientist'

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening in your lab today.
        </p>
      </div>

      {/* Quick-start cards — shown when no lab is set up yet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SetupCard
          step={1}
          icon="🔭"
          title="Explore Topics"
          description="Browse Wikipedia and upload papers to discover what you want to research."
          href="/discovery"
          ctaLabel="Start Discovery"
        />
        <SetupCard
          step={2}
          icon="📖"
          title="Review Literature"
          description="Process 25 relevant papers to unlock full lab advancement."
          href="/literature/review"
          ctaLabel="Go to Literature"
        />
        <SetupCard
          step={3}
          icon="🏗️"
          title="Build Your Lab"
          description="Earn buildings and upgrades through daily activities and project milestones."
          href="/lab"
          ctaLabel="View Lab"
        />
      </div>

      {/* Daily activities */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Activities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActivityCard
            icon="📡"
            title="Field Dispatch"
            subtitle="~2 min · Earns KP"
            href="/daily/dispatch"
          />
          <ActivityCard
            icon="🧠"
            title="Proof of Expertise"
            subtitle="~5 min · Earns Clearance Level"
            href="/daily/expertise"
          />
          <ActivityCard
            icon="📋"
            title="Project Log"
            subtitle="~5 min · Earns Lab Credits"
            href="/daily/log"
          />
          <ActivityCard
            icon="💥"
            title="Log a Failure"
            subtitle="Celebrate what didn't work"
            href="/daily/failure"
          />
        </div>
      </div>
    </div>
  )
}

function SetupCard({
  step,
  icon,
  title,
  description,
  href,
  ctaLabel,
}: {
  step: number
  icon: string
  title: string
  description: string
  href: string
  ctaLabel: string
}) {
  return (
    <a
      href={href}
      className="group block rounded-xl border bg-card p-5 hover:border-primary transition-colors space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">Step {step}</span>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <span className="inline-block text-sm font-medium text-primary group-hover:underline">
        {ctaLabel} →
      </span>
    </a>
  )
}

function ActivityCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: string
  title: string
  subtitle: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:border-primary transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="ml-auto text-muted-foreground text-sm">→</span>
    </a>
  )
}
