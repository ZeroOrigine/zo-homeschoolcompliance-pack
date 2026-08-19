// CANONICAL: student data access.
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCT_ID, type GradeLevel } from '@/lib/db/constants';

const TABLE = 'homeschoolcompliancepack_students';
const STUDENT_COLUMNS = 'id, first_name, last_name, birth_date, grade_level, created_at, updated_at';

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  grade_level: GradeLevel | null;
  created_at: string;
  updated_at: string;
};

export type StudentCreate = {
  first_name: string;
  last_name?: string;
  birth_date?: string;
  grade_level?: GradeLevel;
};

export type StudentUpdate = {
  first_name?: string;
  last_name?: string | null;
  birth_date?: string | null;
  grade_level?: GradeLevel | null;
};

type Range = { from: number; to: number };

export async function listStudents(supabase: SupabaseClient, userId: string, range?: Range): Promise<{ items: StudentRow[]; total: number }> {
  let query = supabase
    .from(TABLE)
    .select(STUDENT_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (range) query = query.range(range.from, range.to);
  else query = query.limit(100);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as StudentRow[], total: count ?? 0 };
}

export async function getStudent(supabase: SupabaseClient, userId: string, studentId: string): Promise<StudentRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(STUDENT_COLUMNS)
    .eq('id', studentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudentRow | null) ?? null;
}

export async function createStudent(supabase: SupabaseClient, userId: string, input: StudentCreate): Promise<StudentRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      product_id: PRODUCT_ID,
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      birth_date: input.birth_date ?? null,
      grade_level: input.grade_level ?? null,
    })
    .select(STUDENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as StudentRow;
}

export async function updateStudent(supabase: SupabaseClient, userId: string, studentId: string, patch: StudentUpdate): Promise<StudentRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', studentId)
    .eq('user_id', userId)
    .select(STUDENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudentRow | null) ?? null;
}

export async function deleteStudent(supabase: SupabaseClient, userId: string, studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', studentId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
