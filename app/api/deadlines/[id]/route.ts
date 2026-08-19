// CANONICAL: single deadline routes (edit, complete, dismiss, delete).
import { z } from 'zod';
import { rateLimitGuard, fail, ok, parseWith, readJsonBody, requireUser, schoolYearSchema, unexpected } from '@/lib/api/http';
import { DEADLINE_STATUSES, isIsoDate, isUuid } from '@/lib/db/constants';
import { deleteDeadline, getDeadline, updateDeadline } from '@/lib/db/deadlines';
import { getStudent } from '@/lib/db/students';

export const dynamic = 'force-dynamic';

const updateDeadlineSchema = z
  .object({
    title: z.string().trim().min(1, 'A title is required.').max(200, 'Titles can be up to 200 characters.').optional(),
    notes: z.string().trim().max(2000, 'Notes can be up to 2000 characters.').nullable().optional(),
    due_date: z.string().refine(isIsoDate, 'Due dates use the YYYY-MM-DD format.').optional(),
    school_year: schoolYearSchema.optional(),
    status: z.enum(DEADLINE_STATUSES, { errorMap: () => ({ message: 'Status can be upcoming, completed, or dismissed.' }) }).optional(),
    student_id: z.string().uuid('That student id is not valid.').nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to update.' });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That deadline id is not valid.');
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const deadline = await getDeadline(auth.supabase, auth.user.id, params.id);
    if (!deadline) return fail(404, 'deadline_not_found', 'We could not find that deadline on your calendar.');
    return ok(deadline);
  } catch (error) {
    return unexpected('GET /api/deadlines/[id]', error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That deadline id is not valid.');
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const parsed = parseWith(updateDeadlineSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    if (typeof parsed.value.student_id === 'string') {
      const student = await getStudent(auth.supabase, auth.user.id, parsed.value.student_id);
      if (!student) {
        return fail(400, 'student_not_found', 'That student is not on your account.', { student_id: 'That student is not on your account.' });
      }
    }
    const deadline = await updateDeadline(auth.supabase, auth.user.id, params.id, parsed.value);
    if (!deadline) return fail(404, 'deadline_not_found', 'We could not find that deadline on your calendar.');
    return ok(deadline);
  } catch (error) {
    return unexpected('PATCH /api/deadlines/[id]', error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return fail(400, 'invalid_id', 'That deadline id is not valid.');
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const deleted = await deleteDeadline(auth.supabase, auth.user.id, params.id);
    if (!deleted) return fail(404, 'deadline_not_found', 'We could not find that deadline on your calendar.');
    return ok({ deleted: true });
  } catch (error) {
    return unexpected('DELETE /api/deadlines/[id]', error);
  }
}
