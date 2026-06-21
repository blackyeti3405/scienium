import { TeacherRoster } from '@/components/teacher/TeacherRoster'

export default function TeacherRosterPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-pixel text-sm text-white">Class Roster</h1>
      <TeacherRoster />
    </div>
  )
}
