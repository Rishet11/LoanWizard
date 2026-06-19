'use client';
import { useState } from 'react';
import type { Offer } from '@loan-wizard/contracts';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { TrustMeter } from './offer/TrustMeter';
import { cn } from '../lib/cn';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const riskBadgeVariant = { low: 'success', medium: 'warn', high: 'danger' } as const;

export function OfferCard({ offer, onAccept, onDecline }: {
  offer: Offer;
  onAccept: () => void;
  onDecline?: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  if (!offer.eligible) {
    return (
      <div className="bg-(--color-surface) rounded-[var(--radius-xl)] shadow-lg p-8 text-center max-w-md mx-auto border border-(--color-muted)/10">
        <p className="text-xl font-semibold text-(--color-danger) mb-2">We cannot offer a loan at this time</p>
        <p className="text-(--color-muted)">{offer.rejection_reason ?? 'You do not meet the current eligibility criteria.'}</p>
      </div>
    );
  }

  // fraud_score may come from v4 ML — default 0.1 if not present
  const fraudScore = (offer as { fraud_score?: number }).fraud_score ?? 0.1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-(--color-surface) rounded-[var(--radius-xl)] shadow-xl p-8 max-w-md mx-auto border border-(--color-muted)/10"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-(--color-fg) font-medium">You are eligible for</p>
        <Badge variant={riskBadgeVariant[offer.risk_band]}>{offer.risk_band} risk</Badge>
      </div>

      <p className="text-5xl font-bold text-(--color-accent) mb-1">{INR.format(offer.amount!)}</p>
      <p className="text-(--color-muted) mb-1">
        at <strong className="text-(--color-fg)">{offer.interest_rate}% p.a.</strong> for <strong className="text-(--color-fg)">{offer.tenure_months} months</strong>
      </p>
      <p className="text-(--color-muted) mb-4">
        EMI: <strong className="text-(--color-fg) text-lg">{INR.format(offer.emi!)} / month</strong>
      </p>

      {/* Trust meter */}
      <div className="mb-5">
        <TrustMeter fraudScore={fraudScore} />
      </div>

      {/* Reason narrative if present */}
      {(offer as { reason_narrative?: string }).reason_narrative && (
        <p className="text-sm text-(--color-muted) italic mb-4 border-l-2 border-(--color-accent) pl-3">
          "{(offer as { reason_narrative?: string }).reason_narrative}"
        </p>
      )}

      <button
        onClick={() => setShowWhy(!showWhy)}
        className="flex items-center gap-1 text-sm text-(--color-brand) mb-4 hover:underline"
        aria-expanded={showWhy}
      >
        {showWhy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Why this offer?
      </button>

      {showWhy && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-5 overflow-hidden"
        >
          <div className="flex flex-col gap-3">
            {offer.reason_codes.map((rc) => (
              <div key={rc.code}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-(--color-fg)">{rc.label}</span>
                  <span className="text-(--color-muted) font-mono text-xs">{Math.round(rc.weight * 100)}%</span>
                </div>
                <div className="w-full bg-(--color-muted)/15 rounded-full h-1.5">
                  <div className="bg-(--color-accent) h-1.5 rounded-full" style={{ width: `${Math.round(rc.weight * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" className="w-full" onClick={onAccept} aria-label="Accept offer">
          Accept this offer
        </Button>
        {onDecline && (
          <Button size="md" variant="ghost" className="w-full" onClick={onDecline} aria-label="Decline offer">
            Decline
          </Button>
        )}
      </div>
    </motion.div>
  );
}
