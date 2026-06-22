'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { PerceptionEvent, FormData, CVSignal } from '@loan-wizard/contracts';
import { usePerception } from '@loan-wizard/perception';
import { config } from '../lib/config';
import { VideoPanel } from './VideoPanel';
import { FormSidePanel } from './FormSidePanel';
import { CVIndicatorStrip } from './CVIndicatorStrip';
import { RecordingIndicator } from './RecordingIndicator';
import { SessionProgressBar } from './call/SessionProgressBar';
import { DocumentCaptureOverlay } from './call/DocumentCaptureOverlay';
import { YawChallengeOverlay } from './call/YawChallengeOverlay';
import { Button } from './ui/Button';

type Overlay = 'none' | 'document' | 'yaw';

export function AgentCallUI({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<FormData>>({});
  const [latestCv, setLatestCv] = useState<CVSignal | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [ending, setEnding] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [step, setStep] = useState(1); // 0=Permissions,1=Questions,2=Documents,3=Consent,4=Processing
  const endingRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const endSession = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    await fetch(`/api/session/${sessionId}/end`, { method: 'POST' }).catch(() => {});
    router.push(`/session/${sessionId}/processing`);
  }, [sessionId, router]);

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

  const { videoRef, start, status, error: perceptionError } = usePerception({
    sessionId,
    onEvent: handleEvent,
    // When set, low-confidence Web Speech results fall back to server-side Whisper.
    sttFallbackUrl: config.transcribeUrl || undefined,
  });

  useEffect(() => { start(); }, [start]);

  if (perceptionError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-sm px-6">
          <p className="text-(--color-danger) font-semibold mb-2">Camera or microphone error</p>
          <p className="text-(--color-muted) text-sm mb-4">{perceptionError}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  const statusText = status === 'running' && currentQuestion ? currentQuestion
    : status === 'running' ? 'Starting session…'
    : status === 'ended' ? 'Session complete'
    : 'Waiting…';

  return (
    <div className="flex flex-col h-screen bg-(--color-bg)">
      <AnimatePresence>
        {overlay === 'document' && (
          <DocumentCaptureOverlay onDone={() => setOverlay('none')} />
        )}
        {overlay === 'yaw' && (
          <YawChallengeOverlay onComplete={() => setOverlay('none')} />
        )}
      </AnimatePresence>

      {/* Progress */}
      <SessionProgressBar currentStep={step} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-(--color-surface) border-b border-(--color-muted)/10">
        <RecordingIndicator elapsed={elapsed} />
        <span className="text-xs text-(--color-muted) bg-(--color-muted)/10 px-3 py-1 rounded-full">
          🔒 RBI Video-KYC Compliant
        </span>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <motion.div
          className="flex-1 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <VideoPanel videoRef={videoRef} />
        </motion.div>
        <div className="w-80 flex-shrink-0">
          <FormSidePanel form={form} />
        </div>
      </div>

      <CVIndicatorStrip signal={latestCv} />

      {/* Question bar */}
      <div className="px-6 py-3 bg-(--color-surface) border-t border-(--color-muted)/10 flex items-center justify-between gap-4">
        <p className="text-sm text-(--color-fg) flex-1">
          {status === 'running' && currentQuestion
            ? <><span className="font-semibold">Agent:</span> {statusText}</>
            : statusText}
        </p>
        <Button variant="danger" size="sm" onClick={endSession} disabled={ending} aria-label="End call">
          {ending ? 'Ending…' : 'End call'}
        </Button>
      </div>
    </div>
  );
}
