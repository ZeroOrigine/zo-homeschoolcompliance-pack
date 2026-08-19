// CANONICAL pricing tiers for HomeschoolCompliance Pack. Single source of plan copy shown on / and /pricing.
import Link from 'next/link'
import { IconCheck } from '@/components/marketing/icons'
import { listPlans } from '@/lib/db/catalog'
import { FALLBACK_PAID_PRICE_CENTS, formatUsd } from '@/lib/core/pricing'

/**
 * Fallback shown only if the plans catalog cannot be read at render time.
 * The live price comes from homeschoolcompliancepack_plans via listPlans() —
 * the same rows checkout charges against — so marketing copy cannot silently desync.
 */

export const PLANS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'free forever',
    tagline: 'Know exactly where you stand before you spend a dollar.',
    features: [
      'Plain-English summary of your state’s homeschool requirements',
      'The filing and testing dates your state publishes',
      'No credit card required',
    ],
    cta: 'Start free',
    href: '/signup',
    note: 'Free forever. Upgrade whenever you want.',
    highlighted: false,
  },
  {
    name: 'Compliance Pack',
    price: formatUsd(FALLBACK_PAID_PRICE_CENTS),
    cadence: 'one-time purchase',
    tagline: 'Your documents, your calendar, your reminders. Pay once and keep it.',
    features: [
      'Everything in Free',
      'Notice of intent pre-filled with your details',
      'Personal calendar of every filing and testing date for your school year',
      'Dashboard reminders two weeks before each deadline',
      'One payment. Nothing renews, nothing to cancel.',
    ],
    cta: 'Get the pack',
    href: '/signup',
    note: 'Sign up free, then unlock the pack from your dashboard.',
    highlighted: true,
  },
] as const

export default async function PricingTiers() {
  let paidPrice = formatUsd(FALLBACK_PAID_PRICE_CENTS)
  try {
    const plans = await listPlans()
    const paid = plans.find((p) => Number(p.price_cents) > 0)
    if (paid) paidPrice = formatUsd(Number(paid.price_cents))
  } catch {
    // Catalog unreachable — keep the fallback rather than break the marketing page.
  }
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-8 md:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm dark:bg-slate-900 ${
              plan.highlighted
                ? 'border-emerald-600 ring-2 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Recommended
              </span>
            )}
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{plan.name === 'Compliance Pack' ? paidPrice : plan.price}</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.cadence}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{plan.tagline}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-3 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                plan.highlighted
                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {plan.cta}
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{plan.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">Secure checkout through Stripe. Prices in US dollars.</p>
    </div>
  )
}
