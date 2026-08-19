// CANONICAL: reports whether the signed in user owns the Compliance Pack.
import { ok, requireUser, unexpected } from '@/lib/api/http';
import { hasCompleteAccess } from '@/lib/db/entitlement';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const paid = await hasCompleteAccess(auth.user.id);
    return ok({ paid, plan_key: paid ? 'complete' : 'free' });
  } catch (error) {
    return unexpected('GET /api/entitlement', error);
  }
}
