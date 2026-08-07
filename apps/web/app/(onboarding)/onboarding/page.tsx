'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { z } from 'zod'
import { NotificationBell } from '@/components/lab/NotificationBell'
import { ApiError, requestJson } from '@/lib/api/client'

type Mode = 'create' | 'join'
type AccountType = 'student' | 'teacher'

/** These routes answer `{ teamId }` / `{ ok }` and this page uses neither — it
 *  only needs to know the write succeeded. Going through `requestJson` is what
 *  matters: a bare `res.json()` here died on a non-JSON body ("Failed to execute
 *  'json' on 'Response'"), which is what a signed-out submit used to produce. */
const Ignored = z.unknown()

/** A submit the server refused for lack of a session is not a form error — no
 *  amount of retyping fixes it, and this page has no other way out. Send them
 *  back through sign-in and return here. */
function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401
}

/** "Your name" + "High school" fields — identical in the student and teacher
 *  forms below. Shared so the placeholder/maxLength/styling can't drift
 *  between the two branches. */
function NameAndSchoolFields({
  name,
  setName,
  highSchool,
  setHighSchool,
}: {
  name: string
  setName: (v: string) => void
  highSchool: string
  setHighSchool: (v: string) => void
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Rig Saini"
          className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
          High school
        </label>
        <input
          type="text"
          value={highSchool}
          onChange={(e) => setHighSchool(e.target.value)}
          placeholder="Santa Clara High School"
          maxLength={120}
          className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
        />
      </div>
    </>
  )
}

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()

  const [accountType, setAccountType] = useState<AccountType>('student')
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')

  useEffect(() => {
    if (user && !name) {
      setName(user.fullName ?? user.firstName ?? '')
    }
    // `name` is intentionally included; the `!name` guard keeps it idempotent
    // (it only ever prefills once, never overwrites what the user typed).
  }, [user, name])

  const [teamName, setTeamName] = useState('')
  const [zip, setZip] = useState('')
  const [code, setCode] = useState('')
  // Dev convenience: pre-fill the pilot's high school locally (inert in prod).
  const [highSchool, setHighSchool] = useState(
    process.env.NODE_ENV !== 'production' ? 'Santa Clara High School' : '',
  )
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  // True once the mutation has succeeded and we're mid-navigation — distinct from
  // `loading` so the button can swap to "Entering your lab…" for that leg instead
  // of staying on "Setting up…"/"Joining…" through the route transition.
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recovery latch: `entering` deliberately stays true through the navigation,
  // but if the push bounces back to /onboarding (e.g. the router replays a
  // cached /dashboard→/onboarding redirect) this page stays mounted with the
  // form permanently disabled. A successful navigation unmounts us (cleanup
  // clears the timer); a bounce leaves us mounted, so re-enable the form.
  useEffect(() => {
    if (!entering) return
    const timer = setTimeout(() => {
      setEntering(false)
      setLoading(false)
      setError('Could not enter your lab. Please try again.')
    }, 8000)
    return () => clearTimeout(timer)
  }, [entering])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'create' ? '/api/onboarding' : '/api/team/join'
      const profile = {
        highSchool: highSchool.trim() || undefined,
        classCode: classCode.trim() || undefined,
      }
      const payload =
        mode === 'create'
          ? { name, teamName, zip: zip.trim() || undefined, ...profile }
          : { name, code, ...profile }
      await requestJson(endpoint, Ignored, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      // Stay busy through the navigation itself — only `router.push` failing
      // (synchronously, essentially never) would fall through to `finally`.
      setEntering(true)
      router.push('/dashboard')
    } catch (err) {
      if (isUnauthorized(err)) {
        router.push('/sign-in?redirect_url=/onboarding')
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  async function handleTeacherSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await requestJson('/api/onboarding/teacher', Ignored, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, highSchool: highSchool.trim() || undefined }),
      })
      // Stay busy through the hard navigation below (not `finally`) — the button
      // should read "Entering your lab…" until the document unload happens.
      setEntering(true)
      // Hard navigation (not router.push) so the browser performs a full document
      // load. This forces Clerk to re-mint the session token server-side, ensuring
      // sessionClaims.metadata.role reflects the just-written publicMetadata.role
      // before (teacher)/layout.tsx evaluates the gate. Live-verified step.
      window.location.assign('/teacher')
    } catch (err) {
      if (isUnauthorized(err)) {
        router.push('/sign-in?redirect_url=/onboarding')
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const canSubmit =
    !!name.trim() && (mode === 'create' ? !!teamName.trim() : code.trim().length >= 4)

  const canTeacherSubmit = !!name.trim()

  return (
    <div className="max-w-md w-full space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-pixel text-white text-lg">Welcome to scienium</h1>
          <p className="font-pixel text-white/40 text-[9px] mt-2">
            Set up your researcher profile to get started.
          </p>
        </div>
        {/* The one place a student with NO live team can read their bell
            (HANDOFF #4/#5). A notice that their class or lab membership ended
            is written when they may hold no team at all, and this is where
            those notices link to. Renders nothing for an account that has no
            user row yet. */}
        <NotificationBell />
      </div>

      {/* Student / Teacher top-level account type toggle */}
      <div className="grid grid-cols-2 gap-2">
        {(['student', 'teacher'] as AccountType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setAccountType(t)
              setError(null)
            }}
            className={`font-pixel text-[8px] uppercase tracking-widest py-2.5 border transition-colors ${
              accountType === t
                ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
            }`}
          >
            {t === 'student' ? "I'm a student" : "I'm a teacher"}
          </button>
        ))}
      </div>

      {accountType === 'student' ? (
        <>
          {/* Create / Join toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['create', 'join'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`font-pixel text-[8px] uppercase tracking-widest py-2.5 border transition-colors ${
                  mode === m
                    ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                    : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
                }`}
              >
                {m === 'create' ? 'Create a lab' : 'Join a lab'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <NameAndSchoolFields
              name={name}
              setName={setName}
              highSchool={highSchool}
              setHighSchool={setHighSchool}
            />

            <div className="space-y-1.5">
              <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                Class code <span className="text-white/40">(optional · from your teacher)</span>
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="MRB-2026"
                maxLength={32}
                className="w-full bg-[#0a1628] border border-white/20 text-white text-sm tracking-[0.2em] px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40 placeholder:tracking-normal"
              />
            </div>

            {mode === 'create' ? (
              <div className="space-y-1.5">
                <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                  Lab / team name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="Saini Research Lab"
                  className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
                />
                <div className="space-y-1.5 pt-3">
                  <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                    ZIP code <span className="text-white/40">(optional · finds your fairs)</span>
                  </label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="90089"
                    maxLength={10}
                    className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                  Join code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  placeholder="K7M9QP"
                  maxLength={8}
                  className="w-full bg-[#0a1628] border border-white/20 text-white text-sm tracking-[0.3em] px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40 placeholder:tracking-normal"
                />
                <p className="font-pixel text-[7px] text-white/40 leading-loose">
                  Ask your lab lead for the code shown in their Team panel.
                </p>
              </div>
            )}

            {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {entering
                ? 'Entering your lab…'
                : loading
                  ? mode === 'create'
                    ? 'Setting up…'
                    : 'Joining…'
                  : mode === 'create'
                    ? '↑ Enter Your Lab'
                    : '↑ Join the Lab'}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleTeacherSubmit} className="space-y-5">
          <NameAndSchoolFields
            name={name}
            setName={setName}
            highSchool={highSchool}
            setHighSchool={setHighSchool}
          />

          {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !canTeacherSubmit}
            className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {entering ? 'Entering your lab…' : loading ? 'Setting up…' : '↑ Enter Teacher Dashboard'}
          </button>
        </form>
      )}
    </div>
  )
}
