import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const tenant = searchParams.get('tenant') ?? undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 20;

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (tenant) where.tenantId = tenant;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, createdAt: true, tenantId: true, declaredName: true,
        status: true, offerJson: true, campaignSource: true,
      },
    }),
    prisma.session.count({ where }),
  ]);

  return NextResponse.json({ sessions, total, page, pages: Math.ceil(total / limit) });
}
