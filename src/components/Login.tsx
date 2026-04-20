import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { SmartInput } from './SmartInput';

export interface KullaniciRow {
  kullanici_adi: string;
  isim: string;
  durum: string;
  sifre: string;
}

interface LoginProps {
  onLogin: (user: { kullanici_adi: string; isim: string }) => void;
}

function isDurumAktif(durum: string): boolean {
  const v = (durum || '').trim().toLocaleLowerCase('tr-TR');
  if (v === '') return true;
  return ['aktif', 'active', 'evet', '1', 'true', 'on', 'açık', 'acik'].includes(v);
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/kullanicilar');
      if (!res.ok) {
        setError('Kullanıcı listesi alınamadı. Sunucuyu kontrol edin.');
        return;
      }
      const list = (await res.json()) as KullaniciRow[];
      const girilenKullaniciAdi = kullaniciAdi.trim();
      const row = list.find((r) => r.kullanici_adi === girilenKullaniciAdi);
      if (!row) {
        setError('Bu kullanıcı adı ile kayıtlı kullanıcı bulunamadı.');
        return;
      }
      if (!isDurumAktif(row.durum)) {
        setError('Hesabınız pasif. Yönetici ile iletişime geçin.');
        return;
      }
      if ((row.sifre || '').trim() !== password.trim()) {
        setError('Geçersiz kullanıcı adı veya şifre.');
        return;
      }
      onLogin({ kullanici_adi: (row.kullanici_adi || '').trim(), isim: (row.isim || '').trim() });
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b10] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-15%] top-[-20%] h-[45%] w-[45%] rounded-full bg-[#ff6600]/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[40%] w-[40%] rounded-full bg-[#ff6600]/5 blur-[100px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-2xl border border-[#ff6600]/35 bg-white/5 shadow-[0_0_40px_rgba(255,102,0,0.12)] backdrop-blur-[12px]">
          <div className="px-8 py-10 lg:px-10 lg:py-12">
            <div className="mb-10 flex flex-col items-center text-center">
              <img
                src="/penguenlogo1.png?v=20260420e"
                alt="Penguen Kültür"
                className="mx-auto h-32 w-auto max-w-[280px] object-contain md:h-36"
              />
              <p className="mt-6 text-xl font-black text-[#ff6600] md:text-2xl">Çekim Programı</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Kullanıcı Adı</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#ff6600]/80">
                    <User size={18} />
                  </div>
                  <SmartInput
                    storageKey="login_kullanici_adi"
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    className="w-full rounded-xl border border-[#ff6600]/50 bg-black/70 py-3.5 pl-12 pr-4 text-sm font-semibold text-white placeholder:text-zinc-500 focus:border-[#ff6600] focus:outline-none focus:ring-2 focus:ring-[#ff6600]/35"
                    placeholder="Sheets kullanıcı adınız"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Şifre</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff6600]/80">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#ff6600]/50 bg-black/70 py-3.5 pl-12 pr-4 text-sm font-semibold text-white placeholder:text-zinc-500 focus:border-[#ff6600] focus:outline-none focus:ring-2 focus:ring-[#ff6600]/35"
                    placeholder="Şifreniz"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-300"
                >
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6600] py-3.5 text-sm font-black text-black shadow-[0_8px_24px_rgba(255,102,0,0.25)] transition-all hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
              >
                {loading ? 'Kontrol ediliyor…' : 'Giriş Yap'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
            <p className="mt-8 border-t border-white/10 pt-6 text-center text-[11px] text-zinc-400">
              Şifrenizi unuttuysanız program yöneticisine başvurun.{' '}
              <a
                href="mailto:olkanozyurt@gmail.com"
                className="inline font-semibold text-[#ff6600] underline-offset-2 hover:underline whitespace-nowrap"
              >
                e-posta: olkanozyurt@gmail.com
              </a>
            </p>
          </div>
        </div>
      </motion.div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff6600]/65">
        © Olkano
      </p>
    </div>
  );
};
