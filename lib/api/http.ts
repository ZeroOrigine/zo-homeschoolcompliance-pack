// CANONICAL: shared API helpers: response envelope, validation, auth guard, pagination, and the single rate limit table.
import { NextResponse } from 'next/server';
import { z, type ZodTypeAny } from 'zod';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { SCHOOL_YEAR_PATTERN, parseSchoolYear } from '@/lib/db/constants';

export type ApiFailureBody = { data: null; error: string; code: string; fields?: Record<string, string> };

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(status: number, code: string, message: string, fields?: Record<string, string>): NextResponse {
  const body: ApiFailureBody = { data: null, error: message, code };
  if (fields) body.fields = fields;
  return NextResponse.json(body, { status });
}

export function unexpected(context: string, error: unknown): NextResponse {
  console.error(`[homeschoolcompliancepack] ${context}`, error);
  return fail(500, 'internal_error', 'We hit a snag on our side. Please try again in a moment.');
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseWith<Schema extends ZodTypeAny>(
  schema: Schema,
  body: unknown,
): { ok: true; value: z.infer<Schema> } | { ok: false; response: NextResponse } {
  if (body === null || body === undefined) {
    return { ok: false, response: fail(400, 'validation_error', 'Send a JSON body with this request.', { body: 'Send a JSON body with this request.' }) };
  }
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, value: result.data };
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'body';
    if (!fields[key]) fields[key] = issue.message;
  }
  return { ok: false, response: fail(400, 'validation_error', 'Some fields need attention before we can continue.', fields) };
}

type AuthSuccess = { supabase: SupabaseClient; user: User; response: null };
type AuthFailure = { supabase: null; user: null; response: NextResponse };

export async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase: null, user: null, response: fail(401, 'unauthorized', 'Please sign in to continue.') };
  }
  return { supabase, user: data.user, response: null };
}

const RATE_LIMITS = {
  write: { bucket: 'homeschoolcompliancepack_write', perKeyDailyCap: 120, globalDailyCap: 5000 },
  beacon: { bucket: 'homeschoolcompliancepack_beacon', perKeyDailyCap: 600, globalDailyCap: 50000 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export async function enforceRateLimit(request: Request, kind: RateLimitKind = 'write'): Promise<NextResponse | null> {
  const limit = RATE_LIMITS[kind];
  const verdict = await rateLimitCheck(limit.bucket, clientIp(request), limit.perKeyDailyCap, limit.globalDailyCap);
  if (!verdict.allowed) {
    return fail(429, 'rate_limited', 'Too many requests for today. The counter resets tomorrow.');
  }
  return null;
}

export type Pagination = { page: number; limit: number; from: number; to: number };

export function getPagination(url: URL): Pagination {
  const rawPage = Number(url.searchParams.get('page') ?? '1');
  const rawLimit = Number(url.searchParams.get('limit') ?? '20');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 20;
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
}

export const schoolYearSchema = z
  .string({ required_error: 'Tell us which school year, like 2025-2026.' })
  .regex(SCHOOL_YEAR_PATTERN, 'School years look like 2025-2026.')
  .refine((value) => parseSchoolYear(value) !== null, 'School years cover two consecutive years, like 2025-2026.');

export const stateCodeSchema = z
  .string({ required_error: 'Pick a state so we know which rules apply.' })
  .trim()
  .length(2, 'State codes are two letters, like TX.')
  .transform((value) => value.toUpperCase());
