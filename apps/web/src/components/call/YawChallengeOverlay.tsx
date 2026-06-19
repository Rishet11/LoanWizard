'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function YawChallengeOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'left' | 'right' | 'done'>('left');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('right'), 2500);
    const t2 = setTimeout(() => { setStep('done'); onComplete(); }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  const progress = step === 'left' ? 33 : step === 'right' ? 66 : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
    >
      <div className="text-white text-center max-w-xs w-full px-6">
        <p className="text-sm text-white/70 mb-2">Liveness check</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-2xl font-bold mb-6"
          >
            {step === 'left' && '← Look left'}
            {step === 'right' && '→ Now right'}
            {step === 'done' && '✓ Complete'}
          </motion.p>
        </AnimatePresence>
        {/* Progress arc */}
        <div className="relative mx-auto w-24 h-24">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="264"
              animate={{ strokeDashoffset: 264 - (264 * progress) / 100 }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
