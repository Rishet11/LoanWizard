import { useCallback, useEffect, useRef, useState } from 'react';
import { PerceptionEngine } from './engine';
import type { PerceptionConfig, PerceptionHandle } from './index';

export function usePerception(config: PerceptionConfig): PerceptionHandle {
  const [status, setStatus] = useState<PerceptionHandle['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<PerceptionEngine | null>(null);
  const onEventRef = useRef(config.onEvent);
  onEventRef.current = config.onEvent;

  const start = useCallback(async () => {
    if (engineRef.current) return;

    setStatus('requesting_permissions');
    setError(null);

    const engine = new PerceptionEngine({
      ...config,
      onEvent: (e) => {
        onEventRef.current(e);
        if (e.type === 'permission_granted') setStatus('running');
        if (e.type === 'session_ended') setStatus('ended');
        if (e.type === 'error') { setError(e.payload.message); setStatus('error'); }
      },
    });

    engineRef.current = engine;
    if (videoRef.current) engine.attachVideo(videoRef.current);

    try {
      await engine.start();
    } catch (err) {
      setError(String(err));
      setStatus('error');
      engineRef.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setStatus('ended');
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'hi') => {
    engineRef.current?.setLanguage(lang);
  }, []);

  const captureDocument = useCallback(async (docType: 'aadhaar' | 'pan') => {
    await engineRef.current?.captureDocument(docType);
  }, []);

  // Wire video ref once engine exists — idempotent via attachStreamToVideo guard
  useEffect(() => {
    if (videoRef.current && engineRef.current) {
      engineRef.current.attachVideo(videoRef.current);
    }
  });

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  return { status, videoRef, start, stop, error, setLanguage, captureDocument };
}
