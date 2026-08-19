// CANONICAL: POST /api/auth/signout ends the session and returns home. Works as a plain <form method="post"> action.
// rate-limit-exempt: session-scoped idempotent action (the documented signout exemption).
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && anonKey) {
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
    try {
      await supabase.auth.signOut()
    } catch {
      // an already-dead session still deserves a clean exit
    }
  }
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
