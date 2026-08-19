// CANONICAL: central-payments checkout. POST {} or { plan_key } -> { data: { url } }; the browser navigates to url.
// This product holds no Stripe key: the central proxy at PAYMENTS_URL owns the account and the webhook.
// PATCHED: success/cancel/already-owned URLs now land on /billing, the only page that renders checkout banners.
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { rateLimitCheck, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'homeschoolcompliancepack'

export async function POST(request: NextRequest) {
  const verdict = await rateLimitCheck(`${PRODUCT_SLUG}_billing`, clientIp(request), 20, 1000)
  if (!verdict.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests for today. The counter resets tomorrow.' },
      { status: 429 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const paymentsUrl = process.env.PAYMENTS_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!supabaseUrl || !anonKey || !paymentsUrl || !proxyToken) {
    return NextResponse.json(
      { data: null, error: 'Checkout is not available right now. Nothing was charged. Please try again soon.' },
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
    return NextResponse.json(
      { data: null, error: 'Please sign in to buy the Compliance Pack.' },
      { status: 401 }
    )
  }

  let planKey = 'complete'
  try {
    const body = await request.json()
    if (body && typeof body.plan_key === 'string' && body.plan_key.length <= 64) planKey = body.plan_key
  } catch {
    // empty body defaults to the single paid plan
  }

  const { data: plan, error: planError } = await supabase
    .from('homeschoolcompliancepack_plans')
    .select('key, name, price_cents, currency, plan_interval, is_active')
    .eq('key', planKey)
    .eq('is_active', true)
    .maybeSingle()

  if (planError || !plan) {
    return NextResponse.json(
      { data: null, error: 'We could not find that plan. Refresh the page and try again.' },
      { status: 400 }
    )
  }
  if (plan.price_cents === 0) {
    return NextResponse.json(
      { data: null, error: 'The free preview does not need checkout. Sign in and pick your state to start.' },
      { status: 400 }
    )
  }

  // One-time product: never send the same account to checkout twice.
  const { data: paid } = await supabase
    .from('homeschoolcompliancepack_payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'succeeded')
    .limit(1)
  if (paid && paid.length > 0) {
    return NextResponse.json({ data: { url: '/billing?checkout=already-owned', already_purchased: true }, error: null })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  let proxyResponse: Response
  try {
    proxyResponse = await fetch(paymentsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      cache: 'no-store',
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        user_id: user.id,
        price_id: plan.key,
        plan_key: plan.key,
        plan_name: plan.name,
        amount_cents: plan.price_cents,
        currency: plan.currency,
        interval: plan.plan_interval,
        customer_email: user.email,
        success_url: `${siteUrl}/billing?checkout=success`,
        cancel_url: `${siteUrl}/billing?checkout=canceled`,
        metadata: { product: PRODUCT_SLUG, user_id: user.id, plan_key: plan.key },
      }),
    })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Our payment service did not answer. Nothing was charged. Please try again in a minute.' },
      { status: 502 }
    )
  }

  if (!proxyResponse.ok) {
    return NextResponse.json(
      { data: null, error: 'Checkout could not start. Nothing was charged. Please try again in a minute.' },
      { status: 502 }
    )
  }

  let payload: { url?: unknown } = {}
  try {
    payload = await proxyResponse.json()
  } catch {}
  const url = typeof payload.url === 'string' && payload.url.startsWith('https://') ? payload.url : null
  if (!url) {
    return NextResponse.json(
      { data: null, error: 'Checkout could not start. Nothing was charged. Please try again in a minute.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ data: { url }, error: null })
}
