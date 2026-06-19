import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)}
    />
  );
}
