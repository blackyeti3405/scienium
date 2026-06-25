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
