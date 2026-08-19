// CANONICAL: verifies Supabase email links (confirmation + recovery) at /auth/confirm.
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

// Law #116: signup is a purpose event, written server-side only and fail-soft.
async function emitSignupMetric() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await admin.from('homeschoolcompliancepack_zo_product_metrics').insert({
      product_slug: 'homeschoolcompliancepack',
      event: 'signup',
      path: '/auth/confirm',
    })
  } catch {
    // metrics must never break a confirmation
  }
}

// Tokens are single-use and verified by Supabase, which makes this GET self-limiting.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return redirectTo('/login?message=' + encodeURIComponent('Sign in is warming up. Please try again in a minute.'))
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
        } catch {
          // route handlers can set cookies; guard stays for safety
        }
      },
    },
  })

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      if (type === 'recovery') return redirectTo('/reset-password')
      if (type === 'signup' || type === 'email') await emitSignupMetric()
      return redirectTo(next)
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectTo(next)
  }

  // No token_hash and no code reached the SERVER — but implicit-flow links
  // carry the session in the URL FRAGMENT, which browsers re-attach across
  // this redirect. Forward recovery traffic to the reset page (its client
  // code consumes the fragment); only non-recovery traffic is truly dead here.
  if (type === 'recovery' || next === '/reset-password') {
    return redirectTo('/reset-password')
  }
  return redirectTo(
    '/login?message=' +
      encodeURIComponent('That link has expired or was already used. Sign in, or request a fresh link.')
  )
}
