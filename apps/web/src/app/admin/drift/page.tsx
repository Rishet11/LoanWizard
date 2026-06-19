'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

const FEATURES = ['monthly_income', 'loan_amount_requested', 'age_estimate', 'liveness_score'];

export default function DriftPage() {
  const [feature, setFeature] = useState(FEATURES[0]);
  const [data, setData] = useState<{ feature: string; baseline: Array<{ bucket: number; value: number }>; production: Array<{ bucket: number; value: number }>; psi: number } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/drift/${feature}`)
      .then((r) => r.json())
      .then(setData);
  }, [feature]);

  const chartData = data
    ? data.baseline.map((b, i) => ({ bucket: b.bucket, baseline: +b.value.toFixed(3), production: +(data.production[i]?.value ?? 0).toFixed(3) }))
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

      {data && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-(--color-muted)">PSI: <strong className="text-(--color-fg)">{data.psi.toFixed(3)}</strong></span>
            <Badge variant={data.psi > 0.1 ? 'warn' : 'success'}>{data.psi > 0.1 ? 'Drift detected' : 'Stable'}</Badge>
          </div>
          <Card>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="baseline" fill="#0a2540" name="Baseline" />
                  <Bar dataKey="production" fill="#f59e0b" name="Production" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
