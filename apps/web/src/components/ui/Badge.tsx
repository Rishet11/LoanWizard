import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'muted';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-(--color-brand)/10 text-(--color-brand)',
  success: 'bg-(--color-success)/10 text-(--color-success)',
  warn: 'bg-(--color-warn)/10 text-(--color-warn)',
  danger: 'bg-(--color-danger)/10 text-(--color-danger)',
  muted: 'bg-(--color-muted)/10 text-(--color-muted)',
};

export function Badge({ variant = 'default', className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[variant], className)} {...props}>
      {children}
    </span>
  );
}
