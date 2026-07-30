'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { getNotificationPrefs, saveNotificationPrefs } from './api'

/**
 * Deadline-reminder settings (spec §13.7, REFACTOR2 P2-S3 + §0.8).
 *
 * These preferences were stored by an API with no UI at all, and the cron
 * ignored the windows anyway. Both are fixed, so the settings are worth showing:
 * the windows now decide which reminder emails THIS member gets, independently
 * of their teammates.
 *
 * The destination is stated and not editable — it is the address Clerk verified
 * for the account. It used to be a free-text field with no verification of any
 * kind, which made the app a mailer for whatever address a student typed.
 */

/** The windows offered. Any subset; the bell shows the whole team's union. */
const WINDOWS = [30, 14, 7, 1]

export function RemindersSection() {
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [days, setDays] = useState<number[]>(WINDOWS)

  const load = useCallback(() => {
    setLoaded(false)
    setLoadError(false)
    return getNotificationPrefs()
      .then((d) => {
        setEmailEnabled(d.emailEnabled)
        setEmail(d.email)
        setDays(d.deadlineDays.length ? d.deadlineDays : WINDOWS)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const d = await saveNotificationPrefs({ emailEnabled, deadlineDays: days })
      setEmailEnabled(d.emailEnabled)
      setDays(d.deadlineDays)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your reminder settings')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4" data-testid="settings-reminders-skeleton">
        <PixelSkeleton variant="line" h="h-4" w="w-28" />
        <PixelSkeleton variant="box" h="h-9" w="w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
        <Bell size={10} className="text-[#F5C518]" /> Deadline reminders
      </h3>

      {loadError ? (
        <>
          <p className="font-pixel text-[7px] text-red-400 leading-loose">
            Couldn&apos;t load your reminder settings — check your connection.
          </p>
          <button
            onClick={() => void load()}
            className="self-start font-pixel text-[7px] text-white/40 hover:text-white/70 border border-white/15 rounded-sm px-3 py-1.5 transition-colors"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="font-pixel text-[7px] text-white/40 leading-loose">
            Your bell always shows your team&apos;s fair deadlines. These settings are yours alone —
            a teammate&apos;s choices don&apos;t change them.
          </p>

          <div className="flex flex-col gap-2">
            <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
              Remind me this many days before
            </label>
            <div className="flex gap-2 flex-wrap">
              {WINDOWS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  aria-pressed={days.includes(d)}
                  className={`font-pixel text-[8px] px-4 py-2 border rounded-sm transition-colors ${
                    days.includes(d)
                      ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                      : 'border-white/20 text-white/45 hover:border-white/40 hover:text-white/70'
                  }`}
                >
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
            {days.length === 0 && (
              <span className="font-pixel text-[7px] text-white/40 leading-loose">
                None selected — saving now restores the default 30 / 14 / 7 / 1.
              </span>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="mt-0.5 accent-[#F5C518] w-3.5 h-3.5"
            />
            <span className="flex flex-col gap-1">
              <span className="font-pixel text-[8px] text-white/80">Email me these reminders</span>
              <span className="text-[12px] text-white/50 leading-relaxed">
                {email ? (
                  <>
                    Sent to <span className="text-white/80">{email}</span> — the address on your
                    account. Reminders can only go to the address you signed in with, so nobody can
                    point school mail somewhere else. Change it in your account settings.
                  </>
                ) : (
                  <>Your account has no email address, so reminders can&apos;t be sent.</>
                )}
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <BusyButton
              busy={saving}
              busyLabel="Saving…"
              onClick={save}
              disabled={emailEnabled && !email}
              className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              Save reminders
            </BusyButton>
            {saved && <span className="font-pixel text-[7px] text-green-400">Saved!</span>}
          </div>

          {saveError && (
            <p className="font-pixel text-[7px] text-red-400 leading-loose">{saveError}</p>
          )}
        </>
      )}
    </div>
  )
}
