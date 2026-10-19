/**
 * Date and currency helper utilities to prevent SSR hydration mismatch errors.
 * Next.js server pre-renders in server locale (typically UTC/US), whereas the client browser
 * uses the user's browser local setting, causing toLocaleString/toLocaleDateString to mismatch.
 * These helpers return identical string representations on both server and client.
 */

export function formatDate(dateInput: any): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateTime(dateInput: any): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function formatCurrency(amount: any): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  // Format with thousands separator in a locale-neutral manner
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Strip trailing decimals if it is a whole integer amount
  if (parts[1] === '00') {
    return parts[0];
  }
  return parts.join('.');
}

export function formatTime(dateInput: any): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

/** 5400 -> "1h 30m". */
export function formatHM(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Whole days left until a date (0 = ends today, negative = already over). */
export function daysLeft(dateInput: string | null | undefined): number | null {
  if (!dateInput) return null;
  const end = new Date(dateInput).getTime();
  if (isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86400000);
}

export const PLAN_TYPE_LABEL: Record<string, string> = {
  hourly: 'Prepaid hours',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-yearly',
  yearly: 'Yearly',
};

export function formatDistance(km?: number): string {
  if (km === undefined || km === null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
