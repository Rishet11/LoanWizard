'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';

const STATUS_VARIANT: Record<string, 'success' | 'warn' | 'danger' | 'muted' | 'default'> = {
  accepted: 'success', offered: 'default', rejected: 'danger',
  processing: 'warn', active: 'warn', init: 'muted', failed: 'danger',
};

interface Session {
  id: string; createdAt: string; tenantId: string; declaredName: string | null;
  status: string; offerJson: string | null; campaignSource: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    fetch(`/api/admin/sessions?${params}`)
      .then((r) => r.json())
      .then((d) => { setSessions(d.sessions ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [page, status]);

  const columns = [
    { key: 'id', header: 'Session ID', render: (r: Session) => <span className="font-mono text-xs">{r.id.slice(0, 10)}</span>, className: 'w-32' },
    { key: 'createdAt', header: 'Created', render: (r: Session) => new Date(r.createdAt).toLocaleString() },
    { key: 'tenantId', header: 'Tenant', render: (r: Session) => <Badge>{r.tenantId}</Badge> },
    { key: 'declaredName', header: 'Customer' },
    { key: 'status', header: 'Status', render: (r: Session) => <Badge variant={STATUS_VARIANT[r.status] ?? 'muted'}>{r.status}</Badge> },
    { key: 'campaign', header: 'Source', render: (r: Session) => r.campaignSource },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-(--color-fg)">Sessions <span className="text-(--color-muted) text-base font-normal">({total})</span></h1>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-(--color-muted)/20 rounded-[var(--radius-md)] px-3 py-1.5 bg-(--color-surface) text-(--color-fg)"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {['accepted', 'offered', 'rejected', 'processing', 'active', 'init', 'failed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-(--color-muted)">Loading…</div> : (
        <DataTable
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          rows={sessions as unknown as Record<string, unknown>[]}
          onRowClick={(r) => router.push(`/admin/sessions/${(r as unknown as Session).id}`)}
        />
      )}

      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</Button>
          <span className="text-sm text-(--color-muted)">Page {page}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={sessions.length < 20}>Next →</Button>
        </div>
      )}
    </div>
  );
}
