'use client';
import { useState } from 'react';
import { PermissionGate } from '../../../components/PermissionGate';
import { AgentCallUI } from '../../../components/AgentCallUI';

export default function SessionPage({ params }: { params: { id: string } }) {
  const [permitted, setPermitted] = useState(false);
  return (
    <>
      {!permitted && <PermissionGate onGranted={() => setPermitted(true)} />}
      {permitted && <AgentCallUI sessionId={params.id} />}
    </>
  );
}
