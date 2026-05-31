import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  const safeAmount = amount ?? 0;
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', AED: 'د.إ', AZN: '₼',
  };
  const sym = symbols[currency] || currency + ' ';
  return `${sym}${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${formatDate(s)} – ${formatDate(e)}`;
}

export function daysBetween(start: Date | string, end: Date | string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    PLANNED: 'border-emerald-400/60 bg-emerald-950 text-emerald-100 dark:border-emerald-400/60 dark:bg-emerald-500/20 dark:text-emerald-100',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    COMPLETED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ARCHIVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    PENDING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return colors[status] || colors.DRAFT;
}

export function getBudgetPercentage(spent: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((spent / total) * 100));
}

export function getBudgetStatusColor(percentage: number): string {
  if (percentage >= 100) return 'text-red-600 dark:text-red-400';
  if (percentage >= 90) return 'text-orange-600 dark:text-orange-400';
  if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 90) return 'bg-orange-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function optimizeRoute(points: { lat: number; lng: number; id: string }[]): typeof points {
  if (points.length <= 2) return points;
  // Nearest-neighbor heuristic
  const visited = new Set<string>();
  const result: typeof points = [];
  let current = points[0];
  result.push(current);
  visited.add(current.id);
  while (visited.size < points.length) {
    let nearest = null;
    let minDist = Infinity;
    for (const p of points) {
      if (visited.has(p.id)) continue;
      const d = calculateDistance(current.lat, current.lng, p.lat, p.lng);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    if (nearest) {
      result.push(nearest);
      visited.add(nearest.id);
      current = nearest;
    }
  }
  return result;
}
