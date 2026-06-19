'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';

interface GroupStat { group: string; approval_rate: number; disparate_impact_ratio: number; }
interface FairnessData { by_employment: GroupStat[]; by_age_bucket: GroupStat[]; flagged: boolean; }

export default function FairnessPage() {
  const [data, setData] = useState<FairnessData | null>(null);

  useEffect(() => {
    fetch('/api/admin/fairness').then((r) => r.json()).then(setData);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-(--color-fg) mb-2">Fairness Report</h1>
      {data?.flagged && (
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] px-4 py-3 mb-6 text-sm text-red-800">
          ⚠ One or more groups have disparate impact ratio &lt; 0.8. Review required.
        </div>
      )}

      {data && (
        <div className="grid md:grid-cols-2 gap-6">
          <GroupChart title="By Employment Type" data={data.by_employment} />
          <GroupChart title="By Age Bucket" data={data.by_age_bucket} />
        </div>
      )}
    </div>
  );
}

function GroupChart({ title, data }: { title: string; data: GroupStat[] }) {
  const chartData = data.map(d => ({ name: d.group, 'Approval Rate': Math.round(d.approval_rate * 100), 'DIR': +d.disparate_impact_ratio.toFixed(2) }));
  return (
    <Card>
      <CardHeader><p className="font-semibold text-sm text-(--color-fg)">{title}</p></CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '80%', fontSize: 10 }} />
            {chartData.map((d, i) => (
              <Bar key={i} dataKey="Approval Rate" fill={d['DIR'] < 0.8 ? '#ef4444' : '#10b981'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-col gap-1">
          {data.map(d => (
            <div key={d.group} className="flex justify-between text-xs text-(--color-muted)">
              <span className="capitalize">{d.group}</span>
              <span className={d.disparate_impact_ratio < 0.8 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                DIR: {d.disparate_impact_ratio.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
