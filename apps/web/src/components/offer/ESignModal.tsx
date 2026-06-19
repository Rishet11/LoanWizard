'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface ESignModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  onAccepted: () => void;
}

export function ESignModal({ open, onClose, sessionId, onAccepted }: ESignModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [state, setState] = useState<'input' | 'loading' | 'success'>('input');
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  function handleDigit(i: number, val: string) {
    const digits = [...otp];
    digits[i] = val.replace(/\D/, '').slice(-1);
    setOtp(digits);
    if (val && i < 5) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus();
  }

  async function handleSubmit() {
    const code = otp.join('');
    if (code.length !== 6) return;
    setState('loading');
    try {
      await fetch(`/api/session/${sessionId}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      });
      setState('success');
      setTimeout(onAccepted, 1500);
    } catch {
      setState('input');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Sign your agreement</DialogTitle>
        <DialogDescription>
          Enter the 6-digit code sent to your registered mobile to confirm acceptance.
        </DialogDescription>

        {state === 'input' && (
          <>
            <div className="bg-(--color-muted)/5 rounded-[var(--radius-md)] p-4 text-xs text-(--color-muted) mb-5">
              I, the applicant, agree to the loan terms as stated in the Key Fact Statement. This digital signature is binding per the IT Act 2000.
            </div>
            <div className="flex gap-2 justify-center mb-5">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-10 h-12 text-center text-xl font-bold border border-(--color-muted)/30 rounded-[var(--radius-sm)] bg-(--color-surface) text-(--color-fg) focus:border-(--color-brand) focus:outline-none"
                  aria-label={`OTP digit ${i + 1}`}
                />
              ))}
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={otp.join('').length !== 6}>
              Confirm acceptance
            </Button>
          </>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Spinner className="w-8 h-8" />
            <p className="text-sm text-(--color-muted)">Registering your acceptance…</p>
          </div>
        )}

        {state === 'success' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={48} className="text-(--color-success)" />
            <p className="font-semibold text-(--color-fg)">Accepted!</p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
