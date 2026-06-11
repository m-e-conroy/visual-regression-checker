import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected routes (everything except login, api auth routes, and static assets)
const isProtectedRoute = (path: string) => {
  if (path.startsWith('/_next') || path.startsWith('/favicon.ico')) return false;
  if (path.startsWith('/api/auth') || path.startsWith('/api/image')) return false;
  if (path === '/login') return false;
  return true;
};

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isProtectedRoute(path)) {
    const token = request.cookies.get('vrc_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Need to use the secret from environment since Prisma isn't Edge compatible
      // For now, just verifying the token format is valid. The actual API routes 
      // Do strict validation against the DB's AppSettings.
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');
      await jwtVerify(token, secret);
    } catch (error) {
      // Token is invalid or expired
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('vrc_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
