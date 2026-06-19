import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Tenant routing: /t/[tenant] sets a cookie for theming
  const tenantMatch = req.nextUrl.pathname.match(/^\/t\/([^/]+)/);
  if (tenantMatch) {
    const tenant = tenantMatch[1];
    if (tenant === 'alpha' || tenant === 'beta') {
      res.cookies.set('tenant', tenant, { path: '/', maxAge: 86400 });
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
