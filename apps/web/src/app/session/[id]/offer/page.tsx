'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Offer } from '@loan-wizard/contracts';
import { OfferCard } from '../../../../components/OfferCard';
import { ESignModal } from '../../../../components/offer/ESignModal';
import { Spinner } from '../../../../components/ui/Spinner';

export default function OfferPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showKfs, setShowKfs] = useState(false);
  const [showESign, setShowESign] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`offer_${params.id}`);
      if (stored) { setOffer(JSON.parse(stored)); return; }
    } catch {}
    fetch(`/api/session/${params.id}/offer`)
      .then((r) => r.ok ? r.json() : null)
      .then((o) => { if (o) setOffer(o); })
      .catch(() => {});
  }, [params.id]);

  if (!offer) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-10 h-10" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-(--color-bg)">
      <h1 className="text-2xl font-bold text-(--color-fg) mb-8 text-center">Your personalised offer is ready</h1>

      <OfferCard
        offer={offer}
        onAccept={() => setShowESign(true)}
        onDecline={() => router.push('/')}
      />

      <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
        <button
          onClick={() => setShowKfs(true)}
          className="text-sm underline text-(--color-muted) hover:text-(--color-fg) transition-colors"
        >
          View Key Fact Statement (RBI required)
        </button>
        {offer.model_versions && (
          <span className="text-xs text-(--color-muted)/60 font-mono">
            risk v{offer.model_versions.risk} · fraud v{offer.model_versions.fraud}
          </span>
        )}
      </div>

      {showKfs && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowKfs(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Key Fact Statement"
        >
          <div className="bg-(--color-surface) rounded-[var(--radius-xl)] max-w-md w-full p-8 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-(--color-fg) mb-4">Key Fact Statement</h2>
            <table className="w-full text-sm">
              <tbody>
                <KfsRow label="Loan Amount" value={`₹${offer.amount?.toLocaleString('en-IN')}`} />
                <KfsRow label="Interest Rate" value={`${offer.interest_rate}% p.a. (fixed)`} />
                <KfsRow label="Tenure" value={`${offer.tenure_months} months`} />
                <KfsRow label="Monthly EMI" value={`₹${offer.emi?.toLocaleString('en-IN')}`} />
                <KfsRow label="Processing Fee" value="1% of loan amount" />
                <KfsRow label="Prepayment Charges" value="Nil after 12 months" />
              </tbody>
            </table>
            <button onClick={() => setShowKfs(false)} className="mt-6 w-full bg-(--color-brand) text-(--color-brand-fg) py-2 rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity">
              Close
            </button>
          </div>
        </div>
      )}

      <ESignModal
        open={showESign}
        onClose={() => setShowESign(false)}
        sessionId={params.id}
        onAccepted={() => router.push(`/session/${params.id}/accepted`)}
      />
    </div>
  );
}

function KfsRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-(--color-muted)/10">
      <td className="py-2 text-(--color-muted)">{label}</td>
      <td className="py-2 font-medium text-right text-(--color-fg)">{value}</td>
    </tr>
  );
}
