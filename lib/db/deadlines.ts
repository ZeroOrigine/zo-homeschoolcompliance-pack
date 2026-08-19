// CANONICAL: deadline data access and the compliance calendar generator.
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCT_ID, parseSchoolYear, type DeadlineStatus, type SchoolYear } from '@/lib/db/constants';
import { listStateRequirements, type StateRequirementRow } from '@/lib/db/catalog';
import { listStudents, type StudentRow } from '@/lib/db/students';

const TABLE = 'homeschoolcompliancepack_deadlines';
const PROFILES_TABLE = 'homeschoolcompliancepack_profiles';
const DEADLINE_COLUMNS = 'id, student_id, requirement_id, title, notes, school_year, due_date, remind_at, reminder_sent_at, status, completed_at, created_at, updated_at';

export type DeadlineRow = {
  id: string;
  student_id: string | null;
  requirement_id: string | null;
  title: string;
  notes: string | null;
  school_year: string;
  due_date: string;
  remind_at: string;
  reminder_sent_at: string | null;
  status: DeadlineStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeadlineFilters = { schoolYear?: string; status?: DeadlineStatus; studentId?: string; reminderDue?: boolean };
export type DeadlineCreate = { title: string; notes?: string; school_year: string; due_date: string; student_id?: string };
export type DeadlineUpdate = { title?: string; notes?: string | null; due_date?: string; school_year?: string; status?: DeadlineStatus; student_id?: string | null };

type Range = { from: number; to: number };

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

function addMonths(startYear: number, month: number, offset: number): { year: number; month: number } {
  const index = month - 1 + offset;
  return { year: startYear + Math.floor(index / 12), month: (index % 12) + 1 };
}

// Anchor resolver for a requirement's due month within a school year.
// Months on/after the start month always fall in year.start. Months BEFORE the
// start month are ambiguous: pre-year filings (notice/declaration of intent,
// affidavit) are due before the year begins, so they anchor to year.start —
// NY's "notice of intent by July 1" for 2025-2026 must be 2025-07-01. All other
// pre-start months are in-year/wrap-up obligations anchored to year.end — NH's
// July 1 evaluation for 2025-2026 stays 2026-07-01, spring testing stays in spring.
const PRE_YEAR_FILING = /notice|intent|declaration|affidavit/i;

function resolveAnchorYear(requirement: StateRequirementRow, dueMonth: number, year: SchoolYear, startMonth: number): number {
  // "By August 1 following each school year" (VA evidence-of-progress class):
  // a wrap-up obligation due AFTER the school year ends, whatever its month —
  // anchor to year.end even when dueMonth >= startMonth (QA-028).
  if (/following/i.test(requirement.due_rule ?? '')) return year.end;
  if (dueMonth >= startMonth) return year.start;
  if (requirement.requirement_type === 'notice_of_intent') return year.start;
  return PRE_YEAR_FILING.test(`${requirement.title} ${requirement.due_rule ?? ''}`) ? year.start : year.end;
}

function resolveDueDates(requirement: StateRequirementRow, year: SchoolYear, startMonth: number): string[] {
  if (requirement.due_month) {
    const calendarYear = resolveAnchorYear(requirement, requirement.due_month, year, startMonth);
    return [isoDate(calendarYear, requirement.due_month, clampDay(calendarYear, requirement.due_month, requirement.due_day ?? 1))];
  }
  if (requirement.recurrence === 'quarterly') {
    return [2, 5, 8, 11].map((offset) => {
      const shifted = addMonths(year.start, startMonth, offset);
      return isoDate(shifted.year, shifted.month, 1);
    });
  }
  return [isoDate(year.start, startMonth, 1)];
}

function resolveTargets(requirement: StateRequirementRow, students: StudentRow[]): Array<string | null> {
  if (!requirement.applies_grades) return [null];
  const grades = requirement.applies_grades.split(',').map((grade) => grade.trim());
  const matches = students.filter((student) => student.grade_level !== null && grades.includes(student.grade_level));
  if (matches.length > 0) return matches.map((student) => student.id);
  return students.length === 0 ? [null] : [];
}

export async function listDeadlines(
  supabase: SupabaseClient,
  userId: string,
  filters: DeadlineFilters,
  range: Range,
): Promise<{ items: DeadlineRow[]; total: number }> {
  let query = supabase
    .from(TABLE)
    .select(DEADLINE_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
    .range(range.from, range.to);
  if (filters.schoolYear) query = query.eq('school_year', filters.schoolYear);
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.reminderDue) {
    query = query.eq('status', 'upcoming').lte('remind_at', todayIso());
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as DeadlineRow[], total: count ?? 0 };
}

export async function getDeadline(supabase: SupabaseClient, userId: string, deadlineId: string): Promise<DeadlineRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(DEADLINE_COLUMNS)
    .eq('id', deadlineId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DeadlineRow | null) ?? null;
}

