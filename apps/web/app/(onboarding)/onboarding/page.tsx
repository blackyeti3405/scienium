'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { z } from 'zod'
import { NotificationBell } from '@/components/lab/NotificationBell'
import { LabTypePicker } from '@/components/onboarding/LabTypePicker'
import type { LabType } from '@/lib/phase'
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

/** The name field, shared by the student and teacher forms. */
function NameField({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
        Your name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ada Lovelace"
        className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
      />
    </div>
  )
}

/**
 * TEACHERS ONLY. A teacher's school is real, load-bearing data: `Class.schoolId`
 * is a required FK, so creating a class needs one.
 *
 * Students are deliberately NOT asked. `User.schoolId` was only ever read by the
 * `school_only` showcase tier, withdrawn as forgeable — leaving it as
 * identifying data on a minor collected for nothing. A student's school is now
 * set only when a teacher approves their class-join request.
 */
function SchoolField({
  highSchool,
  setHighSchool,
}: {
  highSchool: string
  setHighSchool: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
        High school
      </label>
      <input
        type="text"
        value={highSchool}
        onChange={(e) => setHighSchool(e.target.value)}
        placeholder="Lincoln High School"
        maxLength={120}
        className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40"
      />
    </div>
  )
}

/** The agreement gate. Rendered identically in the student and teacher forms —
 *  a scienium account is created by three different routes and all three refuse
 *  a body without it (lib/legal/consent.ts), so the box cannot be styled out of
 *  one branch and quietly skipped there.
 *
 *  Both documents open in a new tab: reading them must not discard a
 *  half-filled form. */
function LegalConsentField({
  accepted,
  setAccepted,
}: {
  accepted: boolean
  setAccepted: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => setAccepted(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#F5C518]"
      />
      {/* Body font at a readable size, not the 8px pixel chrome the field
          labels use. An agreement nobody can read is not conspicuous, which is
          what makes a clickwrap enforceable — and 8px pixel type fails the
          accessibility floor besides. */}
      <span className="text-[13px] leading-relaxed text-white/70">
        I agree to the{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F5C518] underline underline-offset-2 hover:brightness-110"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F5C518] underline underline-offset-2 hover:brightness-110"
        >
          Privacy Policy
        </a>
        . If you are under 18, review them with a parent, guardian, or teacher first.
      </span>
    </label>
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
  const [highSchool, setHighSchool] = useState('')
  const [classCode, setClassCode] = useState('')
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  // Creating a lab is two screens: the details, then the lab-type pick. Joining a
  // lab is one — the lab already has a type, and the joiner does not choose it.
  const [step, setStep] = useState<'details' | 'labType'>('details')
  const [labType, setLabType] = useState<LabType | null>(null)
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
      const profile = { classCode: classCode.trim() || undefined }
      const payload =
        mode === 'create'
          ? { name, teamName, zip: zip.trim() || undefined, acceptedLegal, labType, ...profile }
          : { name, code, acceptedLegal, ...profile }
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
        body: JSON.stringify({
          name,
          highSchool: highSchool.trim() || undefined,
          acceptedLegal,
        }),
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

  const detailsComplete =
    acceptedLegal &&
    !!name.trim() &&
    (mode === 'create' ? !!teamName.trim() : code.trim().length >= 4)
  // Creating also needs a lab type, which lives on the second screen.
  const canSubmit = detailsComplete && (mode !== 'create' || !!labType)

  /** Create: advance to the lab-type screen. Join: submit outright. */
  function handleDetailsSubmit(e: React.FormEvent) {
    if (mode === 'create') {
      e.preventDefault()
      setError(null)
      setStep('labType')
      return
    }
    void handleSubmit(e)
  }

  const canTeacherSubmit = acceptedLegal && !!name.trim()

  // Screen 2 of creating a lab. The account type is already settled by the time
  // you get here, so the student/teacher toggle comes off — and the wider
  // container gives the six lab cards room for their building art.
  const onLabTypeStep = accountType === 'student' && step === 'labType'

  return (
    <div className={`w-full space-y-8 ${onLabTypeStep ? 'max-w-4xl' : 'max-w-md'}`}>
      {/* The lab-type step is its own screen with its own heading — a second
          "Welcome to scienium" above it is just noise by that point. */}
      {!onLabTypeStep && (
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
      )}

      {/* Student / Teacher top-level account type toggle. Hidden on the lab-type
          screen: the choice is already made, and "Back" is the way to change it. */}
      {!onLabTypeStep && (
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
      )}

      {onLabTypeStep ? (
        /* Its own screen rather than one more field: this is the only choice in
           onboarding a student cannot answer from what they already know, so it
           gets room to explain itself. */
        <form onSubmit={handleSubmit} className="space-y-6">
          <LabTypePicker value={labType} onChange={setLabType} />

          {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {entering ? 'Entering your lab…' : loading ? 'Setting up…' : '↑ Enter Your Lab'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setError(null)
              }}
              disabled={loading || entering}
              className="w-full font-pixel text-[8px] text-white/40 hover:text-white/70 py-2 uppercase tracking-widest transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
          </div>
        </form>
      ) : accountType === 'student' ? (
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

          <form onSubmit={handleDetailsSubmit} className="space-y-5">
            <NameField name={name} setName={setName} />

            <div className="space-y-1.5">
              <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                Class code <span className="text-white/40">(optional · from your teacher)</span>
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="SCI-2026"
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
                  placeholder="Nova Research Lab"
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
                    placeholder="94016"
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

            <LegalConsentField accepted={acceptedLegal} setAccepted={setAcceptedLegal} />

            {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !detailsComplete}
              className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? 'Joining…'
                : mode === 'create'
                  ? 'Next · Pick your lab →'
                  : '↑ Join the Lab'}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleTeacherSubmit} className="space-y-5">
          <NameField name={name} setName={setName} />
          <SchoolField highSchool={highSchool} setHighSchool={setHighSchool} />

          <LegalConsentField accepted={acceptedLegal} setAccepted={setAcceptedLegal} />

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
