// CANONICAL: current user profile read and update.
import { z } from 'zod';
import { rateLimitGuard, fail, ok, parseWith, readJsonBody, requireUser, stateCodeSchema, unexpected } from '@/lib/api/http';
import { getStateByCode } from '@/lib/db/catalog';
import { getOrCreateProfile, updateProfile } from '@/lib/db/profiles';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z
  .object({
    full_name: z.string().trim().max(120, 'Names can be up to 120 characters.').optional(),
    state_code: stateCodeSchema.optional(),
    mailing_address: z.string().trim().max(500, 'Addresses can be up to 500 characters.').nullable().optional(),
    school_district: z.string().trim().max(200, 'District names can be up to 200 characters.').nullable().optional(),
    school_year_start_month: z
      .number({ invalid_type_error: 'Start month must be a number from 1 to 12.' })
      .int('Start month must be a whole number.')
      .min(1, 'Start month must be from 1 to 12.')
      .max(12, 'Start month must be from 1 to 12.')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to update.' });

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const profile = await getOrCreateProfile(auth.supabase, auth.user);
    return ok(profile);
  } catch (error) {
    return unexpected('GET /api/profile', error);
  }
}

export async function PATCH(request: Request) {
  try {
    const limited = await rateLimitGuard(request, 'write');
    if (limited) return limited;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const parsed = parseWith(updateProfileSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    if (parsed.value.state_code) {
      const state = await getStateByCode(parsed.value.state_code);
      if (!state) {
        return fail(400, 'unknown_state', 'We could not find that state. Check the two letter code and try again.', { state_code: 'Unknown state code.' });
      }
    }
    await getOrCreateProfile(auth.supabase, auth.user);
    const profile = await updateProfile(auth.supabase, auth.user.id, parsed.value);
    return ok(profile);
  } catch (error) {
    return unexpected('PATCH /api/profile', error);
  }
}
