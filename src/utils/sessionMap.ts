import type { ShootingSession } from '../types';

export function fromApiSession(raw: Record<string, unknown>): ShootingSession {
  const strArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.map((v) => String(v)) : [];
  return {
    id: String(raw.id ?? ''),
    programName: String(raw.programName ?? ''),
    title: String(raw.title ?? ''),
    startTime: String(raw.startTime ?? ''),
    endTime: String(raw.endTime ?? ''),
    location: String(raw.location ?? ''),
    shootingType: (raw.shootingType as ShootingSession['shootingType']) || 'İç Çekim',
    category: String(raw.category ?? ''),
    crew: strArr(raw.crew),
    moderators: strArr(raw.moderators),
    guests: strArr(raw.guests),
    equipment: strArr(raw.equipment),
    status: (raw.status as ShootingSession['status']) || 'Planlandı',
    notes: raw.notes != null && String(raw.notes) !== '' ? String(raw.notes) : undefined,
  };
}
