export function formatCurrency(value: number | undefined | null): string {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function formatNumber(value: number | undefined | null): string {
  return Number(value || 0).toLocaleString('en-IN');
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** yyyy-mm-dd for <input type="date"> min/max/value attributes. */
export function toInputDate(value: Date = new Date()): string {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
