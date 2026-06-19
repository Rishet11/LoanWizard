'use client';
import { useState } from 'react';
import { PermissionGate } from '../../../components/PermissionGate';
import { AgentCallUI } from '../../../components/AgentCallUI';
import { ScriptedAgentCallUI } from '../../../components/ScriptedAgentCallUI';

export default function SessionPage({ params }: { params: { id: string } }) {
  const useMockPerception = process.env.NEXT_PUBLIC_USE_MOCK_PERCEPTION !== 'false';
  const [permitted, setPermitted] = useState(false);

  if (useMockPerception) {
    return <ScriptedAgentCallUI sessionId={params.id} />;
  }

  return (
    <>
      {!permitted && <PermissionGate onGranted={() => setPermitted(true)} />}
      {permitted && <AgentCallUI sessionId={params.id} />}
    </>
  );
}
