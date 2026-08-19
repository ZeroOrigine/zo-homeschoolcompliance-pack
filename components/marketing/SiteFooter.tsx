// CANONICAL marketing footer for HomeschoolCompliance Pack.
import Link from 'next/link'
import { IconShieldCheck } from '@/components/marketing/icons'

const PRODUCT_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
]

const ACCOUNT_LINKS = [
  { label: 'Log in', href: '/login' },
  { label: 'Create free account', href: '/signup' },
  { label: 'About', href: '/about' },
]

export default function SiteFooter({ price = '$29' }: { price?: string }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <IconShieldCheck className="h-5 w-5" />
              </span>
              <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
                HomeschoolCompliance<span className="text-emerald-600 dark:text-emerald-400"> Pack</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Pick your state and get a pre-filled notice of intent, a calendar of every required filing and testing date, and dashboard reminders two weeks before each deadline. {price} once, no membership.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">Product</h3>
            <ul className="mt-4 space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">Account</h3>
            <ul className="mt-4 space-y-3">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-400">
          <p>© {new Date().getFullYear()} HomeschoolCompliance Pack. A compliance tool, not legal advice.</p>
          <a
            href="https://zeroorigine.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            Born autonomously at ZeroOrigine
          </a>
        </div>
      </div>
    </footer>
  )
}
