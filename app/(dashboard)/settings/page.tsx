'use client';
// CANONICAL: account settings: the details that pre-fill notices and anchor the calendar.
import { useEffect, useState } from 'react';
import { apiGet, apiSend, type ListPayload, type ProfileData, type StateItem } from '@/lib/core/api-client';
import { MONTH_LONG } from '@/lib/core/format';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-500';
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';

type Toast = { msg: string; kind: 'ok' | 'error' };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [stateSel, setStateSel] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [startMonth, setStartMonth] = useState(8);
  const [states, setStates] = useState<StateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, s] = await Promise.all([apiGet<ProfileData>('/api/profile'), apiGet<ListPayload<StateItem>>('/api/states?limit=60')]);
      if (!alive) return;
      if (p.ok && p.data) {
        setEmail(p.data.email ?? '');
        setFullName(p.data.full_name ?? '');
        setStateSel(p.data.state_code ?? '');
        setDistrict(p.data.school_district ?? '');
        setAddress(p.data.mailing_address ?? '');
        setStartMonth(p.data.school_year_start_month);
      }
      if (s.ok && s.data) setStates(s.data.items);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setFieldErrors({});
    const payload: Record<string, unknown> = {
      full_name: fullName.trim(),
      school_year_start_month: startMonth,
      mailing_address: address.trim() || null,
      school_district: district.trim() || null,
    };
    if (stateSel) payload.state_code = stateSel;
    const res = await apiSend<ProfileData>('/api/profile', 'PATCH', payload);
    setSaving(false);
    if (!res.ok) {
      if (res.fields) setFieldErrors(res.fields);
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    setToast({ msg: 'Saved. Your calendar and documents will use these details.', kind: 'ok' });
  }

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">Loading…</p>
        <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">These details pre-fill your notice of intent and anchor your school year calendar.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div>
            <label htmlFor="set-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input id="set-email" value={email} disabled className={inputCls} />
          </div>
          <div>
            <label htmlFor="set-name" className="mb-1 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input id="set-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} className={inputCls} />
            {fieldErrors.full_name && <p className="mt-1 text-xs text-rose-600">{fieldErrors.full_name}</p>}
          </div>
          <div>
            <label htmlFor="set-state" className="mb-1 block text-sm font-medium text-slate-700">
              Your state
            </label>
            <select id="set-state" value={stateSel} onChange={(e) => setStateSel(e.target.value)} className={inputCls}>
              <option value="">Choose a state</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.state_code && <p className="mt-1 text-xs text-rose-600">{fieldErrors.state_code}</p>}
          </div>
          <div>
            <label htmlFor="set-district" className="mb-1 block text-sm font-medium text-slate-700">
              School district (optional)
            </label>
            <input id="set-district" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={200} className={inputCls} />
            {fieldErrors.school_district && <p className="mt-1 text-xs text-rose-600">{fieldErrors.school_district}</p>}
          </div>
          <div>
            <label htmlFor="set-address" className="mb-1 block text-sm font-medium text-slate-700">
              Mailing address (optional)
            </label>
            <textarea id="set-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={500} className={inputCls} />
            {fieldErrors.mailing_address && <p className="mt-1 text-xs text-rose-600">{fieldErrors.mailing_address}</p>}
          </div>
          <div>
            <label htmlFor="set-month" className="mb-1 block text-sm font-medium text-slate-700">
              School year starts in
            </label>
            <select id="set-month" value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} className={inputCls}>
              {MONTH_LONG.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            {fieldErrors.school_year_start_month && <p className="mt-1 text-xs text-rose-600">{fieldErrors.school_year_start_month}</p>}
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving' : 'Save settings'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Why we ask</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Your state picks the forms, dates, and testing rules we load.</li>
              <li>Your name, address, and district pre-fill the notice of intent.</li>
              <li>The start month anchors where each school year begins on your calendar.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Reminders</h2>
            <p className="mt-2 text-sm text-slate-600">Each deadline enters its reminder window two weeks before the due date and surfaces on your dashboard until you mark it done.</p>
          </div>
        </aside>
      </div>

      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-rose-600' : 'bg-emerald-700'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
