// CANONICAL: /about marketing page. Catalog data flows only through lib/db/catalog (no self-fetch, no env-derived base URLs).
import Link from 'next/link';
import type { Metadata } from 'next';
import { listPlans, listStates, type PlanRow, type StateRow } from '@/lib/db/catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About HomeschoolCompliance Pack',
  description:
    'Pick your state and get a pre-filled notice of intent, a personal calendar of every filing and testing date, and reminders two weeks before each deadline.',
};

type RegulationLevel = StateRow['regulation_level'];

const LEVEL_ORDER: RegulationLevel[] = ['high', 'moderate', 'low', 'none'];

const LEVEL_COPY: Record<RegulationLevel, { label: string; detail: string }> = {
  high: { label: 'High regulation', detail: 'Approvals, portfolios, or several filings every year.' },
  moderate: { label: 'Moderate regulation', detail: 'Annual notices plus testing or evaluations.' },
  low: { label: 'Low regulation', detail: 'A notice or registration, and little else.' },
  none: { label: 'No notice required', detail: 'Nothing to file. Good records are still smart.' },
};

async function loadCatalog(): Promise<{ states: StateRow[]; plans: PlanRow[] }> {
  // QA-021: plans are the single authoritative price source (homeschoolcompliancepack_plans via listPlans()).
  // Settle each query independently so a states failure can never hide the live DB-backed price on this page.
  const [statesResult, plansResult] = await Promise.allSettled([listStates(), listPlans()]);
  return {
    states: statesResult.status === 'fulfilled' ? statesResult.value.items : [],
    plans: plansResult.status === 'fulfilled' ? plansResult.value : [],
  };
}

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function AboutPage() {
  const { states, plans } = await loadCatalog();
  const levelCounts: Record<RegulationLevel, number> = { none: 0, low: 0, moderate: 0, high: 0 };
  for (const state of states) levelCounts[state.regulation_level] += 1;

  const features = [
    {
      title: 'A pre-filled notice of intent',
      body: 'Your parent, student, and district details drop into a letter formatted for your state’s filing office, with the statute cited where it helps. Review it, print it, send it.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4h4M10 13h5M10 17h5" />
        </svg>
      ),
    },
    {
      title: 'A calendar built from your state’s rules',
      body: 'Pick your state and school year. Every required filing, testing window, and review lands on one calendar with real due dates, not vague guidance.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <rect x="4" y="6" width="16" height="15" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M4 11h16" />
        </svg>
      ),
    },
    {
      title: 'Reminders two weeks out',
      body: 'Every deadline carries a reminder date 14 days ahead, so nothing surfaces the night before it is due. Mark items complete as you file.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 16H6l1.5-2v-4a4.5 4.5 0 019 0v4L18 16z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19a1.5 1.5 0 003 0" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      title: 'Pick your state',
      body: 'Choose from all 50 states and Washington DC. You see the regulation level, the office that receives filings, and the rule behind each requirement.',
    },
    {
      title: 'Add your students',
      body: 'Grade levels matter. Testing rules that only apply in certain grades attach to the right child automatically.',
    },
    {
      title: 'Generate your pack',
      body: 'One click builds your compliance calendar and drafts your notice of intent. Regenerate at the start of each school year, completed items stay put.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-slate-900 sm:text-base">HomeschoolCompliance Pack</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-5">
            <Link href="/pricing" className="rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
              Pricing
            </Link>
            <Link href="/about" aria-current="page" className="rounded-md text-sm font-semibold text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
              About
            </Link>
            <Link href="/login" className="hidden rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:block">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="bg-gradient-to-b from-emerald-50 to-white">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">About</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              The paperwork side of homeschooling, organized
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Every state sets its own homeschool rules: notices of intent, testing windows, portfolio reviews, quarterly reports. Missing a date can put a
              family on the wrong side of a truancy statute. HomeschoolCompliance Pack turns your state’s requirements into a pre-filled notice, a
              personal calendar, and reminders that fire two weeks before each deadline.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">One tool, three jobs</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Coverage</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            The catalog covers all 50 states and Washington DC{states.length > 0 ? `, ${states.length} jurisdictions in total` : ''}. Every entry lists what
            to file, where it goes, and when it is due, with statute citations where they help.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVEL_ORDER.map((level) => (
              <div key={level} className="rounded-2xl border border-slate-200 bg-white p-5">
                {states.length > 0 ? (
                  <p className="text-2xl font-bold text-emerald-700">
                    {levelCounts[level]} <span className="text-sm font-normal text-slate-500">jurisdictions</span>
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-slate-900">{LEVEL_COPY[level].label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{LEVEL_COPY[level].detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Simple pricing</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              A single purchase, not a membership. Browse your state’s requirements free, then unlock the full pack when you are ready to file.
            </p>
            {plans.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {plans.map((plan) => {
                  const highlighted = plan.key === 'complete';
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl border bg-white p-6 shadow-sm ${highlighted ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'}`}
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                      <p className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">
                          {plan.price_cents === 0 ? 'Free' : formatPrice(plan.price_cents, plan.currency)}
                        </span>
                        {plan.price_cents > 0 && plan.plan_interval === 'one_time' ? (
                          <span className="text-sm text-slate-500">one-time purchase</span>
                        ) : null}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <CheckIcon />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-8 text-sm text-slate-600">
                Current prices live on the{' '}
                <Link href="/pricing" className="font-semibold text-emerald-700 underline hover:text-emerald-800">
                  pricing page
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">What this is, and what it is not</h2>
          <ul className="mt-6 max-w-3xl space-y-4 text-sm leading-6 text-slate-600 sm:text-base">
            <li className="flex gap-3">
              <CheckIcon />
              <span>It is a compliance organizer built on published state statutes and education department guidance.</span>
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              <span>It is not legal advice, legal defense, or a membership. If your situation needs representation, talk to an attorney.</span>
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              <span>
                Requirements change. Catalog updates are included with the pack, and you should confirm details with your district or state agency before
                filing.
              </span>
            </li>
          </ul>
          <p className="mt-8 max-w-3xl text-sm leading-6 text-slate-500">
            HomeschoolCompliance Pack is built and operated at ZeroOrigine, an autonomous software studio. It is deliberately small software: one job, one
            price, done well.
          </p>
        </section>

        <section className="bg-emerald-700">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">Know your dates before the school year starts</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-100 sm:text-base">
              Browse your state’s rules free. The full pack is a single purchase.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Create your account
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-emerald-300 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} HomeschoolCompliance Pack</p>
            <nav aria-label="Footer" className="flex items-center gap-5 text-sm text-slate-500">
              <Link href="/pricing" className="hover:text-slate-900">
                Pricing
              </Link>
              <Link href="/about" className="hover:text-slate-900">
                About
              </Link>
              <Link href="/login" className="hover:text-slate-900">
                Sign in
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 sm:text-left">
            Born autonomously at{' '}
            <a href="https://zeroorigine.com" className="underline hover:text-slate-600">
              ZeroOrigine
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
