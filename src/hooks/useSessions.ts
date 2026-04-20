import { useState, useEffect, useCallback } from 'react';
import type { ShootingSession } from '../types';
import { fromApiSession } from '../utils/sessionMap';

export function useSessions(isAuthenticated: boolean) {
  const [sessions, setSessions] = useState<ShootingSession[]>([]);
  const [loading, setLoading] = useState(true);

  /** GET /api/sessions — listeyi sunucudan yeniler */
  const getSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('sessions fetch failed');
      const data = (await res.json()) as Record<string, unknown>[];
      setSessions(data.map((row) => fromApiSession(row)));
    } catch (err) {
      console.error('Failed to fetch sessions from API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getSessions();
  }, [isAuthenticated, getSessions]);

  /** POST /api/sessions — yeni çekim veya güncelleme (upsert) */
  const saveSession = useCallback(async (session: ShootingSession) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...session,
          notes: session.notes ?? '',
        }),
      });
      if (!res.ok) console.error('Failed to save session:', await res.text());
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  }, []);

  const addSession = saveSession;
  const updateSession = saveSession;

  /** DELETE /api/sessions/:id */
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (err) {
      console.error('Failed to delete session:', err);
      return false;
    }
  }, []);

  return {
    sessions,
    setSessions,
    loading,
    /** @deprecated use getSessions */
    refetch: getSessions,
    getSessions,
    addSession,
    updateSession,
    saveSession,
    deleteSession,
  };
}
