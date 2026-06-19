import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.session.update({
    where: { id: params.id },
    data: { status: 'processing', endedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
