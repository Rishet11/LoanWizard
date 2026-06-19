'use client';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, children, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn('flex gap-1 bg-(--color-muted)/10 p-1 rounded-[var(--radius-md)] w-fit', className)}
      {...props}
    >
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({ className, children, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all',
        'text-(--color-muted) hover:text-(--color-fg)',
        'data-[state=active]:bg-(--color-surface) data-[state=active]:text-(--color-fg) data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </RadixTabs.Trigger>
  );
}

export const TabsContent = RadixTabs.Content;
