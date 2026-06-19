'use client';
import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';

type EventType = 'all' | 'transcript' | 'cv' | 'consent';

export function SessionTimeline({ session }: { session: { transcripts: Array<{ speaker: string; text: string; timestamp: string; turnIdx: number }>; cvSignals: Array<{ timestamp: string; livenessScore: number; facePresent: boolean }>; consentRecords: Array<{ id: string; consentType: string; verbalText: string; timestamp: string }> } }) {
  const [filter, setFilter] = useState<EventType>('all');

  const all: Array<{ ts: string; type: string; label: string; color: string }> = [
    ...session.transcripts.map(t => ({ ts: t.timestamp, type: 'transcript', label: `[${t.speaker}] ${t.text}`, color: t.speaker === 'agent' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800' })),
    ...session.cvSignals.map(cv => ({ ts: cv.timestamp, type: 'cv', label: `Liveness ${Math.round(cv.livenessScore * 100)}% · Face: ${cv.facePresent ? 'yes' : 'no'}`, color: 'bg-gray-100 text-gray-700' })),
    ...session.consentRecords.map(c => ({ ts: c.timestamp, type: 'consent', label: `[consent:${c.consentType}] "${c.verbalText.slice(0, 60)}…"`, color: 'bg-green-100 text-green-800' })),
  ].sort((a, b) => a.ts.localeCompare(b.ts));

  const filtered = filter === 'all' ? all : all.filter(e => e.type === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filter events">
        {(['all', 'transcript', 'cv', 'consent'] as EventType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-3 py-1 text-xs rounded-full border transition-colors capitalize', filter === f ? 'bg-(--color-brand) text-(--color-brand-fg) border-transparent' : 'border-(--color-muted)/20 text-(--color-muted) hover:text-(--color-fg)')}
            aria-pressed={filter === f}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {filtered.map((e, i) => (
          <div key={i} className="flex gap-3 text-xs">
            <span className="text-(--color-muted) font-mono w-20 flex-shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', e.color)}>{e.label}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-(--color-muted) text-sm">No events for this filter.</p>}
      </div>
    </div>
  );
}
