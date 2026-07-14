'use client'

import Link from 'next/link'
import {
  ChevronLeft,
  FileText,
  User,
  TrendingUp,
  BookOpen,
  FlaskConical,
  ClipboardList,
  Building2,
  Trophy,
  ClipboardCheck,
  Flag,
  Activity,
  MessageCircle,
  Coins,
} from 'lucide-react'
import { SectionTabs } from '@/components/ui/SectionTabs'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { TeacherRubricScoring } from '@/components/teacher/TeacherRubricScoring'
import { Field } from './student-detail/shared'
import { useStudentOverview } from './student-detail/useStudentOverview'
import { StudentHeader } from './student-detail/StudentHeader'
import { IdentitySection, PhaseSection } from './student-detail/sections/ProfileSections'
import { LiteratureSection } from './student-detail/sections/LiteratureSection'
import { ResearchPlanSection } from './student-detail/sections/ResearchPlanSection'
import { LogsSection, ExperimentsSection } from './student-detail/sections/WorkSections'
import { EconomySection, BuildingsSection } from './student-detail/sections/LabSections'
import { ShowcaseSection, ScienceFairSection } from './student-detail/sections/ShowcaseSections'
import {
  ActivitySection,
  CodexSection,
  FeedbackSection,
} from './student-detail/sections/ActivitySections'

export function StudentDetail({ studentId }: { studentId: string }) {
  const { overview, loading, notFound, loadError } = useStudentOverview(studentId)

  if (loading) {
    return (
      <div className="space-y-6">
        <PixelSkeleton variant="line" h="h-3" w="w-16" />
        <div className="border border-white/10 bg-[#0a1628] rounded-lg p-5 space-y-5">
          <div className="flex items-start gap-4">
            <PixelSkeleton variant="pill" h="h-12" w="w-12" className="shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <PixelSkeleton variant="line" h="h-5" w="w-48" />
              <PixelSkeleton variant="line" h="h-3" w="w-64" />
              <PixelSkeleton variant="pill" h="h-6" w="w-32" />
            </div>
          </div>
          <PixelSkeleton variant="box" h="h-10" w="w-full" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <PixelSkeleton key={i} variant="pill" h="h-7" w="w-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-24" w="w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-white/40">
          This student isn&apos;t in your classes.
        </p>
      </div>
    )
  }

  if (loadError || !overview) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-red-400">{loadError ?? 'Something went wrong loading this student.'}</p>
      </div>
    )
  }

  const { student, team } = overview

  return (
    <div className="space-y-6">
      <BackLink />

      {!team ? (
        <div className="border border-white/10 bg-[#0a1628] rounded-lg px-4 py-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <User size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">
            This student hasn&apos;t joined a lab yet.
          </p>
          <div className="text-left max-w-xs mx-auto space-y-2">
            <Field label="Name" value={student.name} />
            <Field label="Email" value={student.email} />
            {student.class && <Field label="Class" value={student.class.name} />}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity header block */}
          <StudentHeader overview={overview} />

          {/* Section tabs with sidebar nav */}
          <SectionTabs
            tabs={[
              {
                key: 'identity',
                label: 'Identity',
                group: 'Profile',
                icon: <User size={14} />,
                content: <IdentitySection overview={overview} />,
              },
              {
                key: 'phase',
                label: 'Progress',
                group: 'Profile',
                icon: <TrendingUp size={14} />,
                content: <PhaseSection overview={overview} />,
              },
              {
                key: 'literature',
                label: 'Literature',
                group: 'Work',
                icon: <BookOpen size={14} />,
                content: <LiteratureSection overview={overview} />,
              },
              {
                key: 'research',
                label: 'Research Plan',
                group: 'Work',
                icon: <ClipboardList size={14} />,
                content: <ResearchPlanSection overview={overview} />,
              },
              {
                key: 'experiments',
                label: 'Experiments',
                group: 'Work',
                icon: <FlaskConical size={14} />,
                content: <ExperimentsSection overview={overview} />,
              },
              {
                key: 'logs',
                label: 'Logs',
                group: 'Work',
                icon: <FileText size={14} />,
                content: <LogsSection overview={overview} />,
              },
              {
                key: 'economy',
                label: 'Economy',
                group: 'Lab',
                icon: <Coins size={14} />,
                content: <EconomySection overview={overview} />,
              },
              {
                key: 'buildings',
                label: 'Buildings',
                group: 'Lab',
                icon: <Building2 size={14} />,
                content: <BuildingsSection overview={overview} />,
              },
              {
                key: 'showcase',
                label: 'Showcase',
                group: 'Showcase',
                icon: <Trophy size={14} />,
                content: <ShowcaseSection overview={overview} />,
              },
              {
                key: 'fairs',
                label: 'Fairs',
                group: 'Showcase',
                icon: <Flag size={14} />,
                content: <ScienceFairSection overview={overview} />,
              },
              {
                key: 'rubric',
                label: 'Rubric',
                group: 'Showcase',
                icon: <ClipboardCheck size={14} />,
                content: <TeacherRubricScoring teamId={team.id} />,
              },
              {
                key: 'activity',
                label: 'Activity',
                group: 'Activity',
                icon: <Activity size={14} />,
                content: <ActivitySection overview={overview} />,
              },
              {
                key: 'codex',
                label: 'Field Codex',
                group: 'Activity',
                icon: <BookOpen size={14} />,
                content: <CodexSection overview={overview} />,
              },
              {
                key: 'feedback',
                label: 'Feedback',
                group: 'Activity',
                icon: <MessageCircle size={14} />,
                content: (
                  <FeedbackSection teamId={team.id} initial={overview.feedback} />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/teacher"
      className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
    >
      <ChevronLeft size={14} /> Roster
    </Link>
  )
}
