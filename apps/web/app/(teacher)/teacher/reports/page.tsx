import { TeacherReports } from '@/components/teacher/TeacherReports'

export default function TeacherReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest mb-1">
          Teacher dashboard
        </p>
        <h1 className="text-2xl font-semibold text-white">Class Reports</h1>
      </div>
      <TeacherReports />
    </div>
  )
}
