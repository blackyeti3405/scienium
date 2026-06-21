'use client'

import { useState, useEffect } from 'react'
import { Loader2, Radio, Send, Check } from 'lucide-react'
import { useLabCurrency } from '@/lib/labCurrency'

interface DispatchData {
  available: boolean
  content?: { id: string; body: string; reflectionQuestion: string }
  responded?: boolean
  response?: string | null
  kpReward?: number
}

/**
 * Field Dispatch (spec §7.1) — the daily ~2-minute discipline tip + reflection
 * question, surfaced as the first Operations Hub tab. Answering awards a flat KP
 * once per day; the server enforces the once-per-day cap, this just reflects it.
 */
export function FieldDispatchTab() {
  const { addCurrency } = useLabCurrency()
  const [data, setData] = useState<DispatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justEarned, setJustEarned] = useState(false)

  useEffect(() => {
    fetch('/api/field-dispatch')
      .then((r) => r.json())
      .then((d: DispatchData) => {
        setData(d)
        if (d.responded && d.response) setAnswer(d.response)
      })
      .catch(() => setError('Could not load today’s dispatch.'))
      .finally(() => setLoading(false))
  }, [])

  async function submit() {
    if (!data?.content || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/field-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: data.content.id, response: answer }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Submit failed')
      setData((d) => (d ? { ...d, responded: true, response: answer } : d))
      if (out.kpAwarded > 0) {
        addCurrency({ kp: out.kpAwarded })
        setJustEarned(true)
        setTimeout(() => setJustEarned(false), 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="ops-tab-body items-center justify-center">
        <Loader2 className="animate-spin text-white/30" size={20} />
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="ops-tab-body items-center justify-center text-center px-8">
        <Radio className="text-white/20 mb-3" size={28} />
        <span className="font-pixel text-[9px] text-white/40 leading-relaxed">
          Field Dispatch unlocks once your lab type is assigned.
          <br />
          Finish your literature review to specialize.
        </span>
      </div>
    )
  }

  const responded = !!data.responded

  return (
    <div className="ops-tab-body">
      <div className="max-w-2xl mx-auto w-full space-y-5 py-2">
        <div className="flex items-center gap-2">
          <Radio className="text-[#F5C518]" size={14} />
          <span className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">
            Today’s Field Dispatch
          </span>
        </div>

        <p className="text-sm leading-relaxed text-white/85">{data.content?.body}</p>

        <div className="border-t border-white/10 pt-4 space-y-2">
          <span className="font-pixel text-[8px] text-white/45 uppercase tracking-widest">
            Reflect
          </span>
          <p className="text-sm text-white/90 font-medium">{data.content?.reflectionQuestion}</p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={responded || busy}
          rows={4}
          maxLength={2000}
          placeholder="Write a sentence or two…"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/25 disabled:opacity-60 resize-none"
        />

        {error && <p className="font-pixel text-[8px] text-red-400">{error}</p>}

        {responded ? (
          <div className="flex items-center gap-2 font-pixel text-[9px] text-emerald-400">
            <Check size={14} />
            {justEarned
              ? `+${data.kpReward} KP earned — see you tomorrow!`
              : `Answered today · +${data.kpReward} KP`}
          </div>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy || !answer.trim()}
            className="inline-flex items-center gap-2 font-pixel text-[9px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2.5 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {busy ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
            {busy ? 'Submitting…' : `Submit · +${data.kpReward} KP`}
          </button>
        )}
      </div>
    </div>
  )
}
