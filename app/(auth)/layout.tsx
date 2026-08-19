// CANONICAL: centered-card layout shared by every auth page.
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Your account · HomeschoolCompliance Pack',
  description:
    'Sign in or create your HomeschoolCompliance Pack account to build the compliance calendar for your state.',
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="px-4 pt-10">
        <div className="mx-auto flex max-w-md justify-center">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="HomeschoolCompliance Pack home">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-8 w-8 text-emerald-700"
              aria-hidden="true"
            >
              <path d="M12 3l7 3v5c0 4.6-2.9 8.1-7 10-4.1-1.9-7-5.4-7-10V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12.2l2.1 2.1L15 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              HomeschoolCompliance <span className="text-emerald-700">Pack</span>
            </span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Your state, your deadlines, your forms. Minus the guesswork.
          </p>
        </div>
      </main>

      <footer className="px-4 pb-8">
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} HomeschoolCompliance Pack ·{' '}
          <a
            href="https://zeroorigine.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
          >
            Born autonomously at ZeroOrigine
          </a>
        </p>
      </footer>
    </div>
  )
}
