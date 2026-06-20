import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE = 'admin_session';
const COOKIE_PAYLOAD = 'loanwizard-admin-session-v1';

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required in production');
  }
  return 'admin123';
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminSessionToken(): string {
  return createHmac('sha256', getAdminPassword()).update(COOKIE_PAYLOAD).digest('hex');
}

export function isAdminSessionToken(value: string | undefined): boolean {
  if (!value) return false;
  return safeEqual(value, createAdminSessionToken());
}

export function isAdminAuthed(req: NextRequest): boolean {
  return isAdminSessionToken(req.cookies.get(COOKIE)?.value);
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function adminLogin(password: string): Promise<boolean> {
  return safeEqual(password, getAdminPassword());
}

export { COOKIE as ADMIN_COOKIE };
