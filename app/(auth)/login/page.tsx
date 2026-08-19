'use client'

// CANONICAL: sign-in page. Email and password are the enabled methods, no OAuth buttons (Law #115).
import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20'
const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'That email and password do not match. Try again, or reset your password below.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Open the confirmation link we sent you, then sign in.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Give it a minute, then try again.'
  }
  return 'We could not sign you in just now. Please try again in a moment.'
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNext(searchParams.get('next'))
  const notice = searchParams.get('message')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)


  async function handleGoogle() {
    setError(null)
    let supabase
    try {
      supabase = createSupabaseBrowserClient()
    } catch (clientError) {
      setError(
        clientError instanceof Error
          ? clientError.message
          : 'We could not reach the sign-in service. Please try again in a few minutes.'
      )
      return
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
    })
    if (oauthError) setError('Google sign-in did not start. Please try again or use your password.')
  }

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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setLoading(false)
      setError(friendlyError(signInError.message))
      return
    }
    router.push(nextPath)
    router.refresh()
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-600">Sign in to your compliance calendar and documents.</p>

      {notice ? (
        <p
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"
          role="status"
        >
          {notice}
        </p>
      ) : null}

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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-16`}
              placeholder="Your password"
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

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Spinner />
              Signing you in
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.03c2.2-2.05 3.5-5.05 3.5-8.6" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.05 7.9-2.9l-3.75-2.9c-1 .7-2.35 1.2-4.15 1.2-3.15 0-5.85-2.1-6.8-5l-.14.01-3.63 2.8-.05.13C3.35 21.3 7.35 24 12 24" />
          <path fill="#FBBC05" d="M5.2 14.4c-.25-.75-.4-1.55-.4-2.4s.15-1.65.4-2.4l-.01-.16-3.68-2.86-.12.06C.5 8.35 0 10.1 0 12s.5 3.65 1.4 5.35l3.8-2.95" />
          <path fill="#EB4335" d="M12 4.6c2.25 0 3.75.95 4.6 1.75l3.35-3.3C17.9 1.15 15.2 0 12 0 7.35 0 3.35 2.7 1.4 6.65l3.8 2.95c.95-2.9 3.65-5 6.8-5" />
        </svg>
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-600">
        {'New here? '}
        <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Create a free account
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />}>
      <LoginForm />
    </Suspense>
  )
}
