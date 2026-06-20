import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminLogin, createAdminSessionToken } from '../../../../lib/admin-auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== 'string' || !(await adminLogin(password))) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    path: '/',
    maxAge: 86400 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
