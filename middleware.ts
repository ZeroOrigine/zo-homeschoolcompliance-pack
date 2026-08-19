// CANONICAL: Supabase session refresh + route protection for HomeschoolCompliance Pack.
// Reminder delivery is platform-dispatcher-owned (X7) — no product cron route exists,
// /api/states and /api/plans allowlisted (public catalog reads backed by public RLS),
// explicit same-origin CORS posture with preflight handling, dashboard pages added to redirects.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PAGE_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/account',
  '/settings',
  '/calendar',
  '/documents',
  '/students',
  '/billing',
]
// /api/zo is the beacon collector (Law #197), /api/auth handles its own sessions,
// /api/webhooks is reserved by spec
// (the platform scheduler has no browser session), and /api/states + /api/plans are
// public catalog reads backed by anon-readable RLS policies.
const PUBLIC_API_PREFIXES = ['/api/zo', '/api/webhooks', '/api/auth', '/api/states', '/api/plans']
const AUTH_ONLY_PAGES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Explicit CORS posture: same-origin only. Preflights are answered here; foreign
  // origins never receive an Access-Control-Allow-Origin header, so cross-origin
  // reads stay blocked by the browser. Deny-by-default, stated deliberately.
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const headers = new Headers({
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    })
    if (origin && origin === request.nextUrl.origin) {
      headers.set('Access-Control-Allow-Origin', origin)
    }
    return new NextResponse(null, { status: 204, headers })
  }

  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return response

  // Public API prefixes skip session work entirely: their handlers enforce their
  // own auth or are intentionally public reads.
  if (
    pathname.startsWith('/api/') &&
    PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
  ) {
    return response
  }

  // QA-019 (auth_flow): the getAll/setAll adapter below is the canonical
  // @supabase/ssr cookie interface this app standardizes on. Do not regress this
  // block to the deprecated per-cookie get/set/remove adapter — that shape is
  // removed in the next @supabase/ssr major.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to use this endpoint.', code: 'unauthorized' },
        { status: 401 }
      )
    }
    return response
  }

  const needsAuth = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    // Canonical @supabase/ssr cookie handling: a new response object (this redirect)
    // must carry any auth cookies setAll wrote during getUser(), or a mid-request
    // token refresh / cookie clear is silently dropped and the session desyncs.
    const loginRedirect = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((cookie) => loginRedirect.cookies.set(cookie))
    return loginRedirect
  }

  if (user && AUTH_ONLY_PAGES.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    const dashboardRedirect = NextResponse.redirect(dashboardUrl)
    response.cookies.getAll().forEach((cookie) => dashboardRedirect.cookies.set(cookie))
    return dashboardRedirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|txt|xml)$).*)',
  ],
}
