// CANONICAL: document data access, the notice template renderer, and the shared document field schemas.
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GRADE_LEVELS, PRODUCT_ID, isIsoDate, type DocumentStatus, type DocumentType } from '@/lib/db/constants';
import type { StateRow } from '@/lib/db/catalog';
import type { StudentRow } from '@/lib/db/students';
import type { ProfileRow } from '@/lib/db/profiles';

const TABLE = 'homeschoolcompliancepack_documents';
const DOCUMENT_COLUMNS = 'id, state_code, doc_type, school_year, title, fields, body, status, created_at, updated_at';

export type NoticeStudent = { name: string; birth_date: string | null; grade_level: string | null };
export type NoticeFields = { parent_name: string; mailing_address: string; school_district: string; students: NoticeStudent[] };
export type NoticeFieldOverrides = { parent_name?: string; mailing_address?: string; school_district?: string; students?: NoticeStudent[] };

export type DocumentRow = {
  id: string;
  state_code: string;
  doc_type: DocumentType;
  school_year: string;
  title: string;
  fields: unknown;
  body: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type DocumentCreate = { state_code: string; doc_type: DocumentType; school_year: string; title: string; fields: NoticeFields; body: string };
export type DocumentUpdate = { title?: string; fields?: NoticeFields; body?: string; status?: DocumentStatus };

export const noticeStudentSchema = z.object({
  name: z.string().trim().min(1, 'Student names cannot be empty.').max(160, 'Student names can be up to 160 characters.'),
  birth_date: z.string().refine(isIsoDate, 'Birth dates use the YYYY-MM-DD format.').nullable().optional(),
  grade_level: z.enum(GRADE_LEVELS, { errorMap: () => ({ message: 'Pick a grade from PK through 12.' }) }).nullable().optional(),
});

export const noticeFieldOverridesSchema = z.object({
  parent_name: z.string().trim().max(160, 'Parent names can be up to 160 characters.').optional(),
  mailing_address: z.string().trim().max(500, 'Addresses can be up to 500 characters.').optional(),
  school_district: z.string().trim().max(200, 'District names can be up to 200 characters.').optional(),
  students: z.array(noticeStudentSchema).max(20, 'Documents can list up to 20 students.').optional(),
});

export function asNoticeFields(value: unknown): NoticeFields {
  const record = (value ?? {}) as Partial<NoticeFields>;
  return {
    parent_name: typeof record.parent_name === 'string' ? record.parent_name : '',
    mailing_address: typeof record.mailing_address === 'string' ? record.mailing_address : '',
    school_district: typeof record.school_district === 'string' ? record.school_district : '',
    students: Array.isArray(record.students) ? record.students : [],
  };
}

export function normalizeNoticeStudents(
  students: Array<{ name: string; birth_date?: string | null; grade_level?: string | null }>,
): NoticeStudent[] {
  return students.map((student) => ({
    name: student.name,
    birth_date: student.birth_date ?? null,
    grade_level: student.grade_level ?? null,
  }));
}

export function buildNoticeFields(profile: ProfileRow, students: StudentRow[], overrides?: NoticeFieldOverrides): NoticeFields {
  const defaultStudents: NoticeStudent[] = students.map((student) => ({
    name: [student.first_name, student.last_name].filter(Boolean).join(' '),
    birth_date: student.birth_date,
    grade_level: student.grade_level,
  }));
  return {
    parent_name: overrides?.parent_name ?? profile.full_name ?? '',
    mailing_address: overrides?.mailing_address ?? profile.mailing_address ?? '',
    school_district: overrides?.school_district ?? profile.school_district ?? '',
    students: overrides?.students ?? defaultStudents,
  };
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function renderDocumentBody(docType: DocumentType, state: StateRow, schoolYear: string, fields: NoticeFields): string {
  const lines: string[] = [];
  lines.push(formatLongDate(new Date()));
  lines.push('');
  lines.push(`To: ${state.files_with ?? `The office that receives homeschool filings in ${state.name}`}`);
  lines.push(
    docType === 'notice_of_intent'
      ? `Re: Notice of intent to provide home instruction, ${schoolYear} school year`
      : `Re: Withdrawal from enrollment for home instruction, ${schoolYear} school year`,
  );
  lines.push('');
  lines.push('To whom it may concern:');
  lines.push('');
  const parentName = fields.parent_name || '[Parent name]';
  lines.push(
    docType === 'notice_of_intent'
      ? `I, ${parentName}, am writing to give notice of my intent to provide home instruction during the ${schoolYear} school year for the student(s) listed below.`
      : `I, ${parentName}, am writing to inform you that the student(s) listed below are being withdrawn from enrollment and will receive home instruction beginning in the ${schoolYear} school year.`,
  );
  lines.push('');
  lines.push('Student(s):');
  const students = fields.students.length > 0 ? fields.students : [{ name: '[Student name]', birth_date: null, grade_level: null }];
  for (const student of students) {
    const details: string[] = [];
    if (student.birth_date) details.push(`date of birth ${student.birth_date}`);
    if (student.grade_level) details.push(`grade ${student.grade_level}`);
    lines.push(details.length > 0 ? `- ${student.name} (${details.join(', ')})` : `- ${student.name}`);
  }
  lines.push('');
  if (fields.mailing_address) lines.push(`Mailing address: ${fields.mailing_address}`);
  if (fields.school_district) lines.push(`School district: ${fields.school_district}`);
  if (fields.mailing_address || fields.school_district) lines.push('');
  lines.push(
    state.statute_citation
      ? `This notice is provided in accordance with ${state.statute_citation}.`
      : `This notice is provided in accordance with the home instruction requirements of ${state.name}.`,
  );
  lines.push('');
  lines.push('Please contact me at the address above if anything further is needed.');
  lines.push('');
  lines.push('Sincerely,');
  lines.push('');
  lines.push(parentName);
  return lines.join('\n');
}

type Range = { from: number; to: number };

export async function listDocuments(supabase: SupabaseClient, userId: string, range: Range): Promise<{ items: DocumentRow[]; total: number }> {
  const { data, count, error } = await supabase
    .from(TABLE)
    .select(DOCUMENT_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(range.from, range.to);
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as DocumentRow[], total: count ?? 0 };
}

export async function getDocument(supabase: SupabaseClient, userId: string, documentId: string): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(DOCUMENT_COLUMNS)
    .eq('id', documentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DocumentRow | null) ?? null;
}

export async function createDocument(supabase: SupabaseClient, userId: string, input: DocumentCreate): Promise<DocumentRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      product_id: PRODUCT_ID,
      state_code: input.state_code,
      doc_type: input.doc_type,
      school_year: input.school_year,
      title: input.title,
      fields: input.fields,
      body: input.body,
      status: 'draft',
    })
    .select(DOCUMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as DocumentRow;
}

export async function updateDocument(supabase: SupabaseClient, userId: string, documentId: string, patch: DocumentUpdate): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', documentId)
    .eq('user_id', userId)
    .select(DOCUMENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DocumentRow | null) ?? null;
}

export async function deleteDocument(supabase: SupabaseClient, userId: string, documentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
