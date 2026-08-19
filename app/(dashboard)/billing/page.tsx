// CANONICAL: billing page for the one time Compliance Pack purchase. One-time product, so no billing portal is rendered.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPlans, type PlanRow } from '@/lib/db/catalog';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import { formatMoney } from '@/lib/core/format';
import CheckoutButton from '@/components/checkout-button';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ searchParams }: { searchParams?: { checkout?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  let plans: PlanRow[] = [];
  let paid = false;
  try {
    plans = await listPlans();
  } catch {}
  try {
    paid = await hasCompleteAccess(data.user.id);
  } catch {}


  const complete = plans.find((p) => p.key === 'complete');
  const free = plans.find((p) => p.key === 'free');
  const checkout = searchParams?.checkout;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">One flat purchase, no subscription, no membership. It covers every student in your household.</p>
      </header>

      {checkout === 'success' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900" role="status">
          Payment received. Your Compliance Pack unlocks as soon as the payment settles, usually within a minute. Refresh this page if you do not see it yet.
        </div>
      )}
      {(checkout === 'canceled' || checkout === 'cancelled') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700" role="status">
          Checkout was canceled and nothing was charged. You can pick up right where you left off whenever you are ready.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {free && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{free.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{free.description}</p>
            <p className="mt-4 font-data text-3xl font-bold text-slate-900">{formatMoney(free.price_cents, free.currency)}</p>
            <ul className="mt-4 space-y-2">
              {free.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-emerald-700" aria-hidden="true">
                    {'\u2713'}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">Included with your account</p>
          </section>
        )}

        {complete ? (
          <section className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{complete.name}</h2>
              <span className="inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">One time purchase</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{complete.description}</p>
            <p className="mt-4 font-data text-3xl font-bold text-slate-900">
              {formatMoney(complete.price_cents, complete.currency)}
              <span className="ml-1 text-sm font-medium text-slate-500">once</span>
            </p>
            <ul className="mt-4 space-y-2">
              {complete.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-emerald-700" aria-hidden="true">
                    {'\u2713'}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {paid ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-inset ring-emerald-200">
                  <p className="text-sm font-bold text-emerald-900">You own the Compliance Pack</p>
                  <Link href="/calendar" className="mt-1 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                    Go build your calendar
                  </Link>
                </div>
              ) : (
                <CheckoutButton planKey="complete" label={`Get the Compliance Pack for ${formatMoney(complete.price_cents, complete.currency)}`} />
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pricing is loading slowly</h2>
            <p className="mt-1 text-sm text-slate-600">Refresh this page in a moment to see the plans.</p>
          </section>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Good to know</h2>
        <ul className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <li>One purchase covers unlimited students in your household.</li>
          <li>Your access does not expire and there is nothing to cancel.</li>
          <li>Updates to your state requirement data are included.</li>
        </ul>
      </section>
    </div>
  );
}
