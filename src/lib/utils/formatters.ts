import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isExpired(date: string | Date | null): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function isUpcoming(date: string | Date | null): boolean {
  if (!date) return false;
  return isFuture(new Date(date));
}

export function formatExpirationDate(endDate: string | null): string {
  if (!endDate) return 'No expiration';
  const date = new Date(endDate);
  if (isPast(date)) return 'Expired';
  return `Expires ${formatRelativeTime(date)}`;
}

