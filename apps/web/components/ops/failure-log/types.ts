import type { z } from 'zod'
import type { followupSchema, failureEntrySchema, savedFailureEntrySchema } from './api'

export type FailureFollowupData = z.infer<typeof followupSchema>
export type FailureEntry = z.infer<typeof failureEntrySchema>
export type SavedFailureEntry = z.infer<typeof savedFailureEntrySchema>
