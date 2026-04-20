import { addDays, parseISO } from 'date-fns';

const IST = 'Europe/Istanbul';

/** Takvim günü (yyyy-MM-dd), Europe/Istanbul duvar saati. */
export function formatYmdInIstanbul(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatTimestampIstanbul(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: IST,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/** Bugün / yarın / öbür gün için hedef yyyy-MM-dd (İstanbul takvimi). */
export function getQuickFilterTargetYmd(which: 'today' | 'tomorrow' | 'dayAfter'): string {
  const todayYmd = formatYmdInIstanbul(new Date());
  if (which === 'today') return todayYmd;
  const [y, m, d] = todayYmd.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offset = which === 'tomorrow' ? 1 : 2;
  return formatYmdInIstanbul(addDays(base, offset));
}
