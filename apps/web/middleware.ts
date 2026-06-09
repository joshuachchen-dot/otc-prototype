import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED: Record<string, string[]> = {
  '/investor': ['investor', 'manager'],
  '/manager':  ['manager'],
  '/auditor':  ['auditor', 'manager'],
  '/market':   ['investor', 'manager', 'auditor'],
  '/otc':      ['manager'],
};

// Must read the same env var and fallback as apps/web/lib/auth.ts so both
// sign and verify with the same key.
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'archon-dev-secret-do-not-use-in-production'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedRoles = Object.entries(PROTECTED).find(([route]) =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!protectedRoles) return NextResponse.next();

  const [, allowedRoles] = protectedRoles;
  const token = req.cookies.get('archon_session')?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (!allowedRoles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/investor/:path*', '/manager/:path*', '/auditor/:path*', '/market/:path*', '/otc/:path*'],
};
