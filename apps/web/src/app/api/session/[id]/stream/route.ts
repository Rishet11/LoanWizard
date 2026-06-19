import { NextRequest } from 'next/server';
import { subscribe } from '../../../../../lib/sse-broadcast';
import { prisma } from '../../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;

  // Verify session exists
  const session = await prisma.session.findUnique({ where: { id: sessionId } }).catch(() => null);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send a ping so client knows connection is live
      controller.enqueue(encoder.encode('event: ping\ndata: connected\n\n'));

      // Replay recent events from DB on connect
      Promise.all([
        prisma.transcript.findMany({ where: { sessionId }, orderBy: { timestamp: 'asc' }, take: 50 }),
        prisma.cvSignal.findMany({ where: { sessionId }, orderBy: { timestamp: 'desc' }, take: 10 }),
      ]).then(([transcripts, cvSignals]) => {
        for (const t of transcripts) {
          const data = JSON.stringify({ type: 'transcript_turn', payload: t });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        for (const cv of cvSignals) {
          const data = JSON.stringify({ type: 'cv_signal', payload: cv });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }).catch(() => {});

      const unsub = subscribe(sessionId, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          unsub();
        }
      });

      // Cleanup on close
      _req.signal.addEventListener('abort', () => {
        unsub();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
