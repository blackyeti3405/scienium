'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

type Mode = 'create' | 'join'
type AccountType = 'student' | 'teacher'

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
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Setup failed')
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleTeacherSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, highSchool: highSchool.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Setup failed')
        return
      }
      // Hard navigation (not router.push) so the browser performs a full document
      // load. This forces Clerk to re-mint the session token server-side, ensuring
      // sessionClaims.metadata.role reflects the just-written publicMetadata.role
      // before (teacher)/layout.tsx evaluates the gate. Live-verified step.
      window.location.assign('/teacher')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !!name.trim() && (mode === 'create' ? !!teamName.trim() : code.trim().length >= 4)

  const canTeacherSubmit = !!name.trim()

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h1 className="font-pixel text-white text-lg">Welcome to scienium</h1>
        <p className="font-pixel text-white/40 text-[9px] mt-2">
          Set up your researcher profile to get started.
        </p>
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
                className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
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
                className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                Class code <span className="text-white/25">(optional · from your teacher)</span>
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="MRB-2026"
                maxLength={32}
                className="w-full bg-[#0a1628] border border-white/20 text-white text-sm tracking-[0.2em] px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30 placeholder:tracking-normal"
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
                  className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
                />
                <div className="space-y-1.5 pt-3">
                  <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                    ZIP code <span className="text-white/25">(optional · finds your fairs)</span>
                  </label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="90089"
                    maxLength={10}
                    className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
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
                  className="w-full bg-[#0a1628] border border-white/20 text-white text-sm tracking-[0.3em] px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30 placeholder:tracking-normal"
                />
                <p className="font-pixel text-[7px] text-white/30 leading-loose">
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
              {loading
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
              className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
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
              className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
            />
          </div>

          {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !canTeacherSubmit}
            className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Setting up…' : '↑ Enter Teacher Dashboard'}
          </button>
        </form>
      )}
    </div>
  )
}
