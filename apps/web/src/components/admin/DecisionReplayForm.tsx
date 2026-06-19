'use client';
import { useState } from 'react';
import type { Offer } from '@loan-wizard/contracts';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function DecisionReplayForm({ sessionId, originalOffer }: { sessionId: string; originalOffer: Offer }) {
  const [income, setIncome] = useState('');
  const [loanAmt, setLoanAmt] = useState('');
  const [result, setResult] = useState<{ original: Offer; replayed: Offer } | null>(null);
  const [loading, setLoading] = useState(false);

  async function replay() {
    setLoading(true);
    const body: Record<string, unknown> = {};
    if (income) body.monthly_income = parseInt(income, 10);
    if (loanAmt) body.loan_amount_requested = parseInt(loanAmt, 10);
    const res = await fetch(`/api/admin/sessions/${sessionId}/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><p className="font-semibold text-sm">Replay with overrides</p></CardHeader>
      <CardBody>
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-xs text-(--color-muted) block mb-1">Monthly income (INR)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder={String(originalOffer.amount ?? '')}
              className="w-full px-3 py-1.5 text-sm border border-(--color-muted)/20 rounded-[var(--radius-sm)] bg-(--color-bg) text-(--color-fg) focus:outline-none focus:border-(--color-brand)"
            />
          </div>
          <div>
            <label className="text-xs text-(--color-muted) block mb-1">Loan amount requested (INR)</label>
            <input
              type="number"
              value={loanAmt}
              onChange={(e) => setLoanAmt(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-(--color-muted)/20 rounded-[var(--radius-sm)] bg-(--color-bg) text-(--color-fg) focus:outline-none focus:border-(--color-brand)"
            />
          </div>
        </div>
        <Button size="sm" loading={loading} onClick={replay} className="w-full">Run replay</Button>

        {result && (
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold text-(--color-fg)">Comparison</p>
            <DiffRow label="Amount" orig={INR.format(result.original.amount!)} rep={INR.format(result.replayed.amount!)} />
            <DiffRow label="Rate" orig={`${result.original.interest_rate}%`} rep={`${result.replayed.interest_rate}%`} />
            <DiffRow label="Risk" orig={result.original.risk_band} rep={result.replayed.risk_band} />
            <DiffRow label="Eligible" orig={String(result.original.eligible)} rep={String(result.replayed.eligible)} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DiffRow({ label, orig, rep }: { label: string; orig: string; rep: string }) {
  const changed = orig !== rep;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-(--color-muted)">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-(--color-muted) line-through">{orig}</span>
        <span className={changed ? 'text-(--color-warn) font-semibold' : 'text-(--color-fg)'}>{rep}</span>
        {changed && <Badge variant="warn">Δ</Badge>}
      </span>
    </div>
  );
}
