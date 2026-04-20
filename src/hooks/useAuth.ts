import { useState, useCallback } from 'react';

const AUTH_KEY = 'penguen_auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  });

  const login = useCallback((_user?: { kullanici_adi: string; isim: string }) => {
    setIsAuthenticated(true);
    sessionStorage.setItem(AUTH_KEY, 'true');
  }, []);

  const logout = useCallback(() => {
    const ok = window.confirm('Çıkış yapmak istediğinize emin misiniz?');
    if (!ok) return;
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_KEY);
  }, []);

  return { isAuthenticated, login, logout };
}
