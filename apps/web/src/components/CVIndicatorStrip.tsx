'use client';
import type { CVSignal } from '@loan-wizard/contracts';
import clsx from 'clsx';

export function CVIndicatorStrip({ signal }: { signal: CVSignal | null }) {
  const face = signal?.face_present ?? false;
  const liveness = signal?.liveness_score ?? 0;
  const age = signal?.age_estimate;

  return (
    <div className="flex gap-4 text-sm px-4 py-2 bg-white border-t border-gray-200">
      <Indicator label="Face" ok={face} text={face ? 'Detected' : 'Not detected'} />
      <Indicator label="Liveness" ok={liveness > 0.7} text={`${Math.round(liveness * 100)}%`} />
      <Indicator label="Est. Age" ok={age !== null && age !== undefined} text={age ? `~${Math.round(age)}` : '—'} />
    </div>
  );
}

function Indicator({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={clsx('w-2 h-2 rounded-full', ok ? 'bg-green-500' : 'bg-red-500')}
      />
      <span className="text-gray-500">{label}:</span>
      <span className={clsx('font-medium', ok ? 'text-gray-800' : 'text-red-600')}>{text}</span>
    </span>
  );
}
