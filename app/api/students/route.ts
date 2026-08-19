// CANONICAL: student collection routes.
import { z } from 'zod';
import { rateLimitGuard, getPagination, ok, parseWith, readJsonBody, requireUser, unexpected } from '@/lib/api/http';
import { GRADE_LEVELS, isIsoDate } from '@/lib/db/constants';
import { createStudent, listStudents } from '@/lib/db/students';

export const dynamic = 'force-dynamic';

const createStudentSchema = z.object({
  first_name: z
    .string({ required_error: 'A first name is required.' })
    .trim()
    .min(1, 'A first name is required.')
    .max(80, 'First names can be up to 80 characters.'),
  last_name: z.string().trim().max(80, 'Last names can be up to 80 characters.').optional(),
  birth_date: z.string().refine(isIsoDate, 'Birth dates use the YYYY-MM-DD format.').optional(),
  grade_level: z.enum(GRADE_LEVELS, { errorMap: () => ({ message: 'Pick a grade from PK through 12.' }) }).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const pagination = getPagination(new URL(request.url));
    const { items, total } = await listStudents(auth.supabase, auth.user.id, { from: pagination.from, to: pagination.to });
    return ok({ items, page: pagination.page, limit: pagination.limit, total });
  } catch (error) {
    return unexpected('GET /api/students', error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const parsed = parseWith(createStudentSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    const student = await createStudent(auth.supabase, auth.user.id, parsed.value);
    return ok(student, 201);
  } catch (error) {
    return unexpected('POST /api/students', error);
  }
}
