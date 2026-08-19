// CANONICAL pricing page for HomeschoolCompliance Pack.
import type { Metadata } from 'next'
import { getPaidPriceLabel } from '@/lib/core/pricing'
import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import PricingTiers from '@/components/marketing/PricingTiers'
import FaqAccordion from '@/components/marketing/FaqAccordion'
import Reveal from '@/components/marketing/Reveal'
import CtaBand from '@/components/marketing/CtaBand'
import { IconDocument, IconCalendar, IconMail, IconCheck, IconX } from '@/components/marketing/icons'

export async function generateMetadata(): Promise<Metadata> {
  const price = await getPaidPriceLabel()
  return {
    title: 'Pricing | HomeschoolCompliance Pack',
    description: `A free plan to see your state’s homeschool requirements, and a ${price} one-time Compliance Pack with a pre-filled notice of intent, a personal deadline calendar, and dashboard reminders.`,
    openGraph: {
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeschoolcompliancepack.zeroorigine.com'}/pricing`,
      title: 'Pricing | HomeschoolCompliance Pack',
      description: `Free to see where you stand. ${price} once for the documents, the calendar, and the reminders. No membership.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pricing | HomeschoolCompliance Pack',
      description: `Free to see where you stand. ${price} once for the documents, the calendar, and the reminders. No membership.`,
    },
  }
}

const PACK_COVERS = [
  {
    icon: IconDocument,
    title: 'Notice of intent, pre-filled',
    body: 'Your state’s template with your family’s details already in place. Print, sign, send.',
  },
  {
    icon: IconCalendar,
    title: 'Your deadline calendar',
    body: 'Every required filing, testing, and evaluation date for your school year, in order.',
  },
  {
    icon: IconMail,
    title: 'Reminders two weeks out',
    body: 'Dashboard reminders appear two weeks before each deadline so nothing catches you off guard.',
  },
]

const IT_IS = (price: string) => [
  'A plain-English guide to your state’s homeschool requirements',
  'A pre-filled notice of intent, ready to print and send',
  'A personal deadline calendar with dashboard reminders two weeks before each deadline',
  `A ${price} one-time purchase that stays yours`,
]

const IT_IS_NOT = [
  'A subscription or a membership',
  'Legal-defense insurance',
  'Legal advice. For court matters, talk to an attorney.',
]

export default async function PricingPage() {
  const price = await getPaidPriceLabel()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeschoolcompliancepack.zeroorigine.com'
  const numericPrice = price.replace(/[^0-9.]/g, '') || '0'
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'HomeschoolCompliance Pack',
    description:
      'A pre-filled notice of intent, a personal calendar of every required homeschool filing and testing date for the year, and reminders two weeks before each deadline.',
    url: `${siteUrl}/pricing`,
    offers: {
      '@type': 'Offer',
      price: numericPrice,
      priceCurrency: 'USD',
      url: `${siteUrl}/pricing`,
      availability: 'https://schema.org/InStock',
    },
  }
  return (
    <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <SiteHeader />

      <main id="main-content">
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Pay once. Homeschool in peace.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Start free to see exactly what your state requires. Buy the {price} pack when you want the documents, the calendar, and the reminders handled for the year.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {await PricingTiers()}
      </section>

      <section className="bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              What the {price} pack covers
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Three deliverables, generated from your state and your family details.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PACK_COVERS.map((item, i) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={i * 70}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            What this is, and what it is not
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 dark:border-emerald-900 dark:bg-emerald-900/20">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">It is</h3>
            <ul className="mt-5 space-y-3">
              {IT_IS(price).map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">It is not</h3>
            <ul className="mt-5 space-y-3">
              {IT_IS_NOT.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <IconX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-12">
            <FaqAccordion />
          </div>
        </div>
      </section>

      <CtaBand
        heading="Ready to see your state’s requirements?"
        body="Create a free account, pick your state, and know where you stand today."
        showPricingLink={false}
        price={price}
      />
      </main>

      <SiteFooter price={price} />
    </div>
  )
}
