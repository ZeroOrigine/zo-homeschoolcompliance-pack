// CANONICAL: server side Supabase clients: cookie-bound user client, bare anon client, and service role client.
// This module owns the ONE createServerClient cookie adapter for the app. Route Handlers and
// Server Components must import createSupabaseServerClient from here rather than hand-rolling
// their own cookie adapter, so session handling stays consistent in a single place.
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnvName = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY';

function requiredEnv(name: SupabaseEnvName): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/**
 * Cookie-bound user client. Safe in BOTH Server Components and Route Handlers:
 * - Route Handlers / Server Actions: auth cookie writes (session refresh, sign-out) are applied.
 * - Server Components: cookie writes are dropped (see setAll) and middleware refreshes the session.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies, so writes are dropped here and
          // middleware refreshes the session; Route Handlers apply writes normally.
        }
      },
    },
  });
}

/** Cookie-less anon-key client for public data reads with no user context. */
export function createSupabaseAnonClient(): SupabaseClient {
  return createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client for trusted server-only jobs (cron, webhooks). Never expose to the browser. */
export function createSupabaseServiceClient(): SupabaseClient {
  return createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
