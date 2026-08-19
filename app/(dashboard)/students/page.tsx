'use client';
// CANONICAL: student management: grades drive which testing years land on the calendar.
import { useEffect, useRef, useState } from 'react';
import { GRADE_LEVELS } from '@/lib/db/constants';
import { apiGet, apiSend, type ListPayload, type StudentItem } from '@/lib/core/api-client';
import { formatDate, gradeLabel } from '@/lib/core/format';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600';

type Toast = { msg: string; kind: 'ok' | 'error' };

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [birth, setBirth] = useState('');
  const [grade, setGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StudentItem | null>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);
  const editDialogRef = useRef<HTMLDivElement | null>(null);
  const editFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const [eFirst, setEFirst] = useState('');
  const [eLast, setELast] = useState('');
  const [eBirth, setEBirth] = useState('');
  const [eGrade, setEGrade] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!editing) return;
    editFirstFieldRef.current?.focus();
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        setEditing(null);
        return;
      }
      if (ev.key !== 'Tab') return;
      const root = editDialogRef.current;
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
      editTriggerRef.current?.focus();
      editTriggerRef.current = null;
    };
  }, [editing]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    apiGet<ListPayload<StudentItem>>('/api/students?limit=100').then((res) => {
      if (alive && res.ok && res.data) setStudents(res.data.items);
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function add(ev: React.FormEvent) {
    ev.preventDefault();
    if (!first.trim()) {
      setToast({ msg: 'A first name is required.', kind: 'error' });
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = { first_name: first.trim() };
    if (last.trim()) payload.last_name = last.trim();
    if (birth) payload.birth_date = birth;
    if (grade) payload.grade_level = grade;
    const res = await apiSend<StudentItem>('/api/students', 'POST', payload);
    setBusy(false);
    if (!res.ok || !res.data) {
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    setStudents([...students, res.data]);
    setFirst('');
    setLast('');
    setBirth('');
    setGrade('');
    setToast({ msg: `${res.data.first_name} is on the roster.`, kind: 'ok' });
  }

  function startEdit(s: StudentItem, trigger?: HTMLElement | null) {
    editTriggerRef.current = trigger ?? null;
    setEditing(s);
    setEFirst(s.first_name);
    setELast(s.last_name ?? '');
    setEBirth(s.birth_date ?? '');
    setEGrade(s.grade_level ?? '');
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await apiSend<StudentItem>(`/api/students/${editing.id}`, 'PATCH', {
      first_name: eFirst.trim() || editing.first_name,
      last_name: eLast.trim() || null,
      birth_date: eBirth || null,
      grade_level: eGrade || null,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setToast({ msg: res.error ?? 'That did not save. Please try again.', kind: 'error' });
      return;
    }
    const updated = res.data;
    setStudents(students.map((s) => (s.id === updated.id ? updated : s)));
    setEditing(null);
    setToast({ msg: 'Saved.', kind: 'ok' });
  }

  async function del(s: StudentItem) {
    if (confirmId !== s.id) {
      setConfirmId(s.id);
      return;
    }
    setConfirmId(null);
    const prev = students;
    setStudents(prev.filter((x) => x.id !== s.id));
    const res = await apiSend<{ deleted: boolean }>(`/api/students/${s.id}`, 'DELETE');
    if (!res.ok) {
      setStudents(prev);
      setToast({ msg: res.error ?? 'That did not delete. Please try again.', kind: 'error' });
    } else {
      setToast({ msg: 'Student removed. Calendar dates stay and lose the student tag.', kind: 'ok' });
    }
  }

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">Loading…</p>
        <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Students</h1>
        <p className="mt-1 text-sm text-slate-600">Grades decide which testing and portfolio years apply, and names pre-fill your notice of intent.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Add a student</h2>
        <form onSubmit={add} className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <label htmlFor="st-first" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              First name
            </label>
            <input id="st-first" value={first} onChange={(e) => setFirst(e.target.value)} required maxLength={80} className={inputCls} />
          </div>
          <div>
            <label htmlFor="st-last" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last name (optional)
            </label>
            <input id="st-last" value={last} onChange={(e) => setLast(e.target.value)} maxLength={80} className={inputCls} />
          </div>
          <div>
            <label htmlFor="st-birth" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Birth date (optional)
            </label>
            <input id="st-birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="st-grade" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Grade (optional)
            </label>
            <select id="st-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls}>
              <option value="">Pick a grade</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {gradeLabel(g)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving' : 'Add student'}
          </button>
        </form>
      </section>

      <section aria-label="Your students" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-900">Your roster</h2>
        {students.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">No students yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Add your first student above. Their grade tells us which testing years your state applies to them.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {students.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800" aria-hidden="true">
                    {s.first_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{[s.first_name, s.last_name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-slate-500">
                      {s.grade_level ? gradeLabel(s.grade_level) : 'No grade listed'}
                      {s.birth_date ? ` \u00b7 born ${formatDate(s.birth_date)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={(e) => startEdit(s, e.currentTarget)} className={btnGhost}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del(s)}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600 ${
                      confirmId === s.id ? 'bg-rose-600 text-white hover:bg-rose-700' : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    {confirmId === s.id ? 'Confirm delete' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="absolute inset-0 bg-slate-900/50" />
          <div ref={editDialogRef} role="dialog" aria-modal="true" aria-label="Edit student" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Edit student</h2>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="ed-first" className="mb-1 block text-sm font-medium text-slate-700">
                  First name
                </label>
                <input ref={editFirstFieldRef} id="ed-first" value={eFirst} onChange={(e) => setEFirst(e.target.value)} required maxLength={80} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ed-last" className="mb-1 block text-sm font-medium text-slate-700">
                  Last name
                </label>
                <input id="ed-last" value={eLast} onChange={(e) => setELast(e.target.value)} maxLength={80} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ed-birth" className="mb-1 block text-sm font-medium text-slate-700">
                  Birth date
                </label>
                <input id="ed-birth" type="date" value={eBirth} onChange={(e) => setEBirth(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ed-grade" className="mb-1 block text-sm font-medium text-slate-700">
                  Grade
                </label>
                <select id="ed-grade" value={eGrade} onChange={(e) => setEGrade(e.target.value)} className={inputCls}>
                  <option value="">No grade listed</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {gradeLabel(g)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? 'Saving' : 'Save changes'}
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
