import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE = 'admin_session';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

export function isAdminAuthed(req: NextRequest): boolean {
  return req.cookies.get(COOKIE)?.value === PASSWORD;
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function adminLogin(password: string): Promise<boolean> {
  return password === PASSWORD;
}

export { COOKIE as ADMIN_COOKIE };
