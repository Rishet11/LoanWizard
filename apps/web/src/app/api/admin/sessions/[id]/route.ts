import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { prisma } from '../../../../../lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      transcripts: { orderBy: { timestamp: 'asc' } },
      cvSignals: { orderBy: { timestamp: 'asc' }, take: 200 },
      consentRecords: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { agentNotes } = await req.json();
  const updated = await prisma.session.update({ where: { id: params.id }, data: { agentNotes } });
  return NextResponse.json(updated);
}
