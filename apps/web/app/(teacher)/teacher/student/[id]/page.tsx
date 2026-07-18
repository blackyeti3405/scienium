import { StudentDetail } from '@/components/teacher/StudentDetail'

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <div className="space-y-6">
      <StudentDetail studentId={params.id} />
    </div>
  )
}
