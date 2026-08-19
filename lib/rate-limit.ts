// CANONICAL: daily rate limiter backed by the homeschoolcompliancepack_zo_rate_limits table.
// Fail-open by design: a limiter outage must never take the product down with it.
// Each bucket is ONE atomic RPC increment (INSERT ... ON CONFLICT (bucket,rl_key,day)
// DO UPDATE SET count = count + 1 RETURNING count) — single round trip, no read-then-write race.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type RateLimitVerdict = { allowed: boolean };

const GLOBAL_KEY = '__global__';

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function clientIp(request: Request): string {
  // Platform-verified headers first: these are set by the edge/platform and
  // cannot be spoofed by callers, unlike x-forwarded-for's first hop which an
  // attacker can rotate freely to reset their per-key bucket (QA-038).
  const verified =
    request.headers.get('x-nf-client-connection-ip') ?? // Netlify
    request.headers.get('cf-connecting-ip') ?? // Cloudflare
    request.headers.get('x-real-ip'); // Vercel / nginx
  if (verified) {
    const trimmed = verified.trim();
    if (trimmed) return trimmed.slice(0, 64);
  }
  // Fallback: LAST x-forwarded-for hop (appended by the nearest trusted proxy),
  // never the client-controlled first entry.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',');
    const last = hops[hops.length - 1]?.trim();
    if (last) return last.slice(0, 64);
  }
  return 'unknown';
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function bump(supabase: SupabaseClient, bucket: string, key: string, cap: number): Promise<boolean> {
  // Atomic upsert-increment in a single round trip; returns the post-increment count.
  const { data, error } = await supabase.rpc('homeschoolcompliancepack_zo_rate_limit_bump', {
    p_bucket: bucket,
    p_rl_key: key,
    p_day: todayUtc(),
  });
  if (error) {
    console.error('[homeschoolcompliancepack] rate limit bump failed', error.message);
    return true; // fail open: never block users because the limiter broke
  }
  const count = typeof data === 'number' ? data : Number(data);
  if (!Number.isFinite(count) || count <= 0) return true; // fail open on malformed RPC result
  return count <= cap;
}

export async function rateLimitCheck(
  bucket: string,
  key: string,
  perKeyDailyCap: number,
  globalDailyCap: number,
): Promise<RateLimitVerdict> {
  try {
    const supabase = serviceClient();
    if (!supabase) return { allowed: true };
    const [perKeyAllowed, globalAllowed] = await Promise.all([
      bump(supabase, bucket, key || 'unknown', perKeyDailyCap),
      bump(supabase, bucket, GLOBAL_KEY, globalDailyCap),
    ]);
    return { allowed: perKeyAllowed && globalAllowed };
  } catch (error) {
    console.error('[homeschoolcompliancepack] rate limit check failed', error);
    return { allowed: true };
  }
}
