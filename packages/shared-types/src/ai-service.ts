export interface FieldDispatchContent {
  body: string
  reflectionQuestion: string
  labType: string
}

export interface ExpertiseQuestion {
  question: string
  clearanceLevel: number
  labType: string
}

export interface ProjectLogEvaluation {
  isSpecific: boolean
  followUpQuestions: string[]
  resilienceBonusEligible: boolean
}

export interface MiniGameContent {
  category: string
  buildingId: string
  difficulty: number
  scenario: string
  options?: string[]
  correctAnswer: string
  explanation: string
}
