import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '../../../../lib/admin-auth';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url));
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
