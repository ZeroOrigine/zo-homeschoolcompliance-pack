import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicRoutes = [
  '/',
  '/pricing',
  '/maintenance',
];

const publicPrefixes = [
  '/auth/',
  '/api/stripe/webhook',
  '/api/health',
  // #219 P1: THE BEACON COLLECTOR MUST BE PUBLIC.
  //
  // This route was protected like every other /api/* path, so an unauthenticated
  // POST got 401 — and a `signup` event happens at the exact moment the visitor
  // does NOT yet have a session. That is why zero signup events and zero
  // activation events had EVER been recorded across fifteen products: the one
  // number that decides whether a product lives was behind a login.
  //
  // Making it public leaks nothing: the route accepts only the three service
  // event names, derives the slug from server env (never from the caller), and
  // strips query strings before writing. There is no read path.
  '/api/zo-event',
];

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Protect /dashboard/* routes
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
