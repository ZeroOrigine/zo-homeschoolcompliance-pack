// CANONICAL: paid access check for the one time Compliance Pack purchase.
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PRODUCT_ID } from '@/lib/db/constants';

// De-duplicates the access check within a single server render pass. React
// cache() keys on ARGUMENT IDENTITY, so the signature takes ONLY userId —
// the Supabase client is constructed inside (QA-049: passing per-call client
// instances defeated the memo and the entitlement query ran twice per render).
export const hasCompleteAccess = cache(_hasCompleteAccess);

async function _hasCompleteAccess(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: payments, error: paymentsError } = await supabase
    .from('homeschoolcompliancepack_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID)
    .eq('status', 'succeeded')
    .limit(1);
  if (paymentsError) throw new Error(paymentsError.message);
  if (payments && payments.length > 0) return true;
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('homeschoolcompliancepack_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', PRODUCT_ID)
    .in('status', ['active', 'trialing'])
    .limit(1);
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  return Boolean(subscriptions && subscriptions.length > 0);
}
