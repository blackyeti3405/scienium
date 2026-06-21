import { ValidationQueue } from '@/components/teacher/ValidationQueue'

export default function ValidationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-pixel text-sm text-white">Phase Validations</h1>
      <p className="font-pixel text-[8px] text-white/40 leading-relaxed max-w-xl">
        Teams request your sign-off to start data collection (Working) and to advance to
        competition (Showcase). Approving advances their phase.
      </p>
      <ValidationQueue />
    </div>
  )
}
