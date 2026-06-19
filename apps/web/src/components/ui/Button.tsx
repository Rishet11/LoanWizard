import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-(--color-brand) text-(--color-brand-fg) hover:opacity-90 active:opacity-80',
  secondary: 'bg-(--color-surface) text-(--color-fg) border border-(--color-muted)/30 hover:bg-(--color-muted)/10',
  ghost: 'bg-transparent text-(--color-fg) hover:bg-(--color-muted)/10',
  danger: 'bg-(--color-danger) text-white hover:opacity-90 active:opacity-80',
};

const sizeStyles: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-sm)]',
  md: 'text-sm px-4 py-2.5 rounded-[var(--radius-md)]',
  lg: 'text-base px-6 py-3.5 rounded-[var(--radius-lg)]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
