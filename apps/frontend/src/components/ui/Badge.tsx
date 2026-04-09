import { cn, STATUS_COLORS } from '@/lib/utils';

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: BadgeProps) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        color,
        className,
      )}
    >
      {label ?? status.replace('_', ' ')}
    </span>
  );
}
