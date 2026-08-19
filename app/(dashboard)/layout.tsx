// CANONICAL: authenticated layout for all dashboard routes.
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileForRender } from '@/lib/db/profiles';
import { hasCompleteAccess } from '@/lib/db/entitlement';
import DashboardShell from '@/components/dashboard-shell';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  // #QA-050: load profile + entitlement concurrently (one parallel pass, no
  // waterfall). BOTH loaders are React cache()-memoized on scalar keys, so a
  // descendant Server Component (dashboard/page.tsx) re-requesting either in
  // this same render pass reuses these results instead of re-hitting the DB.
  const [profile, paid] = await Promise.all([
    getProfileForRender(data.user.id, data.user.email ?? null),
    hasCompleteAccess(data.user.id).catch(() => false),
  ]);
  const fullName = profile?.full_name ?? '';
  return (
    <DashboardShell email={data.user.email ?? ''} fullName={fullName} paid={paid}>
      {children}
    </DashboardShell>
  );
}
