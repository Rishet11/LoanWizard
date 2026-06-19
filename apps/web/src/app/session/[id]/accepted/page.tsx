'use client';
import { CheckCircle, Download } from 'lucide-react';

export default function AcceptedPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <CheckCircle size={64} className="text-(--color-success) mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-(--color-brand) mb-2">You are all set!</h1>
        <p className="text-gray-600 mb-6">
          Our team will verify your details and reach out within 24 hours.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-left">
          <p className="text-gray-500 mb-1">Session Reference</p>
          <p className="font-mono font-medium text-(--color-brand) break-all">{params.id}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900 text-left">
          <strong>Cool-off Period:</strong> You have a 3-day cool-off period per RBI digital
          lending guidelines. You may cancel this application within this period without penalty.
        </div>

        <button
          className="flex items-center justify-center gap-2 w-full border border-(--color-brand) text-(--color-brand) py-3 rounded-xl font-medium hover:bg-(--color-brand) hover:text-white transition-colors"
          onClick={() => alert('KFS download — integration pending')}
        >
          <Download size={18} />
          Download Key Fact Statement
        </button>
      </div>
    </div>
  );
}
