import { SignOutButton } from '@clerk/nextjs'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d1b2e] p-6">
      {children}
      {/* The ONLY way out of onboarding. Sign-out otherwise lives in the lab's
          StatusStrip and the teacher layout — both of which sit behind a
          finished profile, so an account that cannot complete this form (or
          that just picked the wrong account type) had no way to leave it and
          no way to switch users. */}
      <SignOutButton redirectUrl="/">
        <button className="font-pixel text-[8px] text-white/40 uppercase tracking-widest mt-10 py-2 px-3 hover:text-white/70 transition-colors">
          Sign out
        </button>
      </SignOutButton>
    </div>
  )
}
