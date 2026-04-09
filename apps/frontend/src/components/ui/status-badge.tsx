import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-orange-50 text-orange-700',
  CONVERTED: 'bg-purple-50 text-purple-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  PROCESSING: 'bg-blue-50 text-blue-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
  PAID: 'bg-green-50 text-green-700',
  PARTIALLY_PAID: 'bg-yellow-50 text-yellow-700',
  OVERDUE: 'bg-red-50 text-red-700',
  POSTED: 'bg-green-50 text-green-700',
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  TRIAL: 'bg-blue-50 text-blue-700',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusColors[status] || 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
