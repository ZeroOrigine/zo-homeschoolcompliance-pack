'use client';
// CANONICAL: documents list plus one-click pre-filled notice creation.
// PATCHED: JSX text nodes do not process unicode escapes; middots are now real characters in expressions.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiSend, type DocumentItem, type EntitlementData, type ListPayload, type ProfileData } from '@/lib/core/api-client';
import { DOC_TYPE_LABELS, currentSchoolYear, formatDate, schoolYearChoices } from '@/lib/core/format';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [paid, setPaid] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [docType, setDocType] = useState<'notice_of_intent' | 'withdrawal_letter'>('notice_of_intent');
  const [year, setYear] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => schoolYearChoices(profile?.school_year_start_month ?? 8), [profile]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, e, p] = await Promise.all([
        apiGet<ListPayload<DocumentItem>>('/api/documents?limit=50'),
        apiGet<EntitlementData>('/api/entitlement'),
        apiGet<ProfileData>('/api/profile'),
      ]);
      if (!alive) return;
      if (d.ok && d.data) setDocs(d.data.items);
      if (e.ok && e.data) setPaid(e.data.paid);
      if (p.ok && p.data) {
        setProfile(p.data);
        setYear(currentSchoolYear(p.data.school_year_start_month));
      } else {
        setYear(currentSchoolYear(8));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function create() {
    setCreating(true);
    setError(null);
    const res = await apiSend<DocumentItem>('/api/documents', 'POST', { doc_type: docType, school_year: year });
    setCreating(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'That did not work. Please try again.');
      return;
    }
    router.push(`/documents/${res.data.id}`);
  }

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">Loading…</p>
        <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Documents</h1>
        <p className="mt-1 text-sm text-slate-600">Pre-filled drafts built from your profile and students, using the exact wording your state office expects to see.</p>
      </header>

      {paid ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Create a new document</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3 sm:items-end">
            <div>
              <label htmlFor="doc-type" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Document
              </label>
              <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value as 'notice_of_intent' | 'withdrawal_letter')} className={inputCls}>
                <option value="notice_of_intent">Notice of intent</option>
                <option value="withdrawal_letter">Withdrawal letter</option>
              </select>
            </div>
            <div>
              <label htmlFor="doc-year" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                School year
              </label>
              <select id="doc-year" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={create} disabled={creating} className={btnPrimary}>
              {creating ? 'Building your draft' : 'Create pre-filled draft'}
            </button>
          </div>
          {!profile?.state_code && <p className="mt-3 text-sm text-amber-700">Pick your state in Settings first so we pre-fill the right office and statute.</p>}
          {error && (
            <p className="mt-3 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-emerald-900">Pre-filled notices unlock with the pack</h2>
              <p className="mt-1 text-sm text-emerald-900/80">Your notice of intent arrives already addressed to the right office, with your students and statute filled in.</p>
            </div>
            <Link href="/billing" className={btnPrimary}>
              Unlock the Compliance Pack
            </Link>
          </div>
        </section>
      )}

      <section aria-label="Your documents" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-900">Your documents</h2>
        {docs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">No documents yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Your first draft takes one click above, then you can fine-tune every line before sending.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link href={`/documents/${doc.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                      {' \u00b7 '}
                      <span className="font-data">{doc.state_code}</span>
                      {' \u00b7 '}
                      {doc.school_year}
                      {' \u00b7 updated '}
                      {formatDate(doc.updated_at.slice(0, 10))}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      doc.status === 'finalized' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {doc.status === 'finalized' ? 'Finalized' : 'Draft'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
