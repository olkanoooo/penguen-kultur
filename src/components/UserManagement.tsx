import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface UserRow {
  kullanici_adi: string;
  isim: string;
  durum: string;
  sifre: string;
}

const isActive = (durum: string) => (durum || '').trim().toLocaleLowerCase('tr-TR') === 'aktif';

export const UserManagement: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [isim, setIsim] = useState('');
  const [sifre, setSifre] = useState('');
  const [durumYeni, setDurumYeni] = useState<'aktif' | 'pasif'>('aktif');
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/kullanicilar');
      if (!res.ok) throw new Error('Liste alınamadı');
      const data = (await res.json()) as UserRow[];
      setRows(data);
    } catch {
      setError('Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullaniciAdi.trim()) return;
    setSavingNew(true);
    setError('');
    try {
      const body: UserRow = {
        kullanici_adi: kullaniciAdi.trim(),
        isim: isim.trim(),
        sifre,
        durum: durumYeni,
      };
      const res = await fetch('/api/kullanicilar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Kayıt başarısız');
      setKullaniciAdi('');
      setIsim('');
      setSifre('');
      setDurumYeni('aktif');
      await load();
    } catch {
      setError('Kullanıcı eklenemedi.');
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!window.confirm(`${user.kullanici_adi} silinsin mi?`)) return;
    setBusyKey(user.kullanici_adi);
    setError('');
    try {
      const res = await fetch(`/api/kullanicilar/${encodeURIComponent(user.kullanici_adi)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi');
      await load();
    } catch {
      setError('Kullanıcı silinemedi.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    const next = isActive(user.durum) ? 'pasif' : 'aktif';
    setBusyKey(user.kullanici_adi);
    setError('');
    try {
      const res = await fetch(`/api/kullanicilar/${encodeURIComponent(user.kullanici_adi)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kullanici_adi: user.kullanici_adi,
          isim: user.isim,
          sifre: user.sifre || '',
          durum: next,
        }),
      });
      if (!res.ok) throw new Error('Durum güncellenemedi');
      await load();
    } catch {
      setError('Durum değiştirilemedi.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ff6600] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] p-5">
        <h3 className="text-xl font-bold text-[#ff6600]">Kullanıcı Yönetimi</h3>

        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            placeholder="Kullanıcı adı"
            required
            className="rounded-lg bg-black/40 border border-[#ff6600]/40 px-3 py-2 text-white placeholder:text-zinc-500 text-sm"
          />
          <input
            type="text"
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
            placeholder="İsim"
            className="rounded-lg bg-black/40 border border-[#ff6600]/40 px-3 py-2 text-white placeholder:text-zinc-500 text-sm"
          />
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder="Şifre"
            className="rounded-lg bg-black/40 border border-[#ff6600]/40 px-3 py-2 text-white placeholder:text-zinc-500 text-sm"
          />
          <select
            value={durumYeni}
            onChange={(e) => setDurumYeni(e.target.value as 'aktif' | 'pasif')}
            className="rounded-lg bg-black/40 border border-[#ff6600]/40 px-3 py-2 text-white text-sm"
          >
            <option value="aktif">aktif</option>
            <option value="pasif">pasif</option>
          </select>
          <button
            type="submit"
            disabled={savingNew}
            className="rounded-lg bg-[#ff6600] text-black font-bold px-3 py-2 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {savingNew ? <Loader2 size={16} className="animate-spin" /> : null}
            Ekle
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-2xl border border-[#ff6600] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] p-5 overflow-x-auto">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin text-[#ff6600]" />
          </div>
        ) : (
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-[#ff6600] font-bold">Kullanıcı adı</th>
                <th className="text-left py-2 text-[#ff6600] font-bold">İsim</th>
                <th className="text-left py-2 text-[#ff6600] font-bold">Durum</th>
                <th className="text-right py-2 text-[#ff6600] font-bold">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = isActive(row.durum);
                const busy = busyKey === row.kullanici_adi;
                return (
                  <tr key={row.kullanici_adi} className="border-b border-white/10">
                    <td className="py-3 pr-3 text-white break-all">{row.kullanici_adi}</td>
                    <td className="py-3 pr-3 text-white">{row.isim || '-'}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-bold border',
                          active
                            ? 'bg-green-500/20 text-green-300 border-green-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        )}
                      >
                        {active ? 'aktif' : 'pasif'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleToggleStatus(row)}
                          className="px-3 py-1.5 rounded-lg border border-[#ff6600] text-[#ff6600] bg-transparent text-xs font-bold disabled:opacity-60"
                        >
                          Durum Değiştir
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(row)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold disabled:opacity-60"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-zinc-400">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
