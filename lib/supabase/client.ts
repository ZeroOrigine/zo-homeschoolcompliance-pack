// CANONICAL: browser Supabase client for client components (real module, not a tombstone).
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Log the technical cause for developers, then throw a plain, catchable
    // Error so auth submit handlers (login/signup/forgot/reset) can try/catch
    // and surface a friendly form error instead of a silent dead button (QA-020).
    console.error(
      'Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
    throw new Error(
      'We could not reach the sign-in service. Please try again in a few minutes or contact support.'
    );
  }
  try {
    browserClient = createBrowserClient(url, anonKey);
  } catch (cause) {
    console.error('Failed to initialize Supabase browser client:', cause);
    throw new Error(
      'We could not reach the sign-in service. Please try again in a few minutes or contact support.'
    );
  }
  return browserClient;
}
