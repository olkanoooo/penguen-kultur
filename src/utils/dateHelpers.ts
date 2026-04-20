import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import type { DashboardViewMode, ShootingSession } from '../types';

export function getMonthCalendarDays(currentDate: Date): { monthStart: Date; calendarDays: Date[] } {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return {
    monthStart,
    calendarDays: eachDayOfInterval({ start: startDate, end: endDate }),
  };
}

export function filterSessionsBySearch(sessions: ShootingSession[], searchQuery: string): ShootingSession[] {
  const searchLower = searchQuery.toLocaleLowerCase('tr-TR');
  return sessions.filter(
    (session) =>
      session.programName.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      session.title.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      session.location.toLocaleLowerCase('tr-TR').includes(searchLower) ||
      session.moderators.some((m) => m.toLocaleLowerCase('tr-TR').includes(searchLower)) ||
      session.guests.some((g) => g.toLocaleLowerCase('tr-TR').includes(searchLower))
  );
}

export function buildNavigationSessions(
  sessions: ShootingSession[],
  filteredSessions: ShootingSession[],
  searchQuery: string,
  viewMode: DashboardViewMode
): ShootingSession[] {
  if (viewMode === 'completed') {
    return sessions
      .filter((s) => s.status === 'Tamamlandı')
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }
  return filteredSessions
    .filter((s) => (searchQuery.trim() !== '' ? true : s.status !== 'İptal Edildi' && s.status !== 'Tamamlandı'))
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
}
