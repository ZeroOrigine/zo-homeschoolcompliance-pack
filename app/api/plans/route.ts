// CANONICAL: public pricing route backed by the plans table (prices live in the database, never in env vars).
import { ok, unexpected } from '@/lib/api/http';
import { listPlans } from '@/lib/db/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listPlans();
    // QA-039: plan catalog changes rarely — cache at the CDN edge instead of refetching per visit.
    const res = ok({ items });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (error) {
    return unexpected('GET /api/plans', error);
  }
}
