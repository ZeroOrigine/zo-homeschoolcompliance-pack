// CANONICAL: GET /api/billing/status -> { data: { paid, plan_key, paid_at } } for the signed-in user.
// The central payments webhook writes homeschoolcompliancepack_payments; this route only reads it.
// rate-limit-exempt: authenticated read-only lookup, no writes and no external spend.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { data: null, error: 'Billing status is not available right now. Please try again soon.' },
      { status: 503 }
    )
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {}
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ data: null, error: 'Please sign in to see your purchase status.' }, { status: 401 })
  }

  const { data: payment, error: paymentError } = await supabase
    .from('homeschoolcompliancepack_payments')
    .select('plan_key, paid_at')
    .eq('user_id', user.id)
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (paymentError) {
    return NextResponse.json(
      { data: null, error: 'We could not check your purchase just now. Please try again in a moment.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: {
      paid: Boolean(payment),
      plan_key: payment?.plan_key ?? null,
      paid_at: payment?.paid_at ?? null,
    },
    error: null,
  })
}