export async function countDeadlines(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createDeadline(supabase: SupabaseClient, userId: string, input: DeadlineCreate): Promise<DeadlineRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      product_id: PRODUCT_ID,
      student_id: input.student_id ?? null,
      requirement_id: null,
      title: input.title,
      notes: input.notes ?? null,
      school_year: input.school_year,
      due_date: input.due_date,
      status: 'upcoming',
    })
    .select(DEADLINE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DeadlineRow;
}

export async function updateDeadline(supabase: SupabaseClient, userId: string, deadlineId: string, patch: DeadlineUpdate): Promise<DeadlineRow | null> {
  const changes: Record<string, unknown> = { ...patch };
  if (patch.status === 'completed') changes.completed_at = new Date().toISOString();
  else if (patch.status) changes.completed_at = null;
  if (patch.due_date) changes.reminder_sent_at = null;
  const { data, error } = await supabase
    .from(TABLE)
    .update(changes)
    .eq('id', deadlineId)
    .eq('user_id', userId)
    .select(DEADLINE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DeadlineRow | null) ?? null;
}

export async function deleteDeadline(supabase: SupabaseClient, userId: string, deadlineId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', deadlineId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

type DeadlineInsert = {
  user_id: string;
  product_id: string;
  student_id: string | null;
  requirement_id: string;
  title: string;
  notes: string | null;
  school_year: string;
  due_date: string;
  status: DeadlineStatus;
};

export type GenerateCalendarInput = { schoolYearLabel: string; stateCode: string; startMonth: number };
export type GenerateCalendarResult = { created: DeadlineRow[]; preservedCompleted: number };

export async function generateCalendar(supabase: SupabaseClient, userId: string, input: GenerateCalendarInput): Promise<GenerateCalendarResult> {
  const year = parseSchoolYear(input.schoolYearLabel);
  if (!year) throw new Error('School years cover two consecutive years, like 2025-2026.');
  const requirements = await listStateRequirements(input.stateCode);
  const { items: students } = await listStudents(supabase, userId);

  const { data: existing, error: existingError } = await supabase
    .from(TABLE)
    .select('id, requirement_id, student_id, due_date, status')
    .eq('user_id', userId)
    .eq('school_year', input.schoolYearLabel)
    .not('requirement_id', 'is', null);
  if (existingError) throw new Error(existingError.message);

  const settledKeys = new Set<string>();
  const staleIds: string[] = [];
  const existingRows = (existing ?? []) as Array<{ id: string; requirement_id: string; student_id: string | null; due_date: string; status: DeadlineStatus }>;
  for (const row of existingRows) {
    if (row.status === 'upcoming') staleIds.push(row.id);
    else settledKeys.add(`${row.requirement_id}|${row.student_id ?? ''}|${row.due_date}`);
  }

  const rows: DeadlineInsert[] = [];
  for (const requirement of requirements) {
    const targets = resolveTargets(requirement, students);
    if (targets.length === 0) continue;
    const dueDates = resolveDueDates(requirement, year, input.startMonth);
    for (const target of targets) {
      for (const dueDate of dueDates) {
        if (settledKeys.has(`${requirement.id}|${target ?? ''}|${dueDate}`)) continue;
        rows.push({
          user_id: userId,
          product_id: PRODUCT_ID,
          student_id: target,
          requirement_id: requirement.id,
          title: requirement.title,
          notes: requirement.due_rule,
          school_year: input.schoolYearLabel,
          due_date: dueDate,
          status: 'upcoming',
        });
      }
    }
  }

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('user_id', userId).in('id', staleIds);
    if (deleteError) throw new Error(deleteError.message);
  }
  if (rows.length === 0) return { created: [], preservedCompleted: settledKeys.size };

  const { data: created, error: insertError } = await supabase.from(TABLE).insert(rows).select(DEADLINE_COLUMNS);
  if (insertError) throw new Error(insertError.message);
  const sorted = ((created ?? []) as DeadlineRow[]).slice().sort((a, b) => a.due_date.localeCompare(b.due_date));
  return { created: sorted, preservedCompleted: settledKeys.size };
}

// Reminder DELIVERY is a platform organ (X7): the ecosystem dispatcher polls
// homeschoolcompliancepack_deadlines directly (status='upcoming', remind_at due,
// reminder_sent_at null), resolves recipients from the profiles table, sends via
// the platform mailer, and stamps reminder_sent_at in this product's dialect.
// The product ships NO mail transport and NO cron route — the remind_at /
// reminder_sent_at columns and their partial index above ARE the contract.
