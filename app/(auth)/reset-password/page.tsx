'use client'

// CANONICAL: set a new password after arriving from a recovery link.
import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let supabase
    try {
      supabase = createSupabaseBrowserClient()
    } catch {
      setStatus('expired')
      return
    }
    // Recovery links can deliver the session in the URL FRAGMENT
    // (#access_token=...&refresh_token=...) — a server route never sees
    // fragments, so THIS page consumes it explicitly. Found live 2026-08-19:
    // every recovery click died as "expired" because nothing read the hash.
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          window.history.replaceState(null, '', window.location.pathname)
          setStatus(sessionError ? 'expired' : 'ready')
        })
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'expired')
    })
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match yet. Give it another try.')
      return
    }
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
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setLoading(false)
      const lower = updateError.message.toLowerCase()
      setError(
        lower.includes('different')
          ? 'Your new password matches the old one. Pick something different.'
          : 'We could not update your password just now. Please try again in a moment.'
      )
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  if (status === 'checking') {
    return <div className="h-56 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />
  }

  if (status === 'expired') {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Link expired</h1>
        <p className="mt-2 text-sm text-slate-600">
          This reset link has expired or was already used. Request a fresh one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        You are signed in through your reset link. Set the new password below.
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
          <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <div className="relative mt-1.5">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-16`}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={`mt-1.5 ${inputClass}`}
            placeholder="Type it once more"
          />
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Spinner />
              Saving your password
            </>
          ) : (
            'Save new password'
          )}
        </button>
      </form>
    </div>
  )
}
