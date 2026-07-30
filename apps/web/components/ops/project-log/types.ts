export interface Member {
  userId: string
  name: string
}

export interface LogReferenceChip {
  id: string
  entryNumber: number
  stage: string | null
  createdAt: string
  createdByName: string
}

export interface LogEntry {
  id: string
  entryNumber: number
  body: string
  nextSteps: string
  stage: string | null
  attendeeIds: string[]
  attachmentUrls: string[]
  createdAt: string
  createdBy: { id: string; name: string }
  lastEditedBy: { id: string; name: string } | null
  lastEditedAt: string | null
  links: LogReferenceChip[]
  backlinks: LogReferenceChip[]
}

/**
 * The wire shape of a saved entry: POST returns `entryNumber` but never
 * links/backlinks (a fresh entry has none); PATCH returns neither (the client
 * preserves the existing values). See `useProjectLog.handleSaved`.
 */
export type SavedLogEntry = Omit<LogEntry, 'entryNumber' | 'links' | 'backlinks'> & {
  entryNumber?: number
}
