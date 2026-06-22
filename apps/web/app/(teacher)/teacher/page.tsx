import { TeacherRoster } from '@/components/teacher/TeacherRoster'

export default function TeacherRosterPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest mb-1">
          Teacher dashboard
        </p>
        <h1 className="text-2xl font-semibold text-white">Class Roster</h1>
      </div>
      <TeacherRoster />
    </div>
  )
}
