// CANONICAL: profile data access.
// NOTE: getOrCreateProfile / updateProfile are NOT wrapped in React cache()
// (API route handlers call them once per request — nothing to dedupe).
// getProfileForRender IS cache()-memoized (QA-050): it keys on SCALAR args
// (userId, email) and builds its own server client inside, so layout.tsx and
// dashboard/page.tsx share ONE profile read per render pass. Keep comments
// elsewhere consistent with exactly this split.
import { cache } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TABLE = 'homeschoolcompliancepack_profiles';
const PROFILE_COLUMNS = 'id, email, full_name, role, state_code, mailing_address, school_district, school_year_start_month, created_at, updated_at';

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
  state_code: string | null;
  mailing_address: string | null;
  school_district: string | null;
  school_year_start_month: number;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  full_name?: string;
  state_code?: string;
  mailing_address?: string | null;
  school_district?: string | null;
  school_year_start_month?: number;
};

export async function getOrCreateProfile(supabase: SupabaseClient, user: User): Promise<ProfileRow> {
  const { data, error } = await supabase.from(TABLE).select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as ProfileRow;
  const { error: upsertError } = await supabase
    .from(TABLE)
    .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id', ignoreDuplicates: true });
  if (upsertError) throw new Error(upsertError.message);
  const { data: created, error: refetchError } = await supabase.from(TABLE).select(PROFILE_COLUMNS).eq('id', user.id).single();
  if (refetchError) throw new Error(refetchError.message);
  return created as ProfileRow;
}

// QA-050: the render-pass loader. cache() keys on argument identity, so the
// signature is scalars-only and the Supabase client is constructed inside —
// the same trap hasCompleteAccess fell into (QA-049) is structurally avoided.
export const getProfileForRender = cache(async (userId: string, email: string | null): Promise<ProfileRow | null> => {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from(TABLE).select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as ProfileRow;
    const { error: upsertError } = await supabase
      .from(TABLE)
      .upsert({ id: userId, email: email ?? null }, { onConflict: 'id', ignoreDuplicates: true });
    if (upsertError) throw new Error(upsertError.message);
    const { data: created, error: refetchError } = await supabase.from(TABLE).select(PROFILE_COLUMNS).eq('id', userId).single();
    if (refetchError) throw new Error(refetchError.message);
    return created as ProfileRow;
  } catch {
    return null;
  }
});

export async function updateProfile(supabase: SupabaseClient, userId: string, patch: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', userId).select(PROFILE_COLUMNS).single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}
