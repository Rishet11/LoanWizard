'use client';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({ className, children, ...props }: RadixDialog.DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'bg-(--color-surface) rounded-[var(--radius-xl)] shadow-xl p-6 w-full max-w-md mx-4',
          'animate-in fade-in zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute top-4 right-4 p-1 rounded-md text-(--color-muted) hover:text-(--color-fg) hover:bg-(--color-muted)/10 transition-colors">
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogTitle = ({ children, className, ...p }: RadixDialog.DialogTitleProps) => (
  <RadixDialog.Title className={cn('text-lg font-bold text-(--color-fg) mb-1', className)} {...p}>{children}</RadixDialog.Title>
);
export const DialogDescription = ({ children, className, ...p }: RadixDialog.DialogDescriptionProps) => (
  <RadixDialog.Description className={cn('text-sm text-(--color-muted) mb-4', className)} {...p}>{children}</RadixDialog.Description>
);
