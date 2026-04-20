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
import { Calendar as CalendarIcon, CheckCircle, Edit, Filter, Trash2 } from 'lucide-react';
import type { ShootingSession, ShootingStatus } from './types';
import { STATUS_COLORS } from './types';
import { Login } from './components/Login';
import { SessionForm } from './components/SessionForm';
import { SessionDetail } from './components/SessionDetail';
import { UserManagement } from './components/UserManagement';
import { useAuth } from './hooks/useAuth';
import { useSessions } from './hooks/useSessions';
import { exportSessionsToExcel } from './utils/exportExcel';
import { cn } from './utils/cn';

const cardClass =
  'rounded-2xl border border-[#ff6600] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] shadow-[0_0_20px_rgba(255,102,0,0.12)]';

type MenuKey = 'new' | 'planned' | 'completed' | 'calendar';
type CalendarView = 'weekly' | 'monthly';

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
        .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()),
    [filteredSessions]
  );

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
    if (userPassword === '12345') {
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
        'rounded-xl border p-4 transition-all',
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
        <h4 className="text-lg font-black text-white">{s.programName}</h4>
        <p className="text-sm text-zinc-300">BÖLÜM: {s.title}</p>
        <p className="text-xs text-zinc-400 mt-1">
          {format(parseISO(s.startTime), 'd MMMM yyyy HH:mm', { locale: tr })} • {s.location}
        </p>
      </button>
      <div className="mt-3 flex gap-2">
        {tone === 'blue' && (
          <>
            <button
              type="button"
              onClick={() => void handleUpdateStatus(s.id, 'Tamamlandı')}
              className="px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-black uppercase tracking-wide flex items-center gap-1"
            >
              <CheckCircle size={14} /> Tamamlandı
            </button>
            <button
              type="button"
              onClick={() => openInlineEdit(s)}
              className="px-3 py-2 rounded-lg border border-orange-400/40 text-orange-300 hover:bg-orange-500/10 text-xs font-black uppercase tracking-wide flex items-center gap-1"
            >
              <Edit size={14} /> Düzenle
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => void confirmAndDelete(s.id)}
          className="px-3 py-2 rounded-lg border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-xs font-black uppercase tracking-wide flex items-center gap-1"
        >
          <Trash2 size={14} /> Sil
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
    <div className="min-h-screen bg-[#0b0b10] text-white">
      <header className="border-b border-[#ff6600]/30 bg-[#0b0b10]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 flex items-center justify-between gap-3">
          <img src="/penguenlogo1.png" alt="Penguen Kültür" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff6600]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara..."
                className="pl-9 pr-3 py-2 rounded-lg text-sm bg-black/40 border border-[#ff6600]/40 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setUserPasswordOpen(true);
                setUserPassword('');
                setPasswordError('');
              }}
              className="font-semibold text-white hover:text-[#ff6600] transition-colors"
            >
              Yönetici
            </button>
            <button
              type="button"
              onClick={logout}
              className="text-xs px-3 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              Çıkış
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-3 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                    'w-full px-3 py-2 rounded-lg text-xs md:text-sm font-bold tracking-wide transition-colors border bg-transparent',
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
          <p className="mt-2 text-[11px] text-zinc-500">
            Klavye: ← → menü ve içerik birlikte değişir; Enter odakta farklıysa uygular. Fareyle üzerine gelince vurgu.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-[#ff6600] border-t-transparent animate-spin" />
            <p className="text-sm text-[#ff6600] font-semibold">Yükleniyor…</p>
          </div>
        ) : (
          <div className={cn(cardClass, 'p-4 md:p-5 min-h-[60vh]')}>
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
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6600]">
                    Planlı Çekimler <span className="text-white">({planned.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => void exportSessionsToExcel(sessions, 'all')}
                    className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide border border-[#ff6600]/45 text-[#ff6600] hover:bg-[#ff6600]/10"
                  >
                    Dışa Aktar
                  </button>
                </div>
                <div className="grid gap-3">
                  {planned.map((s) => renderSessionCard(s, 'blue'))}
                </div>
              </div>
            )}

            {!isUserPanelOpen && viewMode === 'completed' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#ff6600]">Biten Çekimler</h2>
                  <button
                    type="button"
                    onClick={() => void exportSessionsToExcel(sessions, 'completed')}
                    className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide border border-[#ff6600]/45 text-[#ff6600] hover:bg-[#ff6600]/10"
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
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const items = sessionsOnDay(day);
                      return (
                        <div key={day.toISOString()} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2 min-h-[160px]">
                          <div className="text-xs font-black text-[#ff6600] mb-1">
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
                                  <div className="font-black text-zinc-100 truncate">{s.programName}</div>
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
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((day) => {
                      const items = sessionsOnDay(day);
                      const inMonth = isSameMonth(day, monthStart);
                      return (
                        <div key={day.toISOString()} className="min-w-0 rounded-md border border-white/10 p-1.5 min-h-[92px] bg-black/20">
                          <div className={cn('text-[11px] font-black mb-1', inMonth ? 'text-zinc-100' : 'text-zinc-500')}>
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
                                    'w-full text-left rounded border px-1 py-0.5 text-[10px]',
                                    s.status === 'Tamamlandı' ? 'border-red-500/30 bg-red-500/20' : 'border-blue-500/30 bg-blue-500/20'
                                  )}
                                >
                                  <div className="font-black text-zinc-100 truncate">{s.programName}</div>
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

    </div>
  );
}
