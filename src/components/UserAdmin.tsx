import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, RefreshCw, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface KullaniciApi {
  kullanici_adi: string;
  isim: string;
  durum: string;
  sifre: string;
}

function normDurum(d: string): boolean {
  return (d || '').trim().toLocaleLowerCase('tr-TR') === 'aktif';
}

export const UserAdmin: React.FC = () => {
  const [rows, setRows] = useState<KullaniciApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [isim, setIsim] = useState('');
  const [sifre, setSifre] = useState('');
  const [durumYeni, setDurumYeni] = useState<'aktif' | 'pasif'>('aktif');
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/kullanicilar');
      if (!res.ok) throw new Error('Liste alınamadı');
      const data = (await res.json()) as KullaniciApi[];
      setRows(data);
    } catch {
      setError('Kullanıcılar yüklenemedi. Sunucu ve Sheets bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleYeni = async (e: React.FormEvent) => {
    e.preventDefault();
    const ad = kullaniciAdi.trim();
    if (!ad) return;
    setSavingNew(true);
    setError('');
    try {
      const body: KullaniciApi = {
        kullanici_adi: ad,
        isim: isim.trim(),
        durum: durumYeni,
        sifre: sifre,
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
      setError('Kullanıcı eklenemedi veya güncellenemedi.');
    } finally {
      setSavingNew(false);
    }
  };

  const toggleDurum = async (u: KullaniciApi) => {
    const next = normDurum(u.durum) ? 'pasif' : 'aktif';
    setBusyKey(u.kullanici_adi);
    setError('');
    try {
      const res = await fetch(`/api/kullanicilar/${encodeURIComponent(u.kullanici_adi)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kullanici_adi: u.kullanici_adi,
          isim: u.isim,
          sifre: u.sifre || '',
          durum: next,
        }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('Durum güncellenemedi.');
    } finally {
      setBusyKey(null);
    }
  };

  const sil = async (u: KullaniciApi) => {
    if (!window.confirm(`${u.kullanici_adi} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    setBusyKey(u.kullanici_adi);
    setError('');
    try {
      const res = await fetch(`/api/kullanicilar/${encodeURIComponent(u.kullanici_adi)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('Silinemedi.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Kullanıcı yönetimi</h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Google Sheets &quot;kullanicilar&quot; sekmesi ile senkron. Yeni kullanıcı, durum ve silme işlemleri buradan yapılır.
        </p>
      </div>

      <form
        onSubmit={handleYeni}
        className="bg-white rounded-[1.5rem] border border-orange-200 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-orange-700 font-black text-sm uppercase tracking-widest">
          <UserPlus size={20} />
          Yeni kullanıcı
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kullanıcı adı *</label>
            <input
              type="text"
              required
              value={kullaniciAdi}
              onChange={(e) => setKullaniciAdi(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
              placeholder="örnek_kullanici"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İsim</label>
            <input
              type="text"
              value={isim}
              onChange={(e) => setIsim(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
              placeholder="Görünen ad"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Şifre</label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
              placeholder="Giriş şifresi"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Başlangıç durumu</label>
            <select
              value={durumYeni}
              onChange={(e) => setDurumYeni(e.target.value as 'aktif' | 'pasif')}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-white"
            >
              <option value="aktif">aktif</option>
              <option value="pasif">pasif</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingNew}
          className="w-full sm:w-auto px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {savingNew ? <Loader2 size={18} className="animate-spin" /> : null}
          {savingNew ? 'Kaydediliyor…' : 'Ekle veya güncelle'}
        </button>
        <p className="text-[10px] text-slate-400">
          Aynı kullanıcı adı zaten varsa satır güncellenir (isim, şifre, durum).
        </p>
      </form>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-slate-800">Kayıtlı kullanıcılar ({rows.length})</h4>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-black text-slate-500 text-[10px] uppercase tracking-widest">Kullanıcı adı</th>
                  <th className="px-4 py-3 font-black text-slate-500 text-[10px] uppercase tracking-widest">İsim</th>
                  <th className="px-4 py-3 font-black text-slate-500 text-[10px] uppercase tracking-widest">Durum</th>
                  <th className="px-4 py-3 font-black text-slate-500 text-[10px] uppercase tracking-widest text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium">
                      Henüz kullanıcı yok veya liste boş.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => {
                    const aktif = normDurum(u.durum);
                    const busy = busyKey === u.kullanici_adi;
                    return (
                      <tr key={u.kullanici_adi} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-900 break-all">{u.kullanici_adi}</td>
                        <td className="px-4 py-3 text-slate-700">{u.isim || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                              aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {aktif ? 'aktif' : (u.durum || 'pasif').trim() || 'pasif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void toggleDurum(u)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-orange-50 text-slate-600 disabled:opacity-50"
                              title={aktif ? 'Pasifleştir' : 'Aktifleştir'}
                            >
                              {busy ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : aktif ? (
                                <ToggleRight size={20} className="text-emerald-600" />
                              ) : (
                                <ToggleLeft size={20} className="text-slate-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void sil(u)}
                              className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Sil"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
