import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/db';
import { initSession } from '../../../../lib/session-store';

const bodySchema = z.object({
  campaign_source: z.enum(['sms', 'whatsapp', 'email', 'direct']).default('direct'),
  device_user_agent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  const session = await prisma.session.create({
    data: {
      campaignSource: body.data.campaign_source,
      deviceUserAgent: body.data.device_user_agent ?? null,
      ipAddress: ip ?? null,
      status: 'init',
    },
  });

  initSession(session.id);

  return NextResponse.json({ session_id: session.id });
}
