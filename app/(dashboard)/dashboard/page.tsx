// CANONICAL: main dashboard: next deadline, reminder window, state rules, setup checklist, quick actions.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileForRender, type ProfileRow } from '@/lib/db/profiles';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import { getStateByCode, listStateRequirements, type StateRequirementRow, type StateRow } from '@/lib/db/catalog';
import { listDeadlines, type DeadlineRow } from '@/lib/db/deadlines';
import { listStudents } from '@/lib/db/students';
import { listDocuments } from '@/lib/db/documents';
import { currentSchoolYear, daysUntil, dueLabel, formatDate, REGULATION_META } from '@/lib/core/format';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const user = data.user;

  // QA-050: getProfileForRender and hasCompleteAccess are BOTH cache()-memoized
  // on scalar keys, so these calls dedupe against the layout's fetches on the
  // same request instead of issuing a second profile/entitlement round trip.
  const profile = await getProfileForRender(user.id, user.email ?? null);
  const paid = await safe(hasCompleteAccess(user.id), false);
  // QA-008 contract update: hasCompleteAccess now resolves to a boolean value directly
  // hasCompleteAccess is memoized per-request via cache(), so `paid` is consumed as-is below.
  const startMonth = profile?.school_year_start_month ?? 8;
  const year = currentSchoolYear(startMonth);

  const [dl, rem, st, docs] = await Promise.all([
    safe(listDeadlines(supabase, user.id, { schoolYear: year }, { from: 0, to: 199 }), { items: [] as DeadlineRow[], total: 0 }),
    safe(listDeadlines(supabase, user.id, { reminderDue: true }, { from: 0, to: 9 }), { items: [] as DeadlineRow[], total: 0 }),
    safe(listStudents(supabase, user.id, { from: 0, to: 0 }), { items: [], total: 0 }),
    safe(listDocuments(supabase, user.id, { from: 0, to: 0 }), { items: [], total: 0 }),
  ]);

  let state: StateRow | null = null;
  let requirements: StateRequirementRow[] = [];
  if (profile?.state_code) {
    state = await safe(getStateByCode(profile.state_code), null);
    requirements = await safe(listStateRequirements(profile.state_code), []);
  }

  const upcoming = dl.items.filter((d) => d.status === 'upcoming');
  const completedCount = dl.items.filter((d) => d.status === 'completed').length;
  const next = upcoming.find((d) => daysUntil(d.due_date) >= 0) ?? upcoming[0] ?? null;
  const firstName = (profile?.full_name ?? '').split(' ')[0];
  const reg = state ? REGULATION_META[state.regulation_level] : null;

  const steps = [
    { done: Boolean(profile?.state_code), label: 'Pick your state', href: '/settings' },
    { done: st.total > 0, label: 'Add your students', href: '/students' },
    { done: paid, label: 'Unlock the Compliance Pack', href: '/billing' },
    { done: dl.items.length > 0, label: 'Build your calendar and notice', href: '/calendar' },
  ];
  const setupIncomplete = steps.some((s) => !s.done);

  const nextDays = next ? daysUntil(next.due_date) : 0;
  const nextTone = next ? (nextDays < 0 ? 'text-rose-600' : nextDays <= 14 ? 'text-amber-600' : 'text-emerald-700') : 'text-emerald-700';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {state ? `Here is where your ${state.name} homeschool paperwork stands for ${year}.` : 'Pick your state and we will map every filing and testing date for you.'}
        </p>
      </header>

      {rem.items.length > 0 && (
        <section aria-label="Reminders" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-amber-900">
              {rem.items.length} {rem.items.length === 1 ? 'filing is' : 'filings are'} inside the two week window
            </h2>
            <Link href="/calendar" className="text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700">
              Open calendar
            </Link>
          </div>
          <ul className="mt-3 space-y-1.5">
            {rem.items.slice(0, 3).map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 text-sm text-amber-900">
                <span className="font-medium">{d.title}</span>
                <span className="text-amber-800">{formatDate(d.due_date)}</span>
                <span className="font-data text-xs font-semibold">{dueLabel(d.due_date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Next deadline" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next deadline</p>
          {next ? (
            <div className="mt-3">
              <p className={`font-data text-4xl font-bold sm:text-5xl ${nextTone}`}>{dueLabel(next.due_date)}</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{next.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                Due {formatDate(next.due_date)}
                {next.notes ? `. ${next.notes}` : ''}
              </p>
              <Link href="/calendar" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                See the full calendar <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : paid ? (
            <div className="mt-3">
              <p className="text-lg font-semibold text-slate-900">No dates on your {year} calendar yet</p>
              <p className="mt-1 text-sm text-slate-600">One click builds every required filing and testing date for your state.</p>
              <Link
                href="/calendar"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Build my calendar
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-lg font-semibold text-slate-900">Your personal calendar unlocks with the pack</p>
              <p className="mt-1 text-sm text-slate-600">One flat purchase turns your state rules into a year of dated, tracked deadlines with reminder windows.</p>
              <Link
                href="/billing"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Unlock the Compliance Pack
              </Link>
            </div>
          )}
        </section>

        <section aria-label="Your state" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your state</p>
          {state ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{state.name}</h2>
                {reg && <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${reg.badge}`}>{reg.label}</span>}
              </div>
              <p className="text-sm text-slate-600">{state.summary}</p>
              {state.files_with && (
                <p className="text-xs text-slate-500">
                  Files with: <span className="font-medium text-slate-700">{state.files_with}</span>
                </p>
              )}
              {state.statute_citation && <p className="font-data text-xs text-slate-500">{state.statute_citation}</p>}
              <Link href="/calendar" className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                {requirements.length} {requirements.length === 1 ? 'requirement' : 'requirements'} mapped <span aria-hidden="true">&nbsp;&rarr;</span>
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-slate-600">Every state plays by different rules. Pick yours and we load the exact filings, dates, and forms.</p>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Choose my state
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Upcoming dates', value: upcoming.length },
          { label: `Completed in ${year}`, value: completedCount },
          { label: 'Students', value: st.total },
          { label: 'Documents', value: docs.total },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-data text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {setupIncomplete && (
        <section aria-label="Setup checklist" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Finish setting up in four short steps</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50/40">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      s.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    {s.done ? '\u2713' : i + 1}
                  </span>
                  <span className={`text-sm font-medium ${s.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Quick actions" className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/calendar', title: 'Build the calendar', body: 'Every filing and testing date for your state, in one click.' },
          { href: '/documents', title: 'Create a notice of intent', body: 'A pre-filled draft using your details, ready to send.' },
          { href: '/students', title: 'Add a student', body: 'Grades decide which testing years apply.' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
            <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{a.body}</p>
          </Link>
        ))}
      </section>

      {state && requirements.length > 0 && (
        <section aria-label="State requirements" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">What {state.name} expects</h2>
          <ul className="mt-4 space-y-3">
            {requirements.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.title}</p>
                  {r.due_rule && <p className="text-xs text-slate-500">{r.due_rule}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
