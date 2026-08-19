// CANONICAL: builds the personal compliance calendar from the state requirement catalog. Activation (Law 116) fires here on a user's first generated calendar.
import { z } from 'zod';
import { rateLimitGuard, fail, ok, parseWith, readJsonBody, requireUser, schoolYearSchema, stateCodeSchema, unexpected } from '@/lib/api/http';
import { getStateByCode } from '@/lib/db/catalog';
import { countDeadlines, generateCalendar } from '@/lib/db/deadlines';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import { emitProductMetric } from '@/lib/db/metrics';
import { getOrCreateProfile, updateProfile } from '@/lib/db/profiles';

export const dynamic = 'force-dynamic';

const generateSchema = z.object({
  school_year: schoolYearSchema,
  state_code: stateCodeSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const paid = await hasCompleteAccess(auth.user.id);
    // hasCompleteAccess is a React cache()-memoized fn keyed by userId (single argument).
    if (!paid) {
      return fail(402, 'payment_required', 'Your personal compliance calendar unlocks with the one time Compliance Pack purchase.');
    }
    const parsed = parseWith(generateSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    const profile = await getOrCreateProfile(auth.supabase, auth.user);
    const stateCode = parsed.value.state_code ?? profile.state_code;
    if (!stateCode) {
      return fail(400, 'state_required', 'Pick your state first so we can build the right calendar.', { state_code: 'Pick your state first.' });
    }
    const state = await getStateByCode(stateCode);
    if (!state) {
      return fail(400, 'unknown_state', 'We could not find that state. Check the two letter code and try again.', { state_code: 'Unknown state code.' });
    }
    if (parsed.value.state_code && parsed.value.state_code !== profile.state_code) {
      await updateProfile(auth.supabase, auth.user.id, { state_code: state.code });
    }
    let hadDeadlines = true;
    try {
      hadDeadlines = (await countDeadlines(auth.supabase, auth.user.id)) > 0;
    } catch {
      hadDeadlines = true;
    }
    const result = await generateCalendar(auth.supabase, auth.user.id, {
      schoolYearLabel: parsed.value.school_year,
      stateCode: state.code,
      startMonth: profile.school_year_start_month,
    });
    if (!hadDeadlines && result.created.length > 0) {
      await emitProductMetric('activation', '/api/deadlines/generate');
    }
    return ok(
      {
        state_code: state.code,
        state_name: state.name,
        school_year: parsed.value.school_year,
        created_count: result.created.length,
        preserved_completed: result.preservedCompleted,
        items: result.created,
      },
      201,
    );
  } catch (error) {
    return unexpected('POST /api/deadlines/generate', error);
  }
}
