'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { CVSignal, FormData, PerceptionEvent } from '@loan-wizard/contracts';
import { useMockPerception } from '../mocks/mock-perception';
import { FormSidePanel } from './FormSidePanel';
import { CVIndicatorStrip } from './CVIndicatorStrip';
import { RecordingIndicator } from './RecordingIndicator';
import { SessionProgressBar } from './call/SessionProgressBar';
import { DocumentCaptureOverlay } from './call/DocumentCaptureOverlay';
import { YawChallengeOverlay } from './call/YawChallengeOverlay';
import { Button } from './ui/Button';

type Overlay = 'none' | 'document' | 'yaw';

export function ScriptedAgentCallUI({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<FormData>>({});
  const [latestCv, setLatestCv] = useState<CVSignal | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [ending, setEnding] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const endSession = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    await fetch(`/api/session/${sessionId}/end`, { method: 'POST' }).catch(() => {});
    router.push(`/session/${sessionId}/processing`);
  }, [ending, sessionId, router]);

  const handleEvent = useCallback(async (event: PerceptionEvent) => {
    fetch(`/api/session/${sessionId}/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});

    switch (event.type) {
      case 'form_field_extracted':
        setForm((f) => ({ ...f, [event.payload.field]: event.payload.value }));
        break;
      case 'cv_signal':
        setLatestCv(event.payload);
        break;
      case 'question_asked':
        setCurrentQuestion(event.payload.text);
        setStep(1);
        break;
      case 'session_ended':
        setComplete(true);
        await endSession();
        break;
      case 'document_capture_started':
        setOverlay('document');
        setStep(2);
        break;
      case 'document_captured':
        setOverlay('none');
        break;
      case 'challenge_requested':
        setOverlay('yaw');
        break;
      case 'challenge_completed':
        setOverlay('none');
        break;
      case 'consent_captured':
        setStep(3);
        break;
    }
  }, [sessionId, endSession]);

  useMockPerception(handleEvent);

  const statusText = complete ? 'Session complete' : currentQuestion || 'Starting secure session...';

  return (
    <div className="flex flex-col h-screen bg-(--color-bg)">
      <AnimatePresence>
        {overlay === 'document' && <DocumentCaptureOverlay onDone={() => setOverlay('none')} />}
        {overlay === 'yaw' && <YawChallengeOverlay onComplete={() => setOverlay('none')} />}
      </AnimatePresence>

      <SessionProgressBar currentStep={step} />

      <div className="flex items-center justify-between px-6 py-2.5 bg-(--color-surface) border-b border-(--color-muted)/10">
        <RecordingIndicator elapsed={elapsed} />
        <span className="text-xs text-(--color-muted) bg-(--color-muted)/10 px-3 py-1 rounded-full">
          Scripted public demo
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <motion.div
          className="flex-1 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <ScriptedVideoPanel />
        </motion.div>
        <div className="w-80 flex-shrink-0">
          <FormSidePanel form={form} />
        </div>
      </div>

      <CVIndicatorStrip signal={latestCv} />

      <div className="px-6 py-3 bg-(--color-surface) border-t border-(--color-muted)/10 flex items-center justify-between gap-4">
        <p className="text-sm text-(--color-fg) flex-1">
          <span className="font-semibold">Agent:</span> {statusText}
        </p>
        <Button variant="danger" size="sm" onClick={endSession} disabled={ending} aria-label="End call">
          {ending ? 'Ending...' : 'End call'}
        </Button>
      </div>
    </div>
  );
}

function ScriptedVideoPanel() {
  return (
    <div className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_35%_25%,#22c55e,transparent_24%),radial-gradient(circle_at_70%_65%,#0ea5e9,transparent_28%)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full border border-emerald-300/40"
            animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.12, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />
          <div className="relative w-44 h-44 rounded-full bg-gradient-to-b from-emerald-100 to-slate-300 shadow-2xl grid place-items-center">
            <div className="w-24 h-24 rounded-full bg-slate-800/90 grid place-items-center text-white text-3xl font-semibold">
              RS
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-white/80">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        REC
      </div>
      <div className="absolute bottom-3 left-3 right-3 bg-black/60 rounded-md px-3 py-2">
        <p className="text-white text-sm font-medium">AI Agent</p>
        <p className="text-gray-300 text-xs">Listening...</p>
      </div>
    </div>
  );
}
