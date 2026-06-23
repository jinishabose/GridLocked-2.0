// GridLocked — Utility Helpers

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(decimals);
}

export function formatScore(n: number): string {
  return n.toFixed(1);
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function getRiskBadgeClass(risk: string): string {
  const r = risk?.toUpperCase();
  if (r === 'CRITICAL' || r === 'URGENT') return 'risk-badge-critical';
  if (r === 'HIGH') return 'risk-badge-high';
  if (r === 'MEDIUM') return 'risk-badge-medium';
  return 'risk-badge-low';
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active': return 'status-active';
    case 'resolved': return 'status-resolved';
    case 'closed': return 'status-closed';
    default: return 'status-closed';
  }
}

export function truncateAddress(address: string, maxLen = 45): string {
  if (!address) return '—';
  if (address.length <= maxLen) return address;
  return address.slice(0, maxLen) + '…';
}

export function getCauseIcon(cause: string): string {
  const icons: Record<string, string> = {
    vehicle_breakdown: '🚛',
    accident: '💥',
    tree_fall: '🌳',
    water_logging: '🌊',
    congestion: '🚦',
    pot_holes: '🕳',
    construction: '🏗',
    public_event: '🎭',
    road_conditions: '🛣',
    others: '⚠️',
  };
  return icons[cause] || '⚠️';
}

export function getMarkerColorHex(color: string): string {
  switch (color) {
    case 'red': return '#EF4444';
    case 'orange': return '#F97316';
    case 'yellow': return '#F59E0B';
    case 'green': return '#22C55E';
    default: return '#334155';
  }
}

export function computeDelta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
