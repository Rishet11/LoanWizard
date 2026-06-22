import { prisma } from '../../lib/db';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getKPIs() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todayCount, total, offered, accepted] = await Promise.all([
    prisma.session.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    prisma.session.count({ where: { deletedAt: null } }),
    prisma.session.count({ where: { status: 'offered', deletedAt: null } }),
    prisma.session.count({ where: { status: 'accepted', deletedAt: null } }),
  ]);
  // High-fraud decisions (>= 0.5). The decisions table is owned by the ML
  // service; tolerate it not existing yet on a fresh database.
  let fraudAlerts = 0;
  try {
    fraudAlerts = await prisma.decision.count({ where: { fraudScore: { gte: 0.5 } } });
  } catch {
    fraudAlerts = 0;
  }
  const approvalRate = offered > 0 ? Math.round((accepted / offered) * 100) : 0;
  return { todayCount, total, approvalRate, fraudAlerts };
}

export default async function AdminDashboard() {
  const kpis = await getKPIs();

  return (
    <div>
      <h1 className="text-2xl font-bold text-(--color-fg) mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Sessions today" value={kpis.todayCount} />
        <KpiCard label="Total sessions" value={kpis.total} />
        <KpiCard label="Approval rate" value={`${kpis.approvalRate}%`} />
        <KpiCard label="Fraud alerts" value={kpis.fraudAlerts} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-(--color-fg) mb-3">Quick links</h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li><Link href="/admin/sessions" className="text-(--color-brand) hover:underline">View all sessions →</Link></li>
              <li><Link href="/admin/drift" className="text-(--color-brand) hover:underline">Drift analysis →</Link></li>
              <li><Link href="/admin/fairness" className="text-(--color-brand) hover:underline">Fairness report →</Link></li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-(--color-fg) mb-3">System status</h2>
            <div className="flex flex-col gap-2 text-sm">
              <StatusRow label="Web app" ok />
              <StatusRow label="Database" ok />
              <StatusRow label="ML service" ok={process.env.NEXT_PUBLIC_ML_MODE !== 'mock'} label2={process.env.NEXT_PUBLIC_ML_MODE === 'mock' ? '(mock)' : undefined} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-(--color-muted) mb-1">{label}</p>
        <p className="text-3xl font-bold text-(--color-fg)">{value}</p>
      </CardBody>
    </Card>
  );
}

function StatusRow({ label, ok, label2 }: { label: string; ok: boolean; label2?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-500'}`} aria-hidden="true" />
      <span className="text-(--color-fg)">{label}</span>
      {label2 && <span className="text-(--color-muted) text-xs">{label2}</span>}
    </div>
  );
}
