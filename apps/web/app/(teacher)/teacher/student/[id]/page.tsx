import { StudentDetail } from '@/components/teacher/StudentDetail'

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <StudentDetail studentId={params.id} />
    </div>
  )
}
