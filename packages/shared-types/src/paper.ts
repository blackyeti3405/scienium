export interface PaperSummary {
  summary: string
  keyFindings: string[]
  methodology: string
  relevanceToTopic: string
}

export interface PaperQuizQuestion {
  question: string
  type: 'open_ended'
}

export interface ExtractedReference {
  title: string
  authors: string[]
  year: number | null
  doi?: string
}

export interface CitationExtractionResult {
  references: ExtractedReference[]
}

export interface ProcessPaperRequest {
  paperId: string
  fileUrl: string
  teamTopic: string
  labType: string
}

export interface ProcessPaperResponse {
  summary: PaperSummary
  quizQuestions: PaperQuizQuestion[]
  references: ExtractedReference[]
  embedding: number[]
}
