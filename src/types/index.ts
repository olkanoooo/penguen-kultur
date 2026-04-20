export type ShootingStatus = 'Planlandı' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal Edildi';
export type ShootingType = 'İç Çekim' | 'Dış Çekim';

export interface ShootingSession {
  id: string;
  programName: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  shootingType: ShootingType;
  category: string;
  crew: string[];
  moderators: string[];
  guests: string[];
  equipment: string[];
  status: ShootingStatus;
  notes?: string;
}

export const CATEGORIES = [
  'SİNEMA',
  'KİTAP',
  'ARKEOLOJİ',
  'MÜZİK',
  'TİYATRO',
  'KİŞİSEL GELİŞİM',
  'PSİKOLOJİ',
  'BİLİM',
  'ÇOCUK',
  'KÜLTÜR',
  'TOPLUM',
  'HABER',
  'POPÜLER KÜLTÜR',
  'DİĞER',
];

export const CATEGORY_COLORS: Record<string, string> = {
  SİNEMA: 'FFC000',
  KİTAP: 'FF00FF',
  ARKEOLOJİ: '00B0F0',
  MÜZİK: '92D050',
  TİYATRO: '7030A0',
  'KİŞİSEL GELİŞİM': 'FFFF00',
  PSİKOLOJİ: 'FF0000',
  BİLİM: '00FF00',
  ÇOCUK: 'FF6600',
  KÜLTÜR: '00CCFF',
  TOPLUM: 'CC99FF',
  HABER: 'FFCC00',
  'POPÜLER KÜLTÜR': 'FF99CC',
  DİĞER: 'A6A6A6',
};

export const STATUS_COLORS: Record<ShootingStatus, string> = {
  Planlandı: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Devam Ediyor': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Tamamlandı: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'İptal Edildi': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export type DashboardViewMode = 'calendar' | 'list' | 'completed' | 'users';
