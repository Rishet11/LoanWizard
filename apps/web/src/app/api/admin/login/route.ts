import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const COOKIE = 'admin_session';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, PASSWORD, { httpOnly: true, path: '/', maxAge: 86400 * 7 });
  return res;
}
