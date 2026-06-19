'use client';
import { useEffect, useState } from 'react';
import { Download, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../../components/ui/Dialog';

interface Consent { id: string; consentType: string; verbalText: string; timestamp: string; audioRef: string | null; }

export default function ConsentPage({ params }: { params: { id: string } }) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [showForget, setShowForget] = useState(false);
  const [forgotten, setForgotten] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sessions/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.consentRecords) setConsents(d.consentRecords); });
  }, [params.id]);

  function downloadData() {
    const blob = new Blob([JSON.stringify({ session_id: params.id, consents }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `data-${params.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function requestForget() {
    await fetch(`/api/consent/${params.id}/forget`, { method: 'POST' });
    setForgotten(true);
    setShowForget(false);
  }

  if (forgotten) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-(--color-success) mx-auto mb-4" />
          <h1 className="text-xl font-bold text-(--color-fg) mb-2">Deletion request submitted</h1>
          <p className="text-(--color-muted)">Your data will be deleted within 30 days per DPDP Act 2023.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-(--color-fg) mb-2">Consent & Privacy</h1>
      <p className="text-(--color-muted) mb-6 text-sm">Session: <span className="font-mono">{params.id}</span></p>

      <div className="flex gap-3 mb-8">
        <Button variant="secondary" size="sm" onClick={downloadData}>
          <Download size={14} /> Download my data
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowForget(true)}>
          <Trash2 size={14} /> Request deletion
        </Button>
      </div>

      <h2 className="text-base font-semibold text-(--color-fg) mb-4">Captured consents</h2>

      {consents.length === 0 && (
        <p className="text-(--color-muted) text-sm">No consents recorded yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {consents.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">{c.consentType.replace(/_/g, ' ')}</Badge>
                    <span className="flex items-center gap-1 text-xs text-(--color-muted)">
                      <Clock size={10} /> {new Date(c.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-(--color-muted) italic">"{c.verbalText}"</p>
                  <p className="text-xs text-(--color-muted) mt-1 font-mono">
                    Hash: {btoa(c.id + c.timestamp).slice(0, 16)}…
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Dialog open={showForget} onOpenChange={(o) => !o && setShowForget(false)}>
        <DialogContent>
          <DialogTitle>Request data deletion</DialogTitle>
          <DialogDescription>
            This will permanently erase your personal data including transcripts, video references, and CV signals from our systems within 30 days.
          </DialogDescription>
          <div className="flex gap-3 mt-4">
            <Button variant="danger" className="flex-1" onClick={requestForget}>Yes, delete my data</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowForget(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
