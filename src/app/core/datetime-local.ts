// Converte tra il formato "YYYY-MM-DDTHH:mm" richiesto da <input type="datetime-local">
// (sempre in ora locale del browser, senza timezone) e un timestamp ISO UTC per il DB.
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

// Formattazione locale-aware compatta per badge/card (es. "21 ago, 18:30").
export function formatDateTime(iso: string | null, locale: 'it' | 'en'): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(locale === 'it' ? 'it-IT' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
