// CANONICAL: client-safe date, money, and label helpers shared by dashboard pages.
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

export function monthKey(iso: string): string {
  const [y, m] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function monthShort(iso: string): string {
  return MONTH_SHORT[Number(iso.slice(5, 7)) - 1];
}

export function daysUntil(iso: string): number {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}

export function dueLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n < 0) return `Overdue by ${-n} ${n === -1 ? 'day' : 'days'}`;
  return `In ${n} days`;
}

export function currentSchoolYear(startMonth: number, today = new Date()): string {
  const m = today.getUTCMonth() + 1;
  const y = today.getUTCFullYear();
  const s = m >= startMonth ? y : y - 1;
  return `${s}-${s + 1}`;
}

export function schoolYearChoices(startMonth: number): string[] {
  const s = Number(currentSchoolYear(startMonth).slice(0, 4));
  return [`${s - 1}-${s}`, `${s}-${s + 1}`, `${s + 1}-${s + 2}`];
}

export function formatMoney(cents: number, currency = 'usd'): string {
  const amt = cents / 100;
  const sym = currency.toLowerCase() === 'usd' ? '$' : `${currency.toUpperCase()} `;
  return Number.isInteger(amt) ? `${sym}${amt}` : `${sym}${amt.toFixed(2)}`;
}

export function gradeLabel(g: string | null): string {
  if (!g) return '';
  if (g === 'PK') return 'Pre-K';
  if (g === 'K') return 'Kindergarten';
  return `Grade ${g}`;
}

export const REGULATION_META: Record<string, { label: string; badge: string }> = {
  none: { label: 'No filings required', badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
  low: { label: 'Low regulation', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  moderate: { label: 'Moderate regulation', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  high: { label: 'High regulation', badge: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

export const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  notice_of_intent: 'Filing',
  standardized_testing: 'Testing',
  portfolio_review: 'Portfolio',
  progress_report: 'Report',
  curriculum_plan: 'Curriculum',
  instruction_hours: 'Hours',
  recordkeeping: 'Records',
  other: 'Requirement',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  notice_of_intent: 'Notice of intent',
  withdrawal_letter: 'Withdrawal letter',
};
