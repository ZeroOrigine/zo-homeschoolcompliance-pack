// CANONICAL: shared product constants and pure validation helpers, defined once and imported everywhere.
export const PRODUCT_ID = 'homeschoolcompliancepack';

export const GRADE_LEVELS = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const DEADLINE_STATUSES = ['upcoming', 'completed', 'dismissed'] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export const DOCUMENT_TYPES = ['notice_of_intent', 'withdrawal_letter'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['draft', 'finalized'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const SCHOOL_YEAR_PATTERN = /^[0-9]{4}-[0-9]{4}$/;

export type SchoolYear = { start: number; end: number };

export function parseSchoolYear(value: string): SchoolYear | null {
  if (!SCHOOL_YEAR_PATTERN.test(value)) return null;
  const [start, end] = value.split('-').map(Number);
  if (end !== start + 1) return null;
  return { start, end };
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
