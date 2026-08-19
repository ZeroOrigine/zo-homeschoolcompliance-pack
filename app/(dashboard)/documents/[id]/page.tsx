'use client';
// CANONICAL: document detail: edit the pre-filled fields, regenerate or hand-edit the letter, finalize, copy, print.
// PATCHED: JSX text nodes do not process unicode escapes; middots are now real characters in expressions.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GRADE_LEVELS } from '@/lib/db/constants';
import { apiGet, apiSend, type DocumentItem, type NoticeStudentData } from '@/lib/core/api-client';
import { DOC_TYPE_LABELS, gradeLabel } from '@/lib/core/format';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-500';
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-60';

type Toast = { msg: string; kind: 'ok' | 'error' };

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [parentName, setParentName] = useState('');
  const [mailing, setMailing] = useState('');
  const [district, setDistrict] = useState('');
  const [rows, setRows] = useState<NoticeStudentData[]>([]);
  const [editBody, setEditBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    apiGet<DocumentItem>(`/api/documents/${params.id}`).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) {
        applyDoc(res.data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [params.id]);

  function applyDoc(d: DocumentItem) {
    setDoc(d);
    setTitle(d.title);
    const f = d.fields ?? {};
    setParentName(f.parent_name ?? '');
    setMailing(f.mailing_address ?? '');
    setDistrict(f.school_district ?? '');
    setRows(Array.isArray(f.students) ? f.students : []);
    setBodyDraft(d.body ?? '');
  }

  const finalized = doc?.status === 'finalized';

  async function saveDetails() {
    if (!doc) return;
    setSaving(true);
    const students = rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({ name: r.name.trim(), birth_date: r.birth_date || null, grade_level: r.grade_level || null }));
    const res = await apiSend<DocumentItem>(`/api/documents/${doc.id}`, 'PATCH', {
      title: title.trim() || doc.title,
      fields: { parent_name: parentName, mailing_address: mailing, school_district: district, students },
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    applyDoc(res.data);
    setEditBody(false);
    setToast({ msg: 'Saved. The letter text was rebuilt with your details.', kind: 'ok' });
  }

  async function saveBody() {
    if (!doc) return;
    setSaving(true);
    const res = await apiSend<DocumentItem>(`/api/documents/${doc.id}`, 'PATCH', { body: bodyDraft });
    setSaving(false);
    if (!res.ok || !res.data) {
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    applyDoc(res.data);
    setEditBody(false);
    setToast({ msg: 'Letter text saved.', kind: 'ok' });
  }

  async function setStatus(status: 'draft' | 'finalized') {
    if (!doc) return;
    setSaving(true);
    const res = await apiSend<DocumentItem>(`/api/documents/${doc.id}`, 'PATCH', { status });
    setSaving(false);
    if (!res.ok || !res.data) {
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    applyDoc(res.data);
    setToast({ msg: status === 'finalized' ? 'Finalized. Print it or copy it, then send it in.' : 'Reopened as a draft.', kind: 'ok' });
  }

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(doc?.body ?? '');
      setToast({ msg: 'Copied to your clipboard.', kind: 'ok' });
    } catch {
      setToast({ msg: 'Copy did not work in this browser. Select the text and copy it directly.', kind: 'error' });
    }
  }

  function updateRow(i: number, patch: Partial<NoticeStudentData>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">Loading…</p>
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" aria-hidden="true" />
      </>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">We could not find that document</h1>
        <p className="mt-2 text-sm text-slate-600">It may have been deleted, or the link is off by a character.</p>
        <Link href="/documents" className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/documents" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            &larr; All documents
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{doc.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {DOC_TYPE_LABELS[doc.doc_type]}
            {' \u00b7 '}
            <span className="font-data">{doc.state_code}</span>
            {' \u00b7 '}
            {doc.school_year}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            finalized ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
          }`}
        >
          {finalized ? 'Finalized' : 'Draft'}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-label="Details" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Details</h2>
          <div>
            <label htmlFor="doc-title" className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={finalized} maxLength={200} className={inputCls} />
          </div>
          <div>
            <label htmlFor="doc-parent" className="mb-1 block text-sm font-medium text-slate-700">
              Parent name
            </label>
            <input id="doc-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} disabled={finalized} maxLength={160} className={inputCls} />
          </div>
          <div>
            <label htmlFor="doc-mailing" className="mb-1 block text-sm font-medium text-slate-700">
              Mailing address
            </label>
            <textarea id="doc-mailing" value={mailing} onChange={(e) => setMailing(e.target.value)} disabled={finalized} rows={2} maxLength={500} className={inputCls} />
          </div>
          <div>
            <label htmlFor="doc-district" className="mb-1 block text-sm font-medium text-slate-700">
              School district
            </label>
            <input id="doc-district" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={finalized} maxLength={200} className={inputCls} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Students on this document</p>
            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input aria-label={`Student ${i + 1} name`} value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} disabled={finalized} maxLength={160} placeholder="Full name" className={inputCls} />
                    <input aria-label={`Student ${i + 1} birth date`} type="date" value={r.birth_date ?? ''} onChange={(e) => updateRow(i, { birth_date: e.target.value || null })} disabled={finalized} className={inputCls} />
                    <select aria-label={`Student ${i + 1} grade`} value={r.grade_level ?? ''} onChange={(e) => updateRow(i, { grade_level: e.target.value || null })} disabled={finalized} className={inputCls}>
                      <option value="">No grade listed</option>
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {gradeLabel(g)}
                        </option>
                      ))}
                    </select>
                    {!finalized && (
                      <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-left text-xs font-semibold text-rose-600 hover:text-rose-700 sm:self-center">
                        Remove student
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!finalized && (
              <button type="button" onClick={() => setRows([...rows, { name: '', birth_date: null, grade_level: null }])} className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                + Add a student line
              </button>
            )}
          </div>
          {!finalized && (
            <button type="button" onClick={saveDetails} disabled={saving} className={btnPrimary}>
              {saving ? 'Saving' : 'Save and rebuild letter'}
            </button>
          )}
        </section>

        <section aria-label="Letter" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">The letter</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyBody} className={btnGhost}>
                Copy
              </button>
              <button type="button" onClick={() => window.print()} className={btnGhost}>
                Print
              </button>
              {!finalized && (
                <button type="button" onClick={() => setEditBody(!editBody)} className={btnGhost}>
                  {editBody ? 'Cancel text edit' : 'Edit text directly'}
                </button>
              )}
              {finalized ? (
                <button type="button" onClick={() => setStatus('draft')} disabled={saving} className={btnGhost}>
                  Reopen draft
                </button>
              ) : (
                <button type="button" onClick={() => setStatus('finalized')} disabled={saving} className={btnPrimary}>
                  Finalize
                </button>
              )}
            </div>
          </div>
          {editBody && !finalized ? (
            <div className="mt-4">
              <label htmlFor="doc-body" className="sr-only">
                Letter text
              </label>
              <textarea id="doc-body" value={bodyDraft} onChange={(e) => setBodyDraft(e.target.value)} rows={18} maxLength={20000} className={`${inputCls} font-body leading-relaxed`} />
              <button type="button" onClick={saveBody} disabled={saving} className={`${btnPrimary} mt-3`}>
                {saving ? 'Saving' : 'Save letter text'}
              </button>
            </div>
          ) : (
            <div className="print-area mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-800">{doc.body ?? ''}</div>
          )}
          <p className="mt-3 text-xs text-slate-500">Check the wording against your state office before sending. This tool prepares paperwork, it does not give legal advice.</p>
        </section>
      </div>

      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-rose-600' : 'bg-emerald-700'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
