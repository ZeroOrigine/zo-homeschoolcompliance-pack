// CANONICAL: public catalog route for one state plus its filing and testing requirements.
import { fail, ok, unexpected } from '@/lib/api/http';
import { getStateByCode, listStateRequirements } from '@/lib/db/catalog';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  try {
    const code = params.code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return fail(400, 'invalid_state_code', 'State codes are two letters, like TX or NY.');
    }
    const state = await getStateByCode(code);
    if (!state) {
      return fail(404, 'state_not_found', 'We could not find that state. Check the two letter code and try again.');
    }
    const requirements = await listStateRequirements(code);
    return ok({ state, requirements });
  } catch (error) {
    return unexpected('GET /api/states/[code]', error);
  }
}
