// CANONICAL: local page view beacon collector (Law 197). ZoBeacon posts here; the middleware owned by the auth step allowlists this path.
import { z } from 'zod';
import { enforceRateLimit, ok, parseWith, readJsonBody, unexpected } from '@/lib/api/http';
import { emitProductMetric } from '@/lib/db/metrics';

export const dynamic = 'force-dynamic';

const beaconSchema = z.object({
  event: z.enum(['page_view', 'signup', 'activation', 'payment'], { errorMap: () => ({ message: 'Unknown beacon event.' }) }),
  path: z.string().max(300, 'Paths can be up to 300 characters.').optional(),
});

function sanitizePath(raw: string): string {
  const withoutQuery = raw.split('?')[0].split('#')[0].slice(0, 200);
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, 'beacon');
    if (limited) return limited;
    const parsed = parseWith(beaconSchema, await readJsonBody(request));
    if (!parsed.ok) return parsed.response;
    // Purpose events (signup, activation, payment) are written server side only (Law 116); the browser may report page views.
    if (parsed.value.event !== 'page_view') return ok({ recorded: false });
    await emitProductMetric('page_view', sanitizePath(parsed.value.path ?? '/'));
    return ok({ recorded: true });
  } catch (error) {
    return unexpected('POST /api/zo', error);
  }
}
