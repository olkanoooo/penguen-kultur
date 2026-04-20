import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon, CalendarCheck, CalendarPlus2, Filter, Sunrise } from 'lucide-react';
import type { ShootingSession, ShootingStatus } from './types';
import { STATUS_COLORS } from './types';
import { Login } from './components/Login';
import { SessionForm } from './components/SessionForm';
import { SessionDetail } from './components/SessionDetail';
import { UserManagement } from './components/UserManagement';
import { useAuth } from './hooks/useAuth';
import { useSessions } from './hooks/useSessions';
import { exportSessionsToExcel } from './utils/exportExcel';
import { formatTimestampIstanbul, formatYmdInIstanbul, getQuickFilterTargetYmd } from './utils/istanbulDate';
import { cn } from './utils/cn';

const cardClass =
  'rounded-2xl border border-[#ff6600] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] shadow-[0_0_20px_rgba(255,102,0,0.12)]';

type MenuKey = 'new' | 'planned' | 'completed' | 'calendar';
type CalendarView = 'weekly' | 'monthly';
type PlannedQuickDay = 'today' | 'tomorrow' | 'dayAfter';

interface InlineEditorState {
  sessionId: string;
  open: boolean;
}

const MENU_ITEMS: Array<{ key: MenuKey; label: string }> = [
  { key: 'new', label: 'YENİ ÇEKİM' },
  { key: 'planned', label: 'PLANLI ÇEKİMLER' },
  { key: 'completed', label: 'BİTEN ÇEKİMLER' },
  { key: 'calendar', label: 'TAKVİM' },
];

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();
  const { sessions, setSessions, loading, addSession, updateSession, deleteSession } = useSessions(isAuthenticated);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'new' | 'list' | 'completed' | 'calendar'>('new');
  const [menuFocus, setMenuFocus] = useState<MenuKey>('new');
  const [calendarView, setCalendarView] = useState<CalendarView>('weekly');

  const [createOpen, setCreateOpen] = useState(true);
  const [editingSession, setEditingSession] = useState<ShootingSession | null>(null);
  const [moderatorInputs, setModeratorInputs] = useState<string[]>(['']);
  const [guestInputs, setGuestInputs] = useState<string[]>(['']);
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(null);

  const [selectedSession, setSelectedSession] = useState<ShootingSession | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [userPasswordOpen, setUserPasswordOpen] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [plannedQuickDay, setPlannedQuickDay] = useState<PlannedQuickDay | null>(null);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLocaleLowerCase('tr-TR').trim();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const mods = s.moderators ?? [];
      const gue = s.guests ?? [];
      return (
        s.programName.toLocaleLowerCase('tr-TR').includes(q) ||
        s.title.toLocaleLowerCase('tr-TR').includes(q) ||
        s.location.toLocaleLowerCase('tr-TR').includes(q) ||
        (s.category || '').toLocaleLowerCase('tr-TR').includes(q) ||
        mods.some((m) => m.toLocaleLowerCase('tr-TR').includes(q)) ||
        gue.some((g) => g.toLocaleLowerCase('tr-TR').includes(q))
      );
    });
  }, [sessions, searchQuery]);

  const planned = useMemo(
    () =>
      filteredSessions
        .filter((s) => s.status !== 'Tamamlandı' && s.status !== 'İptal Edildi')
        .sort((a, b) => {
          const t = parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
          if (t !== 0) return t;
          return a.programName.localeCompare(b.programName, 'tr');
        }),
    [filteredSessions]
  );

  const plannedFiltered = useMemo(() => {
    if (!plannedQuickDay) return planned;
    const targetYmd = getQuickFilterTargetYmd(plannedQuickDay);
    return planned.filter((s) => formatYmdInIstanbul(parseISO(s.startTime)) === targetYmd);
  }, [planned, plannedQuickDay]);

  const completed = useMemo(
    () =>
      filteredSessions
        .filter((s) => s.status === 'Tamamlandı')
        .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()),
    [filteredSessions]
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays = useMemo(() => {
    const arr: Date[] = [];
    let d = monthGridStart;
    while (d <= monthGridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [monthGridStart, monthGridEnd]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const sessionsOnDay = useCallback(
    (day: Date) =>
      filteredSessions
        .filter((s) => isSameDay(parseISO(s.startTime), day) && s.status !== 'İptal Edildi')
        .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()),
    [filteredSessions]
  );

  const openNewSession = useCallback(() => {
    setViewMode('new');
    setCreateOpen(true);
    setEditingSession(null);
    setModeratorInputs(['']);
    setGuestInputs(['']);
    setInlineEditor(null);
  }, []);

  const applyMenuKey = useCallback(
    (key: MenuKey) => {
      setMenuFocus(key);
      if (key === 'new') {
        openNewSession();
      } else if (key === 'planned') {
        setViewMode('list');
      } else if (key === 'completed') {
        setViewMode('completed');
      } else if (key === 'calendar') {
        setViewMode('calendar');
        setCalendarView('weekly');
      }
    },
    [openNewSession]
  );

  const openInlineEdit = (session: ShootingSession) => {
    setEditingSession(session);
    setModeratorInputs(session.moderators.length > 0 ? session.moderators : ['']);
    setGuestInputs(session.guests.length > 0 ? session.guests : ['']);
    setInlineEditor({ sessionId: session.id, open: true });
  };

  const closeInlineEdit = () => {
    setInlineEditor(null);
    setEditingSession(null);
    setModeratorInputs(['']);
    setGuestInputs(['']);
  };

  const handleCreateSubmit = async (session: ShootingSession) => {
    setSessions((prev) => [...prev, session]);
    await addSession(session);
    setCreateOpen(false);
    setModeratorInputs(['']);
    setGuestInputs(['']);
    setViewMode('list');
  };

  const handleInlineUpdateSubmit = async (session: ShootingSession) => {
    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    await updateSession(session);
    closeInlineEdit();
  };

  const handleUpdateStatus = async (sessionId: string, newStatus: ShootingStatus) => {
    const updated = sessions.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s));
    setSessions(updated);
    const target = updated.find((s) => s.id === sessionId);
    if (target) await updateSession(target);
    setSelectedSession(null);
    setIsDetailOpen(false);
  };

  const confirmAndDelete = async (sessionId: string) => {
    const ok = window.confirm('Emin misin?');
    if (!ok) return;
    const deleted = await deleteSession(sessionId);
    if (deleted) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setIsDetailOpen(false);
      }
    }
  };

  useEffect(() => {
    if (viewMode === 'new') setMenuFocus('new');
    else if (viewMode === 'list') setMenuFocus('planned');
    else if (viewMode === 'completed') setMenuFocus('completed');
    else if (viewMode === 'calendar') setMenuFocus('calendar');
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'list') setPlannedQuickDay(null);
  }, [viewMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const idx = MENU_ITEMS.findIndex((m) => m.key === menuFocus);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = MENU_ITEMS[(idx + 1) % MENU_ITEMS.length].key;
        applyMenuKey(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = MENU_ITEMS[(idx - 1 + MENU_ITEMS.length) % MENU_ITEMS.length].key;
        applyMenuKey(next);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const alreadyOnTarget =
          (menuFocus === 'new' && viewMode === 'new') ||
          (menuFocus === 'planned' && viewMode === 'list') ||
          (menuFocus === 'completed' && viewMode === 'completed') ||
          (menuFocus === 'calendar' && viewMode === 'calendar');
        if (alreadyOnTarget) return;
        applyMenuKey(menuFocus);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuFocus, viewMode, applyMenuKey]);

  useEffect(() => {
    const handleDetailKeys = (e: KeyboardEvent) => {
      if (!isDetailOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'Escape') {
        setIsDetailOpen(false);
        setSelectedSession(null);
      }
    };
    window.addEventListener('keydown', handleDetailKeys);
    return () => window.removeEventListener('keydown', handleDetailKeys);
  }, [isDetailOpen]);

  useEffect(() => {
    if (!isDetailOpen || !selectedSession) return;
    const id = selectedSession.id;
    const run = () => {
      const el = document.getElementById(`session-detail-anchor-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [isDetailOpen, selectedSession?.id]);

  const handleUserPasswordSubmit = () => {
    if (userPassword === '396857') {
      setIsUserPanelOpen(true);
      setUserPasswordOpen(false);
      setUserPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Şifre hatalı');
    }
  };

  if (!isAuthenticated) return <Login onLogin={login} />;

  const menuActive = (k: MenuKey) =>
    (k === 'new' && viewMode === 'new') ||
    (k === 'planned' && viewMode === 'list') ||
    (k === 'completed' && viewMode === 'completed') ||
    (k === 'calendar' && viewMode === 'calendar');

  const renderSessionCard = (s: ShootingSession, tone: 'blue' | 'red') => (
    <div
      key={s.id}
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border p-4 transition-all',
        tone === 'blue' ? 'bg-blue-500/10 border-blue-500' : 'bg-red-500/10 border-red-500'
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => {
          setSelectedSession(s);
          setIsDetailOpen(true);
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {tone === 'blue' && (
            <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border', STATUS_COLORS[s.status])}>{s.status}</span>
          )}
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-white/10 border border-white/10">{s.category || 'Diğer'}</span>
          {tone === 'blue' && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-white/10 border border-white/10">{s.shootingType}</span>
          )}
        </div>
        <h4 className="break-words text-lg font-black text-white">{s.programName}</h4>
        <p className="break-words text-sm text-zinc-300">BÖLÜM: {s.title}</p>
        <p className="break-words text-xs text-zinc-400 mt-1">
          {format(parseISO(s.startTime), 'd MMMM yyyy HH:mm', { locale: tr })} • {s.location}
        </p>
      </button>
      <div className="mt-3 flex max-sm:flex-col max-sm:gap-2 sm:flex-row sm:gap-2">
        {tone === 'blue' && (
          <>
            <button
              type="button"
              onClick={() => void handleUpdateStatus(s.id, 'Tamamlandı')}
              className="w-full max-sm:min-h-[44px] rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/10 sm:w-auto"
            >
              Tamamlandı
            </button>
            <button
              type="button"
              onClick={() => openInlineEdit(s)}
              className="w-full max-sm:min-h-[44px] rounded-lg border border-orange-400/40 px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-300 hover:bg-orange-500/10 sm:w-auto"
            >
              Düzenle
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => void confirmAndDelete(s.id)}
          className="w-full max-sm:min-h-[44px] rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-black uppercase tracking-wide text-rose-300 hover:bg-rose-500/10 sm:w-auto"
        >
          Sil
        </button>
      </div>

      {tone === 'blue' && inlineEditor?.open && inlineEditor.sessionId === s.id && editingSession && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <SessionForm
            open={true}
            editingSession={editingSession}
            moderatorInputs={moderatorInputs}
            guestInputs={guestInputs}
            setModeratorInputs={setModeratorInputs}
            setGuestInputs={setGuestInputs}
            onClose={closeInlineEdit}
            onSubmit={handleInlineUpdateSubmit}
            variant="inline"
          />
        </div>
      )}

      {isDetailOpen && selectedSession?.id === s.id && (
        <div id={`session-detail-anchor-${s.id}`} className="mt-4 scroll-mt-28">
          <SessionDetail
            session={selectedSession}
            variant={selectedSession.status === 'Tamamlandı' ? 'completed' : 'planned'}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedSession(null);
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b10] text-white">
      <header className="sticky top-0 z-50 border-b border-[#ff6600]/30 bg-[#0b0b10]/95 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <img
            src="/penguenlogo1.png?v=20260420e"
            alt="Penguen Kültür"
            className="h-14 w-auto max-w-[68vw] object-contain md:h-16 md:max-w-[360px] max-sm:col-start-1 max-sm:row-start-1"
          />
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 max-sm:col-start-2 max-sm:row-start-1 sm:order-last"
          >
            Çıkış
          </button>
          <div className="relative min-w-0 max-sm:col-span-2 max-sm:row-start-2 sm:max-w-md sm:flex-1">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff6600]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="w-full min-w-0 rounded-lg border border-[#ff6600]/40 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setUserPasswordOpen(true);
              setUserPassword('');
              setPasswordError('');
            }}
            className="whitespace-nowrap font-semibold text-white transition-colors hover:text-[#ff6600] max-sm:col-span-2 max-sm:row-start-3 max-sm:justify-self-end"
          >
            Yönetici
          </button>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-3 md:px-6">
          <div className="grid grid-cols-2 gap-3 max-sm:gap-3 md:grid-cols-4">
            {MENU_ITEMS.map((item) => {
              const isActive = menuActive(item.key);
              const roving = !isActive && menuFocus === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => setMenuFocus(item.key)}
                  onFocus={() => setMenuFocus(item.key)}
                  onClick={() => applyMenuKey(item.key)}
                  className={cn(
                    'flex min-h-[60px] w-full items-center justify-center rounded-md border bg-transparent px-3 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors md:min-h-[68px] md:px-4 md:py-4 md:text-base',
                    isActive
                      ? 'border-[#ff6600] bg-[#ff6600] text-black hover:border-[#ff6600] hover:bg-[#ff6600] hover:text-black'
                      : cn(
                          'border-[#ff6600]/40 text-zinc-300',
                          'hover:border-[#ff6600] hover:bg-[#ff6600]/10 hover:text-[#ff6600]',
                          roving && 'border-[#ff6600] bg-[#ff6600]/10 text-[#ff6600]'
                        )
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-x-hidden bg-[#0b0b10] px-4 py-4 max-sm:px-3 max-sm:pb-6 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-[#ff6600] border-t-transparent animate-spin" />
            <p className="text-sm text-[#ff6600] font-semibold">Yükleniyor…</p>
          </div>
        ) : (
          <div className={cn(cardClass, 'min-h-0 w-full min-w-0 max-w-full p-4 max-sm:p-3 md:p-5 min-h-[50vh] max-sm:min-h-[45vh] sm:min-h-[60vh]')}>
            {isUserPanelOpen && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6600]">Yönetici Paneli</h2>
                  <button
                    type="button"
                    onClick={() => setIsUserPanelOpen(false)}
                    className="px-3 py-2 rounded-lg border border-[#ff6600]/45 text-[#ff6600] text-xs font-black uppercase tracking-wide hover:bg-[#ff6600]/10"
                  >
                    Kapat
                  </button>
                </div>
                <UserManagement />
              </div>
            )}

            {!isUserPanelOpen && viewMode === 'new' && (
              <div>
                <h2 className="text-lg font-black text-[#ff6600] mb-3">Yeni Çekim Planla</h2>
                {createOpen && (
                  <SessionForm
                    open={true}
                    editingSession={null}
                    moderatorInputs={moderatorInputs}
                    guestInputs={guestInputs}
                    setModeratorInputs={setModeratorInputs}
                    setGuestInputs={setGuestInputs}
                    onClose={() => setCreateOpen(false)}
                    onSubmit={handleCreateSubmit}
                    variant="inline"
                  />
                )}
              </div>
            )}

            {!isUserPanelOpen && viewMode === 'list' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6600]">
                      Planlı Çekimler <span className="text-white">({plannedFiltered.length})</span>
                    </h2>
                    <div
                      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[#ff6600]/35 bg-black/30 p-0.5"
                      role="group"
                      aria-label="Güne göre hızlı filtre"
                    >
                      <button
                        type="button"
                        title="Bugün"
                        aria-pressed={plannedQuickDay === 'today'}
                        onClick={() => setPlannedQuickDay((p) => (p === 'today' ? null : 'today'))}
                        className={cn(
                          'rounded-md p-2 text-[#ff6600] transition-colors hover:bg-[#ff6600]/15',
                          plannedQuickDay === 'today' && 'bg-[#ff6600] text-black'
                        )}
                      >
                        <CalendarCheck size={18} strokeWidth={2.25} aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Yarın"
                        aria-pressed={plannedQuickDay === 'tomorrow'}
                        onClick={() => setPlannedQuickDay((p) => (p === 'tomorrow' ? null : 'tomorrow'))}
                        className={cn(
                          'rounded-md p-2 text-[#ff6600] transition-colors hover:bg-[#ff6600]/15',
                          plannedQuickDay === 'tomorrow' && 'bg-[#ff6600] text-black'
                        )}
                      >
                        <Sunrise size={18} strokeWidth={2.25} aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Öbür gün"
                        aria-pressed={plannedQuickDay === 'dayAfter'}
                        onClick={() => setPlannedQuickDay((p) => (p === 'dayAfter' ? null : 'dayAfter'))}
                        className={cn(
                          'rounded-md p-2 text-[#ff6600] transition-colors hover:bg-[#ff6600]/15',
                          plannedQuickDay === 'dayAfter' && 'bg-[#ff6600] text-black'
                        )}
                      >
                        <CalendarPlus2 size={18} strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void exportSessionsToExcel(sessions, 'all', {
                        plannedSubset: plannedFiltered,
                        archiveNote: `Dışa aktarım: ${formatTimestampIstanbul()} (Europe/Istanbul) | Planlı liste filtresi: ${
                          !plannedQuickDay ? 'Tümü' : plannedQuickDay === 'today' ? 'Bugün' : plannedQuickDay === 'tomorrow' ? 'Yarın' : 'Öbür gün'
                        } | Bu dosyadaki planlı satır: ${plannedFiltered.length} | Tamamlanan bölüm: tüm arşiv (filtre uygulanmadı).`,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide border border-[#ff6600]/45 text-[#ff6600] hover:bg-[#ff6600]/10 max-sm:shrink-0 sm:w-auto"
                  >
                    Dışa Aktar
                  </button>
                </div>
                {plannedFiltered.length === 0 && (
                  <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-400">
                    {plannedQuickDay
                      ? 'Bu güne ait planlı çekim yok. Başka güne geçin veya aynı simgeye tekrar basarak filtreyi kaldırın.'
                      : 'Planlı çekim bulunmuyor.'}
                  </p>
                )}
                <div className="grid gap-3">
                  {plannedFiltered.map((s) => renderSessionCard(s, 'blue'))}
                </div>
              </div>
            )}

            {!isUserPanelOpen && viewMode === 'completed' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6600]">Biten Çekimler</h2>
                  <button
                    type="button"
                    onClick={() =>
                      void exportSessionsToExcel(sessions, 'completed', {
                        archiveNote: `Dışa aktarım: ${formatTimestampIstanbul()} (Europe/Istanbul) | Liste: Tamamlanan çekimler.`,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide border border-[#ff6600]/45 text-[#ff6600] hover:bg-[#ff6600]/10 max-sm:shrink-0 sm:w-auto"
                  >
                    Dışa Aktar
                  </button>
                </div>
                <div className="grid gap-3">
                  {completed.map((s) => renderSessionCard(s, 'red'))}
                </div>
              </div>
            )}

            {!isUserPanelOpen && viewMode === 'calendar' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-[#ff6600] uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon size={16} />
                    {format(currentDate, 'LLLL yyyy', { locale: tr }).toLocaleUpperCase('tr-TR')}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentDate((d) => (calendarView === 'weekly' ? addDays(d, -7) : subMonths(d, 1)))
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#ff6600]/40 text-[#ff6600] text-xs font-black uppercase"
                    >
                      ◀ Önceki {calendarView === 'weekly' ? 'Hafta' : 'Ay'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentDate((d) => (calendarView === 'weekly' ? addDays(d, 7) : addMonths(d, 1)))
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#ff6600]/40 text-[#ff6600] text-xs font-black uppercase"
                    >
                      Sonraki {calendarView === 'weekly' ? 'Hafta' : 'Ay'} ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView('monthly')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-black uppercase',
                        calendarView === 'monthly'
                          ? 'bg-[#ff6600] text-black border-[#ff6600]'
                          : 'border-[#ff6600]/40 text-[#ff6600]'
                      )}
                    >
                      Aylık Görünüm
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView('weekly')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-black uppercase',
                        calendarView === 'weekly'
                          ? 'bg-[#ff6600] text-black border-[#ff6600]'
                          : 'border-[#ff6600]/40 text-[#ff6600]'
                      )}
                    >
                      Haftalık Görünüm
                    </button>
                  </div>
                </div>

                {calendarView === 'weekly' ? (
                  <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-7">
                    {weekDays.map((day) => {
                      const items = sessionsOnDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 p-2 min-h-[120px] max-sm:min-h-0 sm:min-h-[140px]"
                        >
                          <div className="text-xs font-black text-[#ff6600] mb-1 max-sm:text-[11px]">
                            {format(day, 'EEEE', { locale: tr }).toLocaleUpperCase('tr-TR')} {format(day, 'd')}
                          </div>
                          <div className="space-y-2">
                            {items.map((s) => (
                              <div key={s.id} className="min-w-0 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSession(s);
                                    setIsDetailOpen(true);
                                  }}
                                  className={cn(
                                    'w-full text-left rounded-md border p-1.5 text-[11px]',
                                    s.status === 'Tamamlandı' ? 'border-red-500/30 bg-red-500/20' : 'border-blue-500/30 bg-blue-500/20'
                                  )}
                                >
                                  <div className="break-words font-black text-zinc-100">{s.programName}</div>
                                  <div className="text-zinc-400">{format(parseISO(s.startTime), 'HH:mm')}</div>
                                </button>
                                {isDetailOpen && selectedSession?.id === s.id && selectedSession && (
                                  <div id={`session-detail-anchor-${s.id}`} className="scroll-mt-28">
                                    <SessionDetail
                                      session={selectedSession}
                                      variant={selectedSession.status === 'Tamamlandı' ? 'completed' : 'planned'}
                                      onClose={() => {
                                        setIsDetailOpen(false);
                                        setSelectedSession(null);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid w-full min-w-0 grid-cols-7 gap-px max-sm:gap-px sm:gap-1">
                    {monthDays.map((day) => {
                      const items = sessionsOnDay(day);
                      const inMonth = isSameMonth(day, monthStart);
                      return (
                        <div
                          key={day.toISOString()}
                          className="min-h-[64px] min-w-0 overflow-hidden rounded border border-white/10 bg-black/20 p-0.5 sm:min-h-[92px] sm:rounded-md sm:p-1.5"
                        >
                          <div
                            className={cn(
                              'mb-0.5 font-black max-sm:text-[9px] sm:mb-1 sm:text-[11px]',
                              inMonth ? 'text-zinc-100' : 'text-zinc-500'
                            )}
                          >
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1.5">
                            {items.slice(0, 2).map((s) => (
                              <div key={s.id} className="min-w-0 space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSession(s);
                                    setIsDetailOpen(true);
                                  }}
                                  className={cn(
                                    'w-full max-w-full text-left rounded border px-0.5 py-0.5 text-[9px] max-sm:leading-tight sm:px-1 sm:text-[10px]',
                                    s.status === 'Tamamlandı' ? 'border-red-500/30 bg-red-500/20' : 'border-blue-500/30 bg-blue-500/20'
                                  )}
                                >
                                  <div className="break-words font-black text-zinc-100">{s.programName}</div>
                                  <div className="text-zinc-400">{format(parseISO(s.startTime), 'HH:mm')}</div>
                                </button>
                                {isDetailOpen && selectedSession?.id === s.id && selectedSession && (
                                  <div id={`session-detail-anchor-${s.id}`} className="scroll-mt-28">
                                    <SessionDetail
                                      session={selectedSession}
                                      variant={selectedSession.status === 'Tamamlandı' ? 'completed' : 'planned'}
                                      onClose={() => {
                                        setIsDetailOpen(false);
                                        setSelectedSession(null);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {userPasswordOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#ff6600]/40 bg-[#12121a] p-6">
            <h3 className="text-lg font-black text-[#ff6600] mb-2">Yönetici Paneli</h3>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUserPasswordSubmit()}
              className="w-full rounded-lg border border-[#ff6600]/45 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Şifre"
            />
            {passwordError && <p className="text-rose-400 text-xs mt-2">{passwordError}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setUserPasswordOpen(false)} className="py-2 rounded-lg border border-zinc-600 text-zinc-300 text-sm">
                Vazgeç
              </button>
              <button type="button" onClick={handleUserPasswordSubmit} className="py-2 rounded-lg bg-[#ff6600] text-black font-black text-sm">
                Giriş
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#ff6600]/20 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff6600]/65">© Olkano</p>
      </footer>

    </div>
  );
}
