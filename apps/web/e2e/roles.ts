import path from 'node:path'

export type Role = 'leader' | 'student' | 'teacher'

/** Where each role's saved Clerk session lives (gitignored — see .gitignore). */
export const AUTH_DIR = path.join(__dirname, '.auth')

export const STORAGE: Record<Role, string> = {
  leader: path.join(AUTH_DIR, 'leader.json'),
  student: path.join(AUTH_DIR, 'student.json'),
  teacher: path.join(AUTH_DIR, 'teacher.json'),
}

export interface Account {
  role: Role
  identifier: string
  password: string
  /** A protected surface this role can reach once signed in — used to verify auth. */
  landing: string
}

/**
 * The three existing dev Clerk users, read from env at call time (after the
 * Playwright config has loaded .env.local). Lazy on purpose: importing this
 * module must not throw before the env is loaded.
 *   leader  — lab leader (devuser1), the default session for most specs
 *   student — a co-member of the same lab (devuser2)
 *   teacher — the teacher dashboard account (DevTeacher)
 */
export function getAccounts(): Account[] {
  return [
    { role: 'leader', identifier: env('E2E_LEADER_IDENTIFIER'), password: env('E2E_LEADER_PASSWORD'), landing: '/lab' },
    { role: 'student', identifier: env('E2E_STUDENT_IDENTIFIER'), password: env('E2E_STUDENT_PASSWORD'), landing: '/lab' },
    { role: 'teacher', identifier: env('E2E_TEACHER_IDENTIFIER'), password: env('E2E_TEACHER_PASSWORD'), landing: '/teacher' },
  ]
}

function env(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. Set the E2E test-account vars in apps/web/.env.local.`)
  }
  return value
}

/** Clerk Backend API. Fails loudly with the response body — a 401 here means
 *  CLERK_SECRET_KEY is missing or belongs to a different instance. */
async function clerkApi(pathname: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(
      `Clerk API ${init?.method ?? 'GET'} ${pathname} → ${res.status}: ${JSON.stringify(body).slice(0, 400)}`,
    )
  }
  return body
}

/**
 * A single-use sign-in token for the account with this username, consumed as
 * `clerk.signIn({ strategy: 'ticket', ticket })`.
 *
 * THE ONLY WAY THIS SUITE AUTHENTICATES. `strategy: 'password'` authenticates the
 * FIRST factor only: when Clerk decides an attempt needs a second one the call
 * resolves, the Frontend API returns 200, and no session is created — the failure
 * surfaces much later as a protected route bouncing to `/sign-in`, or on WebKit as
 * a handshake loop (`__clerk_hs_reason=session-token-but-no-client-uat`) that runs
 * `page.goto` out of time. That took the CI gate down on 2026-08-11 with no commit
 * and no credential change behind it, and with MFA off on both the user and the
 * instance there was no setting to put back:
 *
 *     first_factor_verification: { status: "verified", strategy: "password" }
 *     status: "needs_second_factor"
 *     created_session_id: null
 *     client_trust_state: "new"
 *
 * A trusted client skips the challenge, which is why a developer machine kept
 * working while CI — always a brand-new client — did not.
 *
 * A sign-in token is minted server-side for a user id and bypasses first AND
 * second factors, so it is immune to MFA, device/client-trust challenges and bot
 * protection. None of those are what these specs test. The E2E_*_PASSWORD vars
 * stay in `.env.local`: they are what a human uses to sign in by hand.
 */
export async function signInTicket(identifier: string): Promise<string> {
  const users = (await clerkApi(`/users?username=${encodeURIComponent(identifier)}`)) as { id: string }[]
  const user = Array.isArray(users) ? users[0] : undefined
  if (!user?.id) {
    throw new Error(
      `No Clerk user with username "${identifier}" in this instance. Check the E2E_*_IDENTIFIER vars and that CLERK_SECRET_KEY points at the same instance as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.`,
    )
  }

  const token = (await clerkApi('/sign_in_tokens', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 600 }),
  })) as { token?: string }
  if (!token.token) throw new Error(`Clerk returned no sign-in token for "${identifier}"`)
  return token.token
}
