'use client';
import type { FormData } from '@loan-wizard/contracts';
import { motion, AnimatePresence } from 'framer-motion';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function FormSidePanel({ form }: { form: Partial<FormData> }) {
  const fields: Array<{ key: keyof FormData; label: string; format?: (v: unknown) => string }> = [
    { key: 'name', label: 'Name' },
    { key: 'employment_type', label: 'Employment', format: (v) => String(v).replace('_', ' ') },
    { key: 'monthly_income', label: 'Monthly Income', format: (v) => INR.format(Number(v)) },
    { key: 'loan_amount_requested', label: 'Loan Requested', format: (v) => INR.format(Number(v)) },
    { key: 'purpose', label: 'Purpose' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-white border-l border-gray-200">
      <h2 className="text-lg font-semibold text-(--color-brand)">Application Details</h2>
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {fields.map(({ key, label, format }) =>
            form[key] != null ? (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-0.5"
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
                <span className="text-base font-medium text-(--color-brand) capitalize">
                  {format ? format(form[key]) : String(form[key])}
                </span>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
        {Object.keys(form).length === 0 && (
          <p className="text-sm text-gray-400">Details will appear as the conversation progresses…</p>
        )}
      </div>
    </div>
  );
}
