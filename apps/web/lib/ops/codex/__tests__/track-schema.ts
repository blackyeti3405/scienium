/**
 * Runtime (zod) mirror of the `CodexTrack` type in `../types.ts`.
 *
 * The authored track content now lives as data (`../content/<slug>.json`), so
 * `tsc` can no longer shape-check it the way it checked the old inline literals
 * — a JSON import widens discriminated unions like `kind` to `string`. This
 * schema restores that guarantee at the data boundary: `generated-content.test.ts`
 * parses every content file through it, which is STRICTER than the old compile
 * check (it validates the `kind` union, rejects unknown keys, etc.).
 *
 * The two compile-time assertions at the bottom keep this schema and `types.ts`
 * from drifting: they fail `tsc` if the inferred type and `CodexTrack` diverge.
 */
import { z } from 'zod'
import type { CodexTrack } from '../types'

const McOption = z.object({ id: z.string(), text: z.string() }).strict()

const McQuestion = z
  .object({
    kind: z.literal('mc'),
    id: z.string(),
    prompt: z.string(),
    options: z.array(McOption),
    answerId: z.string(),
    explanations: z.record(z.string(), z.string()),
  })
  .strict()

const OrderingItem = z.object({ id: z.string(), text: z.string() }).strict()

const OrderingQuestion = z
  .object({
    kind: z.literal('ordering'),
    id: z.string(),
    prompt: z.string(),
    items: z.array(OrderingItem),
    correctOrder: z.array(z.string()),
    explanation: z.string(),
  })
  .strict()

const MatchLeftItem = z.object({ id: z.string(), text: z.string() }).strict()
const MatchRightItem = z.object({ id: z.string(), text: z.string() }).strict()

const MatchingQuestion = z
  .object({
    kind: z.literal('matching'),
    id: z.string(),
    prompt: z.string(),
    left: z.array(MatchLeftItem),
    right: z.array(MatchRightItem),
    correctPairs: z.array(z.tuple([z.string(), z.string()])),
    explanation: z.string(),
  })
  .strict()

const CheckpointQuestion = z.discriminatedUnion('kind', [McQuestion, OrderingQuestion, MatchingQuestion])

const Checkpoint = z.object({ questions: z.array(CheckpointQuestion) }).strict()

const LessonSection = z.object({ heading: z.string(), body: z.string() }).strict()

const Lesson = z
  .object({
    id: z.string(),
    label: z.string(),
    readingMinutes: z.number(),
    sections: z.array(LessonSection),
    workedExample: z.string(),
    judgeFraming: z.string(),
    checkpoint: Checkpoint,
  })
  .strict()

const Unit = z.object({ id: z.string(), label: z.string(), lessons: z.array(Lesson) }).strict()

const Segment = z
  .object({
    id: z.string(),
    kind: z.enum(['core', 'branch']),
    label: z.string(),
    units: z.array(Unit),
  })
  .strict()

export const TrackSchema = z
  .object({
    slug: z.string(),
    label: z.string(),
    home: z.boolean(),
    labType: z.string().optional(),
    core: Segment,
    branches: z.array(Segment),
  })
  .strict()

export type TrackSchemaType = z.infer<typeof TrackSchema>

// ── Compile-time drift guards ────────────────────────────────────────────────
// If these fail `tsc`, the zod schema and `CodexTrack` (types.ts) have diverged —
// reconcile them rather than casting past the error.
type AssertExtends<A extends B, B> = A
type _SchemaIsATrack = AssertExtends<TrackSchemaType, CodexTrack>
type _TrackMatchesSchema = AssertExtends<CodexTrack, TrackSchemaType>
