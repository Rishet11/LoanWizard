'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, MapPin, AlertCircle, ShieldCheck, ArrowUpRight } from 'lucide-react';

type Step = 'checking' | 'camera' | 'geo' | 'denied' | 'done';

export function PermissionGate({ onGranted }: { onGranted: () => void }) {
  const [step, setStep] = useState<Step>('checking');
  const [error, setError] = useState('');

  // On mount, check if camera+mic is already granted — if so, skip the dialog
  useEffect(() => {
    async function preflight() {
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
        ]);
        if (cam.state === 'denied' || mic.state === 'denied') {
          setStep('denied');
          return;
        }
        if (cam.state === 'granted' && mic.state === 'granted') {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach((t) => t.stop());
          setStep('geo');
          return;
        }
      } catch {
        // permissions API not supported — fall through to manual step
      }
      setStep('camera');
    }
    preflight();
  }, []);

  async function requestCameraAndMic() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStep('geo');
    } catch (err: unknown) {
      const name = err instanceof Error ? (err as { name?: string }).name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStep('denied');
      } else {
        setError('Could not access camera or microphone. Please check your device and try again.');
      }
    }
  }

  function requestGeo() {
    setError('');
    navigator.geolocation.getCurrentPosition(
      () => { setStep('done'); onGranted(); },
      () => { setStep('done'); onGranted(); }, // geo is optional
    );
  }

  if (step === 'done') return null;

  const shell = 'fixed inset-0 z-50 grid-ink bg-(--color-bg) text-(--color-fg) flex items-center justify-center px-6';

  if (step === 'checking') {
    return (
      <div className={shell}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 border-2 border-(--color-brand) border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--color-muted)">checking devices</p>
        </div>
      </div>
    );
  }

  if (step === 'denied') {
    return (
      <div className={shell}>
        <Frame>
          <div className="grid place-items-center w-12 h-12 rounded-full bg-(--color-danger)/10 mb-5">
            <AlertCircle size={24} className="text-(--color-danger)" />
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">Camera access is blocked</h2>
          <p className="text-(--color-muted) mb-6 leading-relaxed">
            Your browser blocked camera or microphone access for this site. Re-enable it to continue your verification.
          </p>
          <ol className="text-left text-sm space-y-2.5 mb-7 border-t border-(--color-fg)/10 pt-5">
            {[
              <>Click the <strong>lock icon</strong> in your browser address bar</>,
              <>Set <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong></>,
              <>Reload the page</>,
            ].map((li, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] text-(--color-accent) mt-0.5 nums">0{i + 1}</span>
                <span className="text-(--color-fg)/80">{li}</span>
              </li>
            ))}
          </ol>
          <BrandButton onClick={() => window.location.reload()}>Reload page</BrandButton>
        </Frame>
      </div>
    );
  }

  const steps = {
    camera: {
      icons: [Camera, Mic],
      tag: 'step 01 of 02',
      title: 'Allow camera & microphone',
      reason: 'RBI video-KYC requires live video to verify your identity, and your spoken answers fill the form automatically.',
      action: requestCameraAndMic,
      label: 'Allow camera & mic',
    },
    geo: {
      icons: [MapPin],
      tag: 'step 02 of 02',
      title: 'Allow location access',
      reason: 'Location is used for fraud prevention and regulatory compliance checks. This step is optional.',
      action: requestGeo,
      label: 'Allow location',
    },
  } as const;

  const current = steps[step as 'camera' | 'geo'];

  return (
    <div className={shell}>
      <Frame>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--color-accent) mb-5">{current.tag}</p>
        <div className="flex items-center gap-3 mb-5">
          {current.icons.map((Icon, i) => (
            <span key={i} className="grid place-items-center w-12 h-12 rounded-[var(--radius-md)] bg-(--color-brand)/8 text-(--color-brand)">
              <Icon size={22} />
            </span>
          ))}
        </div>
        <h2 className="font-display text-2xl font-semibold mb-2.5">{current.title}</h2>
        <p className="text-(--color-muted) mb-6 leading-relaxed">{current.reason}</p>
        {error && <p className="text-(--color-danger) text-sm mb-4">{error}</p>}
        <BrandButton onClick={current.action}>
          {current.label}
          <ArrowUpRight size={16} />
        </BrandButton>
        <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-(--color-muted) mt-5">
          <ShieldCheck size={12} className="text-(--color-success)" /> encrypted · RBI compliant
        </p>
      </Frame>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative max-w-md w-full bg-(--color-surface) border border-(--color-fg)/10 rounded-[var(--radius-xl)] shadow-2xl p-8 text-center"
    >
      <span className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-(--color-accent)" />
      <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-(--color-accent)" />
      {children}
    </motion.div>
  );
}

function BrandButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group w-full inline-flex items-center justify-center gap-2 bg-(--color-brand) text-(--color-brand-fg) py-3.5 rounded-full font-medium hover:opacity-90 active:opacity-80 transition"
    >
      {children}
    </button>
  );
}
