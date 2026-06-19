import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export async function POST(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const now = new Date();
  await prisma.session.update({
    where: { id: params.sessionId },
    data: { deletedAt: now },
  });
  // Soft-delete linked records
  await prisma.transcript.deleteMany({ where: { sessionId: params.sessionId } });
  await prisma.cvSignal.deleteMany({ where: { sessionId: params.sessionId } });
  return NextResponse.json({ ok: true, deletedAt: now.toISOString() });
}
