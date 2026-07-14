'use client'

import { useState } from 'react'

const CONTACT_EMAIL = 'hello@scienium.app'

/**
 * Client-side only. Builds a mailto: link on submit. No backend endpoint;
 * add one (or wire Resend) if a logged/tracked inbox becomes necessary.
 * Light-themed to match the public marketing pages.
 */
export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Message from ${name || 'the scienium site'}`)
    const body = encodeURIComponent(`${message}\n\nfrom ${name} (${email})`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  const inputClass =
    'w-full bg-white border border-[#d9d8cd] text-[#0d1b2e] text-sm px-3 py-2.5 rounded-md placeholder:text-[#6c7787] focus:outline-none focus:border-[#0d1b2e] focus:ring-2 focus:ring-[#F5C518]/50 transition-colors'
  const labelClass = 'font-pixel text-[#5a6b80]' as const
  const labelStyle = { fontSize: '0.6rem' } as const

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className={labelClass} style={labelStyle}>Name</label>
        <input
          id="contact-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className={labelClass} style={labelStyle}>Email</label>
        <input
          id="contact-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className={labelClass} style={labelStyle}>Message</label>
        <textarea
          id="contact-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="font-pixel bg-[#F5C518] text-[#0d1b2e] px-6 py-3 hover:brightness-95 active:scale-95 transition-all rounded-md self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f2f1ea]"
        style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}
      >
        SEND
      </button>
      <p className="font-display text-xs text-[#5a6b80]">
        Opens your email client, or write us directly at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#0d1b2e] underline decoration-[#F5C518] decoration-2 underline-offset-2 hover:opacity-70">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </form>
  )
}
