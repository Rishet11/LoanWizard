'use client';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function TrustMeter({ fraudScore }: { fraudScore: number }) {
  const trust = Math.round((1 - fraudScore) * 100);
  const color = trust >= 80 ? 'bg-green-500' : trust >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-xs text-(--color-muted) mb-1">
        <span>Trust score</span>
        <span className={cn('font-semibold', trust >= 80 ? 'text-green-600' : trust >= 60 ? 'text-amber-600' : 'text-red-600')}>
          {trust}%
        </span>
      </div>
      <div className="w-full bg-(--color-muted)/15 rounded-full h-2">
        <motion.div
          className={cn('h-2 rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${trust}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
