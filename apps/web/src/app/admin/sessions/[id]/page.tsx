'use client';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/Tabs';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { DecisionReplayForm } from '../../../../components/admin/DecisionReplayForm';
import { SessionTimeline } from '../../../../components/admin/SessionTimeline';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface SessionDetail {
  id: string; status: string; declaredName: string | null; createdAt: string;
  tenantId: string; offerJson: string | null; agentNotes: string | null;
  transcripts: Array<{ speaker: string; text: string; timestamp: string; turnIdx: number }>;
  cvSignals: Array<{ timestamp: string; livenessScore: number; facePresent: boolean; ageEstimate: number | null }>;
  consentRecords: Array<{ id: string; consentType: string; verbalText: string; timestamp: string }>;
}

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/sessions/${params.id}`)
      .then((r) => r.json())
      .then(setSession)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-(--color-muted)">Loading…</div>;
  if (!session) return <div className="text-center py-12 text-(--color-danger)">Session not found</div>;

  const offer = session.offerJson ? JSON.parse(session.offerJson) : null;

  return (
    <div>
      <Link href="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-(--color-muted) hover:text-(--color-fg) mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to sessions
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-(--color-fg)">{session.declaredName ?? 'Anonymous'}</h1>
          <p className="text-xs font-mono text-(--color-muted)">{session.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{session.tenantId}</Badge>
          <Badge variant={session.status === 'accepted' ? 'success' : session.status === 'rejected' ? 'danger' : 'default'}>
            {session.status}
          </Badge>
          <Link href={`/session/${session.id}/copilot`} target="_blank" className="inline-flex items-center gap-1 text-xs text-(--color-brand) hover:underline">
            <ExternalLink size={12} /> Co-pilot
          </Link>
        </div>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList className="mb-6">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="decision">Decision</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="export">Audit Export</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <SessionTimeline session={session} />
        </TabsContent>

        <TabsContent value="decision">
          {offer ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><p className="font-semibold text-sm">Offer</p></CardHeader>
                <CardBody>
                  <OfferRow label="Amount" value={`₹${offer.amount?.toLocaleString('en-IN')}`} />
                  <OfferRow label="Rate" value={`${offer.interest_rate}% p.a.`} />
                  <OfferRow label="Tenure" value={`${offer.tenure_months} months`} />
                  <OfferRow label="EMI" value={`₹${offer.emi?.toLocaleString('en-IN')}`} />
                  <OfferRow label="Risk band" value={offer.risk_band} />
                  <OfferRow label="Persona" value={offer.persona} />
                </CardBody>
              </Card>
              <DecisionReplayForm sessionId={session.id} originalOffer={offer} />
            </div>
          ) : <p className="text-(--color-muted) text-sm">No offer computed yet.</p>}
        </TabsContent>

        <TabsContent value="evidence">
          <div className="flex flex-col gap-4">
            {session.consentRecords.map((c) => (
              <Card key={c.id}>
                <CardBody>
                  <p className="text-xs text-(--color-muted) mb-1">{new Date(c.timestamp).toLocaleString()} · <Badge>{c.consentType}</Badge></p>
                  <p className="text-sm text-(--color-fg) italic">"{c.verbalText}"</p>
                  <p className="text-xs text-(--color-muted) mt-1 font-mono">Hash: {btoa(c.id).slice(0, 16)}…</p>
                </CardBody>
              </Card>
            ))}
            {session.consentRecords.length === 0 && <p className="text-(--color-muted) text-sm">No consent records.</p>}
          </div>
        </TabsContent>

        <TabsContent value="export">
          <AuditExport session={session} offer={offer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OfferRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-(--color-muted)/10 last:border-0 text-sm">
      <span className="text-(--color-muted)">{label}</span>
      <span className="font-medium text-(--color-fg) capitalize">{value}</span>
    </div>
  );
}

function AuditExport({ session, offer }: { session: SessionDetail; offer: unknown }) {
  async function download() {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file('session.json', JSON.stringify(session, null, 2));
    zip.file('offer.json', JSON.stringify(offer, null, 2));
    zip.file('consents.json', JSON.stringify(session.consentRecords, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-${session.id}.zip`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardBody>
        <p className="text-sm text-(--color-muted) mb-4">Download a ZIP containing session data, offer JSON, and consent hashes for compliance audit.</p>
        <Button onClick={download}>Download Audit Pack</Button>
      </CardBody>
    </Card>
  );
}
