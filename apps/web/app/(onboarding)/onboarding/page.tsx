export default function OnboardingPage() {
  return (
    <div className="max-w-lg w-full space-y-6">
      <h1 className="text-3xl font-bold">Welcome to NOVA Lab</h1>
      <p className="text-muted-foreground">
        Scan your Apprentice figurine to get started, then choose your path.
      </p>
      {/* TODO: QR scanner + team setup flow */}
    </div>
  )
}
