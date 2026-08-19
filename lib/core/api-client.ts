// CANONICAL: client-safe API wrapper and shared row types for every dashboard page.
export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  code?: string;
  fields?: Record<string, string>;
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const body = (await res.json().catch(() => null)) as { data?: T; error?: string; code?: string; fields?: Record<string, string> } | null;
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: body?.error ?? 'Something needs another try.', code: body?.code, fields: body?.fields };
    }
    return { ok: true, status: res.status, data: (body?.data ?? null) as T, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: 'We could not reach the server. Check your connection and try again.' };
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path);
}

export function apiSend<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });
}

export type ListPayload<T> = { items: T[]; page: number; limit: number; total: number };

export type ProfileData = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
  state_code: string | null;
  mailing_address: string | null;
  school_district: string | null;
  school_year_start_month: number;
  created_at: string;
  updated_at: string;
};

export type EntitlementData = { paid: boolean; plan_key: string };

export type StateItem = {
  id: string;
  code: string;
  name: string;
  regulation_level: 'none' | 'low' | 'moderate' | 'high';
  notice_required: boolean;
  testing_required: boolean;
  files_with: string | null;
  summary: string;
  statute_citation: string | null;
};

export type RequirementItem = {
  id: string;
  state_code: string;
  requirement_type: string;
  title: string;
  description: string;
  recurrence: 'annual' | 'quarterly' | 'one_time' | 'relative';
  due_month: number | null;
  due_day: number | null;
  due_rule: string | null;
  applies_grades: string | null;
  sort_order: number;
};

export type StudentItem = {
  id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  grade_level: string | null;
  created_at: string;
  updated_at: string;
};

export type DeadlineItem = {
  id: string;
  student_id: string | null;
  requirement_id: string | null;
  title: string;
  notes: string | null;
  school_year: string;
  due_date: string;
  remind_at: string;
  reminder_sent_at: string | null;
  status: 'upcoming' | 'completed' | 'dismissed';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoticeStudentData = { name: string; birth_date: string | null; grade_level: string | null };

export type NoticeFieldsData = {
  parent_name: string;
  mailing_address: string;
  school_district: string;
  students: NoticeStudentData[];
};

export type DocumentItem = {
  id: string;
  state_code: string;
  doc_type: 'notice_of_intent' | 'withdrawal_letter';
  school_year: string;
  title: string;
  fields: Partial<NoticeFieldsData> | null;
  body: string | null;
  status: 'draft' | 'finalized';
  created_at: string;
  updated_at: string;
};

export type GeneratePayload = {
  state_code: string;
  state_name: string;
  school_year: string;
  created_count: number;
  preserved_completed: number;
  items: DeadlineItem[];
};
