import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'pink';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  gray: 'bg-secondary-100 text-secondary-700 ring-secondary-200',
  blue: 'bg-primary-50 text-primary-700 ring-primary-200',
  green: 'bg-accent-50 text-accent-700 ring-accent-200',
  red: 'bg-error-50 text-error-700 ring-error-200',
  yellow: 'bg-warning-50 text-warning-700 ring-warning-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const dotStyles: Record<BadgeVariant, string> = {
  gray: 'bg-secondary-500',
  blue: 'bg-primary-500',
  green: 'bg-accent-500',
  red: 'bg-error-500',
  yellow: 'bg-warning-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  pink: 'bg-pink-500',
};

function Badge({ children, variant = 'gray', className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
