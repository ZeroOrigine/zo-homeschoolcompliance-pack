// CANONICAL: single student routes.
import { z } from 'zod';
import { rateLimitGuard, fail, ok, parseWith, readJsonBody, requireUser, unexpected } from '@/lib/api/http';
import { GRADE_LEVELS, isIsoDate, isUuid } from '@/lib/db/constants';
import { deleteStudent, getStudent, updateStudent } from '@/lib/db/students';

export const dynamic = 'force-dynamic';

const updateStudentSchema = z
  .object({
    first_name: z.string().trim().min(1, 'A first name is required.').max(80, 'First names can be up to 80 characters.').optional(),
    last_name: z.string().trim().max(80, 'Last names can be up to 80 characters.').nullable().optional(),
    birth_date: z.string().refine(isIsoDate, 'Birth dates use the YYYY-MM-DD format.').nullable().optional(),
    grade_level: z.enum(GRADE_LEVELS, { errorMap: () => ({ message: 'Pick a grade from PK through 12.' }) }).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to update.' });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That student id is not valid.');
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const student = await getStudent(auth.supabase, auth.user.id, params.id);
    if (!student) return fail(404, 'student_not_found', 'We could not find that student on your account.');
    return ok(student);
  } catch (error) {
    return unexpected('GET /api/students/[id]', error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That student id is not valid.');
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const parsed = parseWith(updateStudentSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    const student = await updateStudent(auth.supabase, auth.user.id, params.id, parsed.value);
    if (!student) return fail(404, 'student_not_found', 'We could not find that student on your account.');
    return ok(student);
  } catch (error) {
    return unexpected('PATCH /api/students/[id]', error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That student id is not valid.');
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const deleted = await deleteStudent(auth.supabase, auth.user.id, params.id);
    if (!deleted) return fail(404, 'student_not_found', 'We could not find that student on your account.');
    return ok({ deleted: true });
  } catch (error) {
    return unexpected('DELETE /api/students/[id]', error);
  }
}
