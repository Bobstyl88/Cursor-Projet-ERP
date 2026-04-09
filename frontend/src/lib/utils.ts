import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'gray',
    SENT: 'blue',
    ACCEPTED: 'green',
    CONFIRMED: 'green',
    REJECTED: 'red',
    CANCELLED: 'red',
    CONVERTED: 'purple',
    EXPIRED: 'gray',
    PROCESSING: 'blue',
    SHIPPED: 'indigo',
    DELIVERED: 'green',
    RECEIVED: 'green',
    PARTIALLY_PAID: 'yellow',
    PAID: 'green',
    OVERDUE: 'red',
    VOID: 'gray',
    POSTED: 'green',
  };
  return colors[status] || 'gray';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
