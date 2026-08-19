// CANONICAL: public catalog route listing state homeschool rule summaries.
import { getPagination, ok, unexpected } from '@/lib/api/http';
import { listStates } from '@/lib/db/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const pagination = getPagination(new URL(request.url));
    const { items, total } = await listStates({ from: pagination.from, to: pagination.to });
    const response = ok({ items, page: pagination.page, limit: pagination.limit, total });
    // QA-039: state rule catalog is effectively static — let the CDN cache it
    // instead of refetching on every calendar page mount.
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    return response;
  } catch (error) {
    return unexpected('GET /api/states', error);
  }
}
