import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/**
 * Team-panel feature client (REFACTOR2 P2-3).
 *
 * Only the reads whose RESULT drives state live here — the roster GET, the
 * minted invite, and the class-join outcome. The panel's four pure-ack
 * mutations (hand over lead, remove a member, leave the lab, leave the class)
 * stay inline: they check `res.ok`, throw the server's message, and touch no
 * shape at all, so moving them would be movement.
 *
 * What was actually wrong here was the re-read, not the writes:
 *
 *     async function refresh() {
 *       const d = await fetch('/api/team').then((r) => r.json())
 *       if (!d.error) setData(d)
 *     }
 *
 * called as `await refresh()` INSIDE the try of `makeLead`/`removeMember`. Two
 * failures came out of that. A 5xx re-read was dropped on the floor, so a lead
 * handover that worked left the old roster on screen with nothing saying it was
 * stale. Worse, an expired Clerk session answers this GET with a 307 to the
 * sign-in page, which `fetch` FOLLOWS — so `r.json()` rejects on HTML, the
 * rejection lands in the caller's catch, and the student is told "Could not
 * hand over the lead role" about a handover the server had already committed.
 * A destructive action reported as failed is the one error message you must not
 * get wrong.
 */

const memberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(['lead', 'member']),
  isYou: z.boolean(),
})

const inviteSchema = z.object({ code: z.string(), expiresAt: z.string() })

/**
 * The slice of GET /api/team the panel renders. The route also returns
 * `teamId`, `phase`, `researchIdea`, `labType` and the literature advance gate;
 * those belong to other consumers (`literature/api.ts` declares its own slice of
 * the same route) and are dropped here rather than restated.
 */
export const teamSchema = z.object({
  name: z.string(),
  maxMembers: z.number(),
  memberCount: z.number(),
  isLead: z.boolean(),
  members: z.array(memberSchema),
  invite: inviteSchema.nullable(),
  myClass: z.object({ id: z.string(), name: z.string() }).nullable(),
})

export type TeamData = z.infer<typeof teamSchema>
export type Member = z.infer<typeof memberSchema>

export function getTeam(): Promise<TeamData> {
  return requestJson('/api/team', teamSchema)
}

export function mintInvite(): Promise<TeamData['invite']> {
  return requestJson('/api/team/invite', z.object({ invite: inviteSchema }), {
    method: 'POST',
  }).then((d) => d.invite)
}

/**
 * Join a class by code. The two outcomes are genuinely different rows, not one
 * row with an optional field: an approved join names the class the student is
 * now IN, a pending one only names the class they asked to join. The union says
 * so, so the panel cannot read `classId` off the branch that has none.
 */
export const joinClassSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved'), classId: z.string(), className: z.string() }),
  z.object({ status: z.literal('pending'), className: z.string() }),
])

export function joinClass(code: string): Promise<z.infer<typeof joinClassSchema>> {
  return requestJson('/api/class/join', joinClassSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}
