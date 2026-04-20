import React from 'react';
import { Search } from 'lucide-react';

export interface DashboardLayoutProps {
  /** Üst sol marka */
  brandTitle?: string;
  /** Üst sağ kullanıcı adı */
  userDisplayName?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

const cardBase =
  'rounded-2xl border border-[#ff6600] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] shadow-[0_0_20px_rgba(255,102,0,0.12)]';

export function dashboardCardClassName(extra?: string) {
  return [cardBase, extra].filter(Boolean).join(' ');
}

/**
 * Tam ekran koyu kabuk: üst bar + ana alan.
 * Eski sidebar / menü / ay navigasyonu yok.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  brandTitle = 'PENGUEN KÜLTÜR',
  userDisplayName = 'Olkan',
  searchQuery,
  onSearchChange,
  onLogout,
  children,
}) => (
  <div className="flex min-h-dvh flex-col bg-[#0b0b10] text-white">
    <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between gap-4 border-b border-[#ff6600]/40 bg-[#0b0b10]/95 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-8 md:py-4">
      <h1 className="text-sm md:text-base font-black tracking-[0.12em] text-[#ff6600] drop-shadow-[0_0_8px_rgba(255,102,0,0.45)] truncate">
        {brandTitle}
      </h1>
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="relative flex-1 min-w-0 max-w-[220px] md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff6600]/80 pointer-events-none" strokeWidth={2.5} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Ara…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-500 bg-black/50 border border-[#ff6600]/50 focus:outline-none focus:ring-2 focus:ring-[#ff6600] focus:border-[#ff6600]"
            autoComplete="off"
          />
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-xs md:text-sm font-bold text-white">{userDisplayName}</span>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-[10px] font-semibold text-zinc-500 hover:text-[#ff6600] transition-colors"
            >
              Çıkış
            </button>
          )}
        </div>
      </div>
    </header>

    <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
  </div>
);
