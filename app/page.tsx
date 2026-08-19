// CANONICAL marketing landing page for HomeschoolCompliance Pack.
import type { Metadata } from 'next'
import { getPaidPriceLabel } from '@/lib/core/pricing'
import Link from 'next/link'
import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import PricingTiers from '@/components/marketing/PricingTiers'
import FaqAccordion from '@/components/marketing/FaqAccordion'
import Reveal from '@/components/marketing/Reveal'
import CtaBand from '@/components/marketing/CtaBand'
import {
  IconMapPin,
  IconDocument,
  IconCalendar,
  IconClipboardCheck,
  IconCreditCard,
} from '@/components/marketing/icons'

export async function generateMetadata(): Promise<Metadata> {
  const price = await getPaidPriceLabel()
  return {
    title: 'HomeschoolCompliance Pack | Never miss a homeschool filing deadline',
    description: `Pick your state and get a pre-filled notice of intent, a calendar of every required filing and testing date, and a dashboard reminder two weeks before each one. ${price} once. No membership.`,
    openGraph: {
      url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeschoolcompliancepack.zeroorigine.com',
      title: 'HomeschoolCompliance Pack',
      description: `Your state’s homeschool requirements turned into documents, dates, and reminders. ${price} once. No membership.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'HomeschoolCompliance Pack | Never miss a homeschool filing deadline',
      description: `Your state’s homeschool requirements turned into documents, dates, and reminders. ${price} once. No membership.`,
    },
  }
}

const PROBLEMS = [
  {
    title: 'Deadlines differ',
    body: 'Some states want notice before you begin, some want it every single year, and a few want nothing at all. The date depends entirely on where you live.',
  },
  {
    title: 'Forms differ',
    body: 'Notarized affidavits, simple letters, district portals: every state collects paperwork its own way. The pack gives you the version your state expects.',
  },
  {
    title: 'The stakes are real',
    body: 'Miss a filing and the district can treat your child as truant. That is the letter no parent wants to open.',
  },
]

const FEATURES = (price: string) => [
  {
    icon: IconMapPin,
    title: 'Your state’s rules in plain English',
    body: 'Select your state and read what is actually required: notices, attendance, testing, evaluations. No legalese, no forum guesswork.',
  },
  {
    icon: IconDocument,
    title: 'A notice of intent, pre-filled',
    body: 'Your state’s notice-of-intent template arrives with your family’s details already filled in. Print it, sign it, send it.',
  },
  {
    icon: IconCalendar,
    title: 'Every date on one calendar',
    body: 'Filing windows, testing dates, and evaluation deadlines for your school year, laid out in order so nothing sneaks up on you.',
  },
  {
    icon: IconCalendar,
    title: 'Reminders, two weeks out',
    body: 'Fourteen days before each deadline, a reminder appears on your dashboard with what is due and exactly what to do next.',
  },
  {
    icon: IconClipboardCheck,
    title: 'Testing and evaluation windows included',
    body: 'If your state requires standardized testing or portfolio evaluations, those dates go on your calendar automatically.',
  },
  {
    icon: IconCreditCard,
    title: 'Pay once, keep everything',
    body: `The pack costs ${price} one time. Your documents and your calendar stay yours, and nothing renews behind your back.`,
  },
]

const STEPS = [
  {
    title: 'Pick your state',
    body: 'Choose your state and add your family details: names, school year, grades. It takes about a minute.',
  },
  {
    title: 'Get your pack',
    body: 'Your notice of intent is pre-filled and your compliance calendar is built: every required filing and testing date for the year ahead.',
  },
  {
    title: 'Homeschool in peace',
    body: 'Two weeks before each deadline, your dashboard flags what is due, with your documents ready to go.',
  },
]

const CALENDAR_ROWS = [
  { label: 'File notice of intent', when: 'Due in 14 days', status: 'Due soon', urgent: true },
  { label: 'Standardized testing window', when: 'Spring', status: 'On calendar', urgent: false },
  { label: 'Attendance log', when: 'Through the year', status: 'On calendar', urgent: false },
  { label: 'Year-end evaluation', when: 'June', status: 'On calendar', urgent: false },
]

export default async function LandingPage() {
  const price = await getPaidPriceLabel()
  return (
    <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main id="main-content">
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-emerald-100 blur-3xl dark:bg-emerald-900/30" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-64 h-80 w-80 rounded-full bg-amber-100 blur-3xl dark:bg-amber-900/20" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {price} once. No membership. No renewal.
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Never miss a homeschool filing deadline again.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Pick your state. HomeschoolCompliance Pack pre-fills your notice of intent, puts every required filing and testing date on one calendar, and flags a reminder on your dashboard two weeks before each deadline.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                See your state’s requirements
              </Link>
              <a
                href="#pricing"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View pricing
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Free plan available. No credit card required.</p>
            <p className="mt-6 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Built for new homeschool families, families moving states, and parents in high-regulation states like New York and Pennsylvania.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -top-4 right-2 z-10 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              Notice of intent: pre-filled
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-900/5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Your compliance year</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generated from your state’s requirements</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">School year</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {CALENDAR_ROWS.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.urgent ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{row.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.when}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.urgent
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                <IconCalendar className="h-4 w-4 shrink-0" />
                Reminders appear on your dashboard two weeks before every date.
              </div>
            </div>
            <div className="absolute -bottom-6 -left-2 w-64 rotate-[-1.5deg] rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:-left-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <IconClipboardCheck className="h-4 w-4" />
                Dashboard reminder
              </div>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                Your notice of intent is due in 14 days. Your pre-filled template is ready to print and send.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">The problem</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Fifty states. Fifty different rulebooks.
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Forum threads and social media groups are full of guesses. Your school district is not guessing, and neither should you.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROBLEMS.map((problem, i) => (
              <Reveal key={problem.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{problem.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">What you get</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Compliance, handled end to end
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Everything in the pack exists to answer two questions: what does my state require, and when is it due.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES(price).map((feature, i) => {
              const Icon = feature.icon
              return (
                <Reveal key={feature.title} delay={i * 60}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              From state pick to peace of mind in three steps
            </h2>
          </div>
          <div className="relative mt-14">
            <div aria-hidden="true" className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 lg:block dark:from-emerald-900 dark:via-emerald-600 dark:to-emerald-900" />
            <ol className="grid gap-12 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex flex-col items-start lg:items-center lg:text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 font-display text-xl font-bold text-white ring-8 ring-slate-50 dark:ring-slate-900">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Free to look. {price} to handle the year.
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Start free and read your state’s requirements. Buy the pack once, and the paperwork, the dates, and the reminders are handled.
            </p>
          </div>
          <div className="mt-14">{await PricingTiers()}</div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Everything parents ask before they start.</p>
          </div>
          <div className="mt-12">
            <FaqAccordion price={price} />
          </div>
        </div>
      </section>

      <CtaBand
        heading="Know exactly what your state expects."
        body="Pick your state today. In a few minutes you’ll see every requirement and every date for your school year."
        price={price}
      />
      </main>

      <SiteFooter price={price} />
    </div>
  )
}
