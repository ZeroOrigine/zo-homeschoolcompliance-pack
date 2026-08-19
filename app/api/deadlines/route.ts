// CANONICAL: deadline collection routes (list plus custom deadline creation).
import { z } from 'zod';
import { rateLimitGuard, fail, getPagination, ok, parseWith, readJsonBody, requireUser, schoolYearSchema, unexpected } from '@/lib/api/http';
import { DEADLINE_STATUSES, isIsoDate, isUuid, parseSchoolYear, type DeadlineStatus } from '@/lib/db/constants';
import { createDeadline, listDeadlines } from '@/lib/db/deadlines';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import { getStudent } from '@/lib/db/students';

export const dynamic = 'force-dynamic';

const createDeadlineSchema = z.object({
  title: z
    .string({ required_error: 'A title is required.' })
    .trim()
    .min(1, 'A title is required.')
    .max(200, 'Titles can be up to 200 characters.'),
  notes: z.string().trim().max(2000, 'Notes can be up to 2000 characters.').optional(),
  school_year: schoolYearSchema,
  due_date: z.string({ required_error: 'A due date is required.' }).refine(isIsoDate, 'Due dates use the YYYY-MM-DD format.'),
  student_id: z.string().uuid('That student id is not valid.').optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const url = new URL(request.url);
    const schoolYear = url.searchParams.get('school_year') ?? undefined;
    if (schoolYear && !parseSchoolYear(schoolYear)) {
      return fail(400, 'validation_error', 'School years look like 2025-2026.', { school_year: 'School years look like 2025-2026.' });
    }
    const statusParam = url.searchParams.get('status') ?? undefined;
    if (statusParam && !DEADLINE_STATUSES.includes(statusParam as DeadlineStatus)) {
      return fail(400, 'validation_error', 'Status can be upcoming, completed, or dismissed.', { status: 'Status can be upcoming, completed, or dismissed.' });
    }
    const studentId = url.searchParams.get('student_id') ?? undefined;
    if (studentId && !isUuid(studentId)) {
      return fail(400, 'validation_error', 'That student id is not valid.', { student_id: 'That student id is not valid.' });
    }
    const reminderDue = url.searchParams.get('reminder_due') === 'true';
    const pagination = getPagination(url);
    const { items, total } = await listDeadlines(
      auth.supabase,
      auth.user.id,
      {
        schoolYear,
        status: reminderDue ? undefined : (statusParam as DeadlineStatus | undefined),
        studentId,
        reminderDue,
      },
      { from: pagination.from, to: pagination.to },
    );
    return ok({ items, page: pagination.page, limit: pagination.limit, total });
  } catch (error) {
    return unexpected('GET /api/deadlines', error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const paid = await hasCompleteAccess(auth.user.id);
    if (!paid) {
      return fail(402, 'payment_required', 'Your personal compliance calendar unlocks with the one time Compliance Pack purchase.');
    }
    const parsed = parseWith(createDeadlineSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    if (parsed.value.student_id) {
      const student = await getStudent(auth.supabase, auth.user.id, parsed.value.student_id);
      if (!student) {
        return fail(400, 'student_not_found', 'That student is not on your account.', { student_id: 'That student is not on your account.' });
      }
    }
    const deadline = await createDeadline(auth.supabase, auth.user.id, parsed.value);
    return ok(deadline, 201);
  } catch (error) {
    return unexpected('POST /api/deadlines', error);
  }
}
