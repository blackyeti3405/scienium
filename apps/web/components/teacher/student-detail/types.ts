// Response shape of GET /api/teacher/student/[id]/overview, shared across the
// StudentDetail section renderers (CMP-1).

export interface OverviewStudent {
  id: string
  name: string
  email: string
  createdAt: string
  class: { id: string; name: string } | null
  memberRole: 'lead' | 'member' | null
  joinedAt: string | null
}

export interface OverviewTeam {
  id: string
  name: string
  phase: string
  labType: string | null
  topic: string | null
  currency: { kp: number; clearanceLevel: number; lc: number } | null
  members: { user: { id: string; name: string }; role: string }[]
}

export interface TeamBuilding {
  name: string
  currentLevel: number
  lastUpgradedAt: string | null
  lastUpgradedByName: string | null
}

export interface ShopBuilding {
  buildingKey: string
  name: string
  description: string
  purchasedByName: string | null
  purchasedAt: string
}

export interface LitProgress {
  sourceCount: number
  sourceTarget: number
}

export interface StudentProficiency {
  demonstrated: boolean
  bestScore: number
  paper: { id: string; title: string }
}

export interface PaperRow {
  id: string
  title: string
  status: string
  authors: string[]
}

export interface ResearchPlan {
  googleDocUrl: string | null
  projectType: string | null
  projectSubtype: string | null
  lastReviewJson: unknown
  lastReviewedAt: string | null
  lastIdeaCheckJson: unknown
  lastIdeaCheckAt: string | null
}

export interface LogRow {
  id: string
  entryType: string
  stage: string | null
  body: string
  createdAt: string
  createdBy: { name: string }
  followups: { question: string; response: string | null; answeredAt: string | null }[]
}

export interface DatasetRow {
  id: string
  name: string
  tableType: string
  rowCount: number
  updatedAt: string
}

export interface ShowcaseRow {
  slug: string
  privacyLevel: string
  moderationStatus: string
  _count: { assets: number; views: number }
}

export interface CodexRecentLesson {
  trackLabel: string
  lessonLabel: string
  bestScore: number
  kpAwarded: number
  completedAt: string | null
}

export interface FairAssoc {
  isPrimary: boolean
  fair: { id: string; name: string; level: string }
}

export interface FormStatus {
  status: string
  form: { name: string }
}

export interface ActivityRow {
  description: string
  userName: string
  createdAt: string
}

export interface FeedbackRow {
  id: string
  targetType: string
  body: string
  resolved: boolean
  createdAt: string
}

/**
 * One `ClassMembershipEvent`, scoped server-side to the caller's own classes.
 * `actor` is coarse on purpose — see `loadClassHistory`.
 */
export interface ClassHistoryRow {
  id: string
  event: string
  reason: string | null
  createdAt: string
  className: string
  actor: 'student' | 'teacher' | 'system'
}

export interface Overview {
  student: OverviewStudent
  team: OverviewTeam | null
  classHistory: ClassHistoryRow[]
  studentKp: number
  teamBuildings: TeamBuilding[]
  shopBuildings: ShopBuilding[]
  litProgress: LitProgress
  studentProficiencies: StudentProficiency[]
  papers: PaperRow[]
  researchPlan: ResearchPlan | null
  logs: LogRow[]
  datasets: DatasetRow[]
  showcase: ShowcaseRow | null
  codex: { lessonsCompleted: number; kp: number; recent: CodexRecentLesson[] }
  fairAssociations: FairAssoc[]
  formStatuses: FormStatus[]
  activity: ActivityRow[]
  feedback: FeedbackRow[]
}
