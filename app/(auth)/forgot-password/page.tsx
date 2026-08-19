'use client'

// CANONICAL: password reset request page.
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20'
const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    let supabase
    try {
      supabase = createSupabaseBrowserClient()
    } catch (clientError) {
      setLoading(false)
      setError(
        clientError instanceof Error
          ? clientError.message
          : 'We could not reach the sign-in service. Please try again in a few minutes.'
      )
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    })
    setLoading(false)
    if (resetError) {
      const lower = resetError.message.toLowerCase()
      setError(
        lower.includes('rate limit') || lower.includes('too many')
          ? 'Too many requests. Give it a minute, then try again.'
          : 'We could not send the reset email just now. Please try again in a moment.'
      )
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6 text-emerald-700"
            aria-hidden="true"
          >
            <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="4" y="5" width="16" height="14" rx="2" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">Reset link sent</h1>
        <p className="mt-2 text-sm text-slate-600">
          {'If an account exists for '}
          <span className="font-semibold text-slate-900">{email.trim()}</span>
          {', a reset link is on its way. The link signs you in so you can choose a new password.'}
        </p>
        <p className="mt-3 text-xs text-slate-500">{'Not seeing it? Check your spam folder, it happens.'}</p>
        <Link href="/login" className="mt-6 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        {'Enter your email and we will send you a link to choose a new password.'}
      </p>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`mt-1.5 ${inputClass}`}
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Spinner />
              Sending the link
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {'Remembered it? '}
        <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Sign in
        </Link>
      </p>
    </div>
  )
}
