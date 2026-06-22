'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export function ConsentBanner() {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  if (!open) return null;
  return (
    <div className="bg-(--color-brand) text-(--color-brand-fg) text-sm px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong>DPDP Notice:</strong> We collect video, audio, and location data to process your
          loan application per RBI guidelines. Data is retained for 5 years.{' '}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="underline font-medium"
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Learn more'}
          </button>
        </div>
        <button onClick={() => setOpen(false)} className="flex-shrink-0" aria-label="Dismiss notice">
          <X size={16} />
        </button>
      </div>
      {expanded && (
        <ul className="mt-2 list-disc pl-5 space-y-1 text-(--color-brand-fg)/90 max-w-3xl">
          <li>Purpose: identity verification (RBI Video-KYC) and credit assessment for your loan application.</li>
          <li>Data collected: video and audio of the interview, captured ID document images, device and location signals.</li>
          <li>Legal basis: your explicit consent under the Digital Personal Data Protection Act, 2023.</li>
          <li>Retention: kept for 5 years per RBI lending records requirements, then deleted.</li>
          <li>Your rights: withdraw consent and request erasure at any time from the consent screen (right to be forgotten).</li>
        </ul>
      )}
    </div>
  );
}
