'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export function ConsentBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="bg-(--color-brand) text-(--color-brand-fg) text-sm px-4 py-3 flex items-center justify-between">
      <span>
        <strong>DPDP Notice:</strong> We collect video, audio, and location data to process your
        loan application per RBI guidelines. Data is retained for 5 years.{' '}
        <a href="#" className="underline">
          Learn more
        </a>
      </span>
      <button onClick={() => setOpen(false)} className="ml-4 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
