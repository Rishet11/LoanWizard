'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

const FEATURES = ['monthly_income', 'loan_amount_requested', 'avg_liveness'];

interface DriftStats {
  feature: string;
  n: number;
  mean: number;
  std: number;
  p50: number;
  p99: number;
  source?: string;
}

interface DriftData {
  feature: string;
  baseline: DriftStats | null;
  production: DriftStats | null;
  mean_shift: number | null;
  status: 'ok' | 'awaiting_samples';
}

export default function DriftPage() {
  const [feature, setFeature] = useState(FEATURES[0]);
  const [data, setData] = useState<DriftData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setData(null);
    fetch(`/api/admin/drift/${feature}`)
      .then((r) => {
        if (!r.ok) throw new Error('Drift data unavailable');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Drift data is not available for this feature yet.'));
  }, [feature]);

  const chartData = data?.baseline
    ? ['mean', 'std', 'p50', 'p99'].map((metric) => ({
        metric,
        baseline: +((data.baseline as DriftStats)[metric as keyof DriftStats] as number).toFixed(3),
        production: data.production
          ? +((data.production as DriftStats)[metric as keyof DriftStats] as number).toFixed(3)
          : null,
      }))
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-(--color-fg)">Feature Drift</h1>
        <select
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          className="text-sm border border-(--color-muted)/20 rounded-[var(--radius-md)] px-3 py-1.5 bg-(--color-surface) text-(--color-fg)"
          aria-label="Select feature"
        >
          {FEATURES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-4 py-3 mb-6 text-sm text-amber-800">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-(--color-muted)">
              Mean shift: <strong className="text-(--color-fg)">{data.mean_shift == null ? 'n/a' : data.mean_shift.toFixed(3)}</strong>
            </span>
            <Badge variant={data.status === 'awaiting_samples' ? 'warn' : data.mean_shift != null && data.mean_shift > 1 ? 'warn' : 'success'}>
              {data.status === 'awaiting_samples' ? 'Awaiting production samples' : data.mean_shift != null && data.mean_shift > 1 ? 'Shift detected' : 'Stable'}
            </Badge>
          </div>
          <Card>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="baseline" fill="#0a2540" name="Training baseline" />
                  <Bar dataKey="production" fill="#f59e0b" name="Production window" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          {data.production && (
            <p className="text-xs text-(--color-muted) mt-3">
              Production window: {data.production.n} sample{data.production.n === 1 ? '' : 's'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
