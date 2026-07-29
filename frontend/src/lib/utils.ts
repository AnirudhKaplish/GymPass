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
