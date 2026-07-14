export interface FailureFollowupData {
  id: string
  question: string
  response: string | null
  answeredAt: string | null
}

/**
 * The wire shape of a saved entry: the edit PATCH response omits `followup`
 * (the client preserves the existing value — see `useFailureLog.handleSaved`).
 */
export type SavedFailureEntry = Omit<FailureEntry, 'followup'> & {
  followup?: FailureFollowupData | null
}

export interface FailureEntry {
  id: string
  happened: string
  learned: string
  author: string
  authorId: string
  createdAt: string
  editedBy: string | null
  editedAt: string | null
  followup: FailureFollowupData | null
}
