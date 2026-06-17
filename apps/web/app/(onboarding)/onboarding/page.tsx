'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()

  const [name, setName] = useState('')

  useEffect(() => {
    if (user && !name) {
      setName(user.fullName ?? user.firstName ?? '')
    }
  }, [user])
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamName }),
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

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h1 className="font-pixel text-white text-lg">Welcome to NOVA Lab</h1>
        <p className="font-pixel text-white/40 text-[9px] mt-2">Set up your researcher profile to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">Your name</label>
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
          <label className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">Lab / team name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            placeholder="Saini Research Lab"
            className="w-full bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/30"
          />
        </div>

        {error && (
          <p className="font-pixel text-[8px] text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !teamName.trim()}
          className="w-full font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] py-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Setting up…' : '↑ Enter Your Lab'}
        </button>
      </form>
    </div>
  )
}
