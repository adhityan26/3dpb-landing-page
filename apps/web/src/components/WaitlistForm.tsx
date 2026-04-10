import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export interface WaitlistStrings {
  title: string
  subtitle: string
  emailLabel: string
  emailPlaceholder: string
  nameLabel: string
  namePlaceholder: string
  submit: string
  submitting: string
  success: string
  errorInvalidEmail: string
  errorGeneric: string
}

interface Props {
  strings: WaitlistStrings
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function WaitlistForm({ strings }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) {
      setStatus('error')
      setErrorMessage(strings.errorInvalidEmail)
      return
    }
    setStatus('submitting')
    setErrorMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setStatus('error')
        setErrorMessage(body.error === 'invalid_email' ? strings.errorInvalidEmail : strings.errorGeneric)
        return
      }
      setStatus('success')
      setEmail('')
      setName('')
    } catch {
      setStatus('error')
      setErrorMessage(strings.errorGeneric)
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] p-4 text-sm"
      >
        {strings.success}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <h3 className="mb-1 text-lg font-display font-semibold">{strings.title}</h3>
        <p className="text-sm text-[color:var(--color-ink-500)]">{strings.subtitle}</p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.emailLabel}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder={strings.emailPlaceholder}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.nameLabel}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={strings.namePlaceholder}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
      </label>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-[color:var(--color-brand-500)] px-5 py-2.5 font-medium text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60"
      >
        {status === 'submitting' ? strings.submitting : strings.submit}
      </button>
    </form>
  )
}
