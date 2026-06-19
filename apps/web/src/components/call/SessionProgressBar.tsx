'use client';
import { cn } from '../../lib/cn';

const STEPS = ['Permissions', 'Questions', 'Documents', 'Consent', 'Processing'];

export function SessionProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Session progress" className="flex items-center gap-1 px-6 py-2 bg-(--color-surface) border-b border-(--color-muted)/10">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < currentStep && 'bg-(--color-success) text-white',
                i === currentStep && 'bg-(--color-brand) text-(--color-brand-fg)',
                i > currentStep && 'bg-(--color-muted)/20 text-(--color-muted)',
              )}
              aria-current={i === currentStep ? 'step' : undefined}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={cn('text-[10px] mt-0.5 hidden sm:block', i === currentStep ? 'text-(--color-fg) font-semibold' : 'text-(--color-muted)')}>
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-0.5 flex-1 rounded', i < currentStep ? 'bg-(--color-success)' : 'bg-(--color-muted)/20')} />
          )}
        </div>
      ))}
    </nav>
  );
}
