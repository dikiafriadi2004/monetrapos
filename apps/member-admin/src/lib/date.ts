/**
 * Date utilities with WIB (UTC+7) timezone support
 */

const WIB_LOCALE = 'id-ID';
const WIB_TZ = 'Asia/Jakarta';

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString(WIB_LOCALE, {
      timeZone: WIB_TZ,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString(WIB_LOCALE, {
      timeZone: WIB_TZ,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}

export function formatShortDate(date: string | Date): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString(WIB_LOCALE, {
      timeZone: WIB_TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(date);
  }
}

export function formatTime(date: string | Date): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleTimeString(WIB_LOCALE, {
      timeZone: WIB_TZ,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(WIB_LOCALE, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumber(n: number): string {
  return (n || 0).toLocaleString(WIB_LOCALE);
}

/** Get current time in WIB */
export function nowWIB(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: WIB_TZ }));
}

/**
 * Resolve image URL — handles relative paths from API uploads
 * e.g. /uploads/products/xxx.jpg → http://10.1.2.254:4404/uploads/products/xxx.jpg
 */
export function getImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:')) return url; // local preview
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prefix with API base URL (without /api/v1)
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1').replace('/api/v1', '');
  return `${apiBase}${url}`;
}
