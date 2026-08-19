'use client';
// CANONICAL: the core collapsing interaction: pick state and year, get every required date as a tracked calendar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { zoEvent } from '@/components/ZoBeacon';
import {
  apiGet,
  apiSend,
  type DeadlineItem,
  type EntitlementData,
  type GeneratePayload,
  type ListPayload,
  type ProfileData,
  type RequirementItem,
  type StateItem,
  type StudentItem,
} from '@/lib/core/api-client';
import {
  currentSchoolYear,
  dayOfMonth,
  daysUntil,
  dueLabel,
  formatDate,
  monthKey,
  monthShort,
  schoolYearChoices,
  REGULATION_META,
  REQUIREMENT_TYPE_LABELS,
} from '@/lib/core/format';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

type Toast = { msg: string; kind: 'ok' | 'error' };
type StatusFilter = 'all' | 'upcoming' | 'completed' | 'dismissed';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600';

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [paid, setPaid] = useState(false);
  const [states, setStates] = useState<StateItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [stateCode, setStateCode] = useState('');
  const [stateInfo, setStateInfo] = useState<StateItem | null>(null);
  const [reqs, setReqs] = useState<RequirementItem[]>([]);
  const [year, setYear] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addStudent, setAddStudent] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const addDialogRef = useRef<HTMLDivElement | null>(null);
  const addFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const addTriggerRef = useRef<HTMLElement | null>(null);

  const startMonth = profile?.school_year_start_month ?? 8;
  const yearOptions = useMemo(() => schoolYearChoices(startMonth), [startMonth]);

  const notify = useCallback((msg: string, kind: Toast['kind'] = 'ok') => setToast({ msg, kind }), []);

  useEffect(() => {
    if (!showAdd) return;
    addFirstFieldRef.current?.focus();
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        setShowAdd(false);
        return;
      }
      if (ev.key !== 'Tab') return;
      const root = addDialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // QA-040: return focus to the button that opened the dialog on any close path
      // (Escape, backdrop, Cancel, successful submit) instead of dropping to <body>.
      addTriggerRef.current?.focus();
      addTriggerRef.current = null;
    };
  }, [showAdd]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDeadlines = useCallback(async (schoolYear: string) => {
    const res = await apiGet<ListPayload<DeadlineItem>>(`/api/deadlines?school_year=${schoolYear}&limit=100`);
    if (res.ok && res.data) setDeadlines(res.data.items);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, e, s, st] = await Promise.all([
        apiGet<ProfileData>('/api/profile'),
        apiGet<EntitlementData>('/api/entitlement'),
        apiGet<ListPayload<StateItem>>('/api/states?limit=60'),
        apiGet<ListPayload<StudentItem>>('/api/students?limit=100'),
      ]);
      if (!alive) return;
      let y = currentSchoolYear(8);
      if (p.ok && p.data) {
        setProfile(p.data);
        if (p.data.state_code) setStateCode(p.data.state_code);
        y = currentSchoolYear(p.data.school_year_start_month);
      }
      setYear(y);
      if (e.ok && e.data) setPaid(e.data.paid);
      if (s.ok && s.data) setStates(s.data.items);
      if (st.ok && st.data) setStudents(st.data.items);
      await loadDeadlines(y);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadDeadlines]);

  useEffect(() => {
    if (!stateCode) {
      setStateInfo(null);
      setReqs([]);
      return;
    }
    let alive = true;
    apiGet<{ state: StateItem; requirements: RequirementItem[] }>(`/api/states/${stateCode}`).then((res) => {
      if (alive && res.ok && res.data) {
        setStateInfo(res.data.state);
        setReqs(res.data.requirements);
      }
    });
    return () => {
      alive = false;
    };
  }, [stateCode]);

  async function changeYear(y: string) {
    setYear(y);
    await loadDeadlines(y);
  }

  async function generate() {
    if (!stateCode) {
      notify('Pick your state first.', 'error');
      return;
    }
    setGenerating(true);
    const hadNone = deadlines.length === 0;
    const res = await apiSend<GeneratePayload>('/api/deadlines/generate', 'POST', { school_year: year, state_code: stateCode });
    setGenerating(false);
    if (!res.ok) {
      notify(res.error ?? 'That did not work. Please try again.', 'error');
      return;
    }
    await loadDeadlines(year);
    const n = res.data?.created_count ?? 0;
    notify(
      n > 0
        ? `Your ${stateInfo?.name ?? stateCode} calendar is ready: ${n} ${n === 1 ? 'date' : 'dates'} for ${year}.`
        : 'Your calendar is already up to date for this year.',
    );
    if (hadNone && n > 0) zoEvent('activation');
  }

  async function setStatus(d: DeadlineItem, status: 'upcoming' | 'completed' | 'dismissed') {
    const prev = deadlines;
    setDeadlines(prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
    const res = await apiSend<DeadlineItem>(`/api/deadlines/${d.id}`, 'PATCH', { status });
    if (!res.ok) {
      setDeadlines(prev);
      notify(res.error ?? 'That did not save. Please try again.', 'error');
    } else if (status === 'completed') {
      notify(`Nice work, ${d.title} is done.`);
    }
  }

  async function remove(d: DeadlineItem) {
    const prev = deadlines;
    setDeadlines(prev.filter((x) => x.id !== d.id));
    const res = await apiSend<{ deleted: boolean }>(`/api/deadlines/${d.id}`, 'DELETE');
    if (!res.ok) {
      setDeadlines(prev);
      notify(res.error ?? 'That did not delete. Please try again.', 'error');
    }
  }

  async function addCustom(ev: React.FormEvent) {
    ev.preventDefault();
    if (!addTitle.trim() || !addDate) {
      notify('A title and a due date are required.', 'error');
      return;
    }
    setAddBusy(true);
    const payload: Record<string, unknown> = { title: addTitle.trim(), due_date: addDate, school_year: year };
    if (addStudent) payload.student_id = addStudent;
    if (addNotes.trim()) payload.notes = addNotes.trim();
    const res = await apiSend<DeadlineItem>('/api/deadlines', 'POST', payload);
    setAddBusy(false);
    if (!res.ok) {
      notify(res.error ?? 'That did not save. Please try again.', 'error');
      return;
    }
    setShowAdd(false);
    setAddTitle('');
    setAddDate('');
    setAddStudent('');
    setAddNotes('');
    await loadDeadlines(year);
    notify('Added to your calendar.');
  }

  const studentName = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const s = students.find((x) => x.id === id);
      return s ? [s.first_name, s.last_name].filter(Boolean).join(' ') : null;
    },
    [students],
  );

  const visible = useMemo(() => (filter === 'all' ? deadlines : deadlines.filter((d) => d.status === filter)), [deadlines, filter]);
  const groups = useMemo(() => {
    const m = new Map<string, DeadlineItem[]>();
    for (const d of visible) {
      const k = monthKey(d.due_date);
      const arr = m.get(k) ?? [];
      arr.push(d);
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [visible]);

  const reg = stateInfo ? REGULATION_META[stateInfo.regulation_level] : null;

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">Loading…</p>
        <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Compliance calendar</h1>
        <p className="mt-1 text-sm text-slate-600">Pick your state and school year, and every required filing and testing date lands on one tracked calendar.</p>
      </header>

      {!paid && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-emerald-900">Free preview</h2>
              <p className="mt-1 text-sm text-emerald-900/80">
                Browse any state below. The one time Compliance Pack turns these rules into your personal calendar with reminder windows and a pre-filled notice.
              </p>
            </div>
            <Link href="/billing" className={btnPrimary}>
              Unlock the Compliance Pack
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <label htmlFor="cal-state" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              State
            </label>
            <select id="cal-state" value={stateCode} onChange={(e) => setStateCode(e.target.value)} className={inputCls}>
              <option value="">Choose a state</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cal-year" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              School year
            </label>
            <select id="cal-year" value={year} onChange={(e) => changeYear(e.target.value)} className={inputCls}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {paid ? (
            <button type="button" onClick={generate} disabled={generating || !stateCode} className={btnPrimary}>
              {generating ? 'Building your calendar' : 'Build my calendar'}
            </button>
          ) : (
            <Link href="/billing" className={btnPrimary}>
              Unlock to build
            </Link>
          )}
          {paid && (
            <button
              type="button"
              onClick={(e) => {
                addTriggerRef.current = e.currentTarget;
                setShowAdd(true);
              }}
              className={btnGhost}
            >
              Add my own deadline
            </button>
          )}
        </div>
        {stateInfo && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {reg && <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${reg.badge}`}>{reg.label}</span>}
            <p className="text-sm text-slate-600">{stateInfo.summary}</p>
          </div>
        )}
      </section>

      {paid && (
        <section aria-label="Your calendar" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              Your {year} calendar
              <span className="ml-2 font-data text-xs font-semibold text-slate-500">{deadlines.length} dates</span>
            </h2>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {(['all', 'upcoming', 'completed', 'dismissed'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    filter === f ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-900">{deadlines.length === 0 ? 'Nothing here yet' : 'No dates match this filter'}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                {deadlines.length === 0
                  ? 'Choose your state above and build the calendar. Every filing, testing, and reporting date lands here, sorted by month.'
                  : 'Switch the filter to see the rest of your calendar.'}
              </p>
            </div>
          ) : (
            groups.map(([month, items]) => (
              <div key={month}>
                <h3 className="bg-slate-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{month}</h3>
                <ul className="divide-y divide-slate-100">
                  {items.map((d) => {
                    const n = daysUntil(d.due_date);
                    const done = d.status !== 'upcoming';
                    const chip =
                      d.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                        : d.status === 'dismissed'
                          ? 'bg-slate-100 text-slate-600 ring-slate-200'
                          : n < 0
                            ? 'bg-rose-50 text-rose-700 ring-rose-200'
                            : n <= 14
                              ? 'bg-amber-50 text-amber-800 ring-amber-200'
                              : 'bg-slate-100 text-slate-600 ring-slate-200';
                    const who = studentName(d.student_id);
                    return (
                      <li key={d.id} className="flex items-start gap-4 px-5 py-4">
                        <div className="w-14 shrink-0 rounded-lg border border-slate-200 bg-white py-1.5 text-center">
                          <div className="font-data text-lg font-bold text-slate-900">{dayOfMonth(d.due_date)}</div>
                          <div className="text-[11px] font-semibold uppercase text-slate-500">{monthShort(d.due_date)}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{d.title}</p>
                            <span className={`inline-flex rounded-full px-2 py-0.5 font-data text-[11px] font-semibold ring-1 ring-inset ${chip}`}>
                              {d.status === 'completed' ? 'Completed' : d.status === 'dismissed' ? 'Dismissed' : dueLabel(d.due_date)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDate(d.due_date)}
                            {who ? ` \u00b7 ${who}` : ''}
                            {d.notes ? ` \u00b7 ${d.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {d.status === 'upcoming' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setStatus(d, 'completed')}
                                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatus(d, 'dismissed')}
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                          {d.status !== 'upcoming' && (
                            <button
                              type="button"
                              onClick={() => setStatus(d, 'upcoming')}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                            >
                              Restore
                            </button>
                          )}
                          {d.requirement_id === null && (
                            <button
                              type="button"
                              onClick={() => remove(d)}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {stateInfo && reqs.length > 0 && (
        <section aria-label="State requirements" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">What {stateInfo.name} expects</h2>
          <ul className="mt-4 space-y-4">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                  {REQUIREMENT_TYPE_LABELS[r.requirement_type] ?? 'Requirement'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{r.description}</p>
                  {r.due_rule && <p className="mt-0.5 font-data text-xs text-slate-500">{r.due_rule}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/50" />
          <div ref={addDialogRef} role="dialog" aria-modal="true" aria-label="Add a deadline" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add a deadline</h2>
            <form onSubmit={addCustom} className="mt-4 space-y-4">
              <div>
                <label htmlFor="add-title" className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input ref={addFirstFieldRef} id="add-title" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} required maxLength={200} className={inputCls} placeholder="Co-op portfolio night" />
              </div>
              <div>
                <label htmlFor="add-date" className="mb-1 block text-sm font-medium text-slate-700">
                  Due date
                </label>
                <input id="add-date" type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label htmlFor="add-student" className="mb-1 block text-sm font-medium text-slate-700">
                  Student (optional)
                </label>
                <select id="add-student" value={addStudent} onChange={(e) => setAddStudent(e.target.value)} className={inputCls}>
                  <option value="">All students</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {[s.first_name, s.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-notes" className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea id="add-notes" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={2} maxLength={2000} className={inputCls} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={addBusy} className={btnPrimary}>
                  {addBusy ? 'Saving' : 'Add deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-rose-600' : 'bg-emerald-700'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
