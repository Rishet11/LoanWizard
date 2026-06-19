import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.redirect(new URL('/admin/login', 'http://localhost'));
  res.cookies.delete('admin_session');
  return res;
}
