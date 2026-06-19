'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, MessageSquare, PhoneOff, StickyNote } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/cn';

interface Transcript { speaker: string; text: string; timestamp: string; }
interface CvSignal { livenessScore: number; facePresent: boolean; ageEstimate: number | null; }
interface FormField { field: string; value: unknown; }

export default function CopilotPage({ params }: { params: { id: string } }) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [latestCv, setLatestCv] = useState<CvSignal | null>(null);
  const [formFields, setFormFields] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');
  const [connected, setConnected] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/session/${params.id}/stream`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'transcript_turn') {
          setTranscripts((t) => [...t, event.payload]);
        } else if (event.type === 'cv_signal') {
          setLatestCv(event.payload);
        } else if (event.type === 'form_field_extracted') {
          setFormFields((f) => ({ ...f, [event.payload.field]: event.payload.value }));
        }
      } catch {}
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [params.id]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  async function saveNotes() {
    await fetch(`/api/admin/sessions/${params.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agentNotes: notes }),
    });
  }

  async function flagSession() {
    setFlagged(true);
    await fetch(`/api/session/${params.id}/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'flag', payload: { reason: 'agent_flag', timestamp: new Date().toISOString() } }),
    });
  }

  return (
    <div className="min-h-screen bg-(--color-bg) p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-(--color-fg)">Agent Co-pilot</h1>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')} aria-hidden="true" />
          <span className="text-xs text-(--color-muted)">{connected ? 'Live' : 'Reconnecting…'}</span>
          <span className="text-xs font-mono text-(--color-muted) ml-2">{params.id.slice(0, 12)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Form + CV */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><p className="font-semibold text-sm text-(--color-fg)">Extracted Form</p></CardHeader>
            <CardBody>
              {Object.entries(formFields).length === 0
                ? <p className="text-xs text-(--color-muted)">Awaiting extraction…</p>
                : Object.entries(formFields).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b border-(--color-muted)/10 last:border-0">
                      <span className="text-(--color-muted) capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-(--color-fg)">{String(v)}</span>
                    </div>
                  ))}
            </CardBody>
          </Card>

          {latestCv && (
            <Card>
              <CardHeader><p className="font-semibold text-sm text-(--color-fg)">CV Signals</p></CardHeader>
              <CardBody>
                <SignalRow label="Liveness" value={`${Math.round(latestCv.livenessScore * 100)}%`} ok={latestCv.livenessScore > 0.7} />
                <SignalRow label="Face" value={latestCv.facePresent ? 'Detected' : 'Missing'} ok={latestCv.facePresent} />
                <SignalRow label="Est. Age" value={latestCv.ageEstimate ? `~${Math.round(latestCv.ageEstimate)}` : '—'} ok={!!latestCv.ageEstimate} />
              </CardBody>
            </Card>
          )}
        </div>

        {/* Column 2: Transcript */}
        <Card className="flex flex-col">
          <CardHeader><p className="font-semibold text-sm text-(--color-fg)">Live Transcript</p></CardHeader>
          <CardBody className="flex-1 overflow-y-auto max-h-96 flex flex-col gap-2">
            {transcripts.map((t, i) => (
              <div key={i} className={cn('text-xs px-3 py-2 rounded-[var(--radius-md)] max-w-[85%]', t.speaker === 'agent' ? 'bg-(--color-muted)/10 self-start' : 'bg-(--color-brand)/10 self-end')}>
                <p className="font-semibold capitalize text-(--color-fg) mb-0.5">{t.speaker}</p>
                <p className="text-(--color-muted)">{t.text}</p>
              </div>
            ))}
            {transcripts.length === 0 && <p className="text-xs text-(--color-muted)">Waiting for conversation…</p>}
            <div ref={transcriptEndRef} />
          </CardBody>
        </Card>

        {/* Column 3: Actions */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><p className="font-semibold text-sm text-(--color-fg)">Agent Actions</p></CardHeader>
            <CardBody className="flex flex-col gap-3">
              <Button
                variant={flagged ? 'secondary' : 'danger'}
                size="sm"
                onClick={flagSession}
                disabled={flagged}
                className="w-full"
                aria-label="Flag this session"
              >
                <Flag size={14} aria-hidden="true" /> {flagged ? 'Flagged' : 'Flag session'}
              </Button>
              <Button variant="secondary" size="sm" className="w-full" aria-label="Interject (stub)">
                <MessageSquare size={14} aria-hidden="true" /> Interject (stub)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-(--color-danger)"
                onClick={() => router.push(`/session/${params.id}/processing`)}
                aria-label="End call"
              >
                <PhoneOff size={14} aria-hidden="true" /> End call
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><p className="font-semibold text-sm text-(--color-fg)">Notes</p></CardHeader>
            <CardBody>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Agent notes…"
                className="w-full text-sm bg-(--color-bg) border border-(--color-muted)/20 rounded-[var(--radius-sm)] p-2 text-(--color-fg) resize-none focus:outline-none focus:border-(--color-brand)"
                aria-label="Agent notes"
              />
              <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={saveNotes}>
                <StickyNote size={12} aria-hidden="true" /> Save notes
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-(--color-muted)/10 last:border-0">
      <span className="text-(--color-muted)">{label}</span>
      <span className={cn('font-medium', ok ? 'text-green-600' : 'text-red-600')}>{value}</span>
    </div>
  );
}
