import { ShowcaseModerationQueue } from '@/components/teacher/ShowcaseModerationQueue'

export default function ShowcaseModerationPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-pixel text-sm text-white">Showcase Moderation</h1>
      <p className="font-pixel text-[8px] text-white/40 leading-relaxed max-w-xl">
        Students who publish their showcase with &ldquo;Public&rdquo; visibility need your approval before
        it appears in the public gallery. Review each submission and approve or request changes.
      </p>
      <ShowcaseModerationQueue />
    </div>
  )
}
