import React from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ShootingSession } from '../types';
import { cn } from '../utils/cn';

export interface SessionDetailProps {
  session: ShootingSession;
  /** Planlı listeler için mavi üst çizgi, biten için kırmızı */
  variant: 'planned' | 'completed';
  onClose: () => void;
}

function buildWhatsAppText(session: ShootingSession): string {
  const tarih = format(parseISO(session.startTime), 'd MMMM yyyy', { locale: tr });
  const saat = format(parseISO(session.startTime), 'HH:mm');
  const gunAdi = format(parseISO(session.startTime), 'EEEE', { locale: tr });
  const mods = session.moderators.length > 0 ? session.moderators.join(', ') : '-';
  const guests = session.guests.length > 0 ? session.guests.join(', ') : '-';
  const notes = session.notes?.trim() ? session.notes : '-';
  const category = (session.category || 'DİĞER').trim();

  const lines = [
    '-----------------------------',
    '    PENGUEN KÜLTÜR 🐧',
    '    Çekim Bilgileri',
    '-----------------------------',
    `🎬 PROGRAM: ${session.programName} - ${session.title}`,
    `🏷️ TÜRÜ: ${category}`,
    '',
    `📆 TARİH: ${tarih} ${gunAdi}`,
    `⏰ SAAT: ${saat}`,
    '',
    `📌 YER: ${session.location}`,
    `🎥 ÇEKİM TÜRÜ: ${session.shootingType}`,
    '',
    `👤 MODERATÖR: ${mods}`,
    `👥 KONUKLAR: ${guests}`,
    `📄 NOTLAR: ${notes}`,
    '-----------------------------',
  ];

  return lines.join('\n');
}

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, variant, onClose }) => {
  const tarih = format(parseISO(session.startTime), 'd MMMM yyyy', { locale: tr });
  const saat = format(parseISO(session.startTime), 'HH:mm');
  const gunAdi = format(parseISO(session.startTime), 'EEEE', { locale: tr });
  const category = (session.category || 'DİĞER').trim();
  const mods = session.moderators.length > 0 ? session.moderators.join(', ') : '-';
  const guests = session.guests.length > 0 ? session.guests.join(', ') : '-';
  const notesText = session.notes?.trim() ? session.notes : '-';

  const handleShare = () => {
    const text = buildWhatsAppText(session);
    const encoded = encodeURIComponent(text);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else {
      const desktopLink = `whatsapp://send?text=${encoded}`;
      window.location.href = desktopLink;

      setTimeout(() => {
        window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
      }, 1500);
    }
  };

  const cardClass = 'bg-gray-800/50 rounded-lg p-3 mb-3 text-left';

  return (
    <div className="mx-auto h-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#ff6600]/30 bg-[rgba(255,255,255,0.05)] text-left shadow-lg backdrop-blur-[10px]">
      <div className={cn('h-1.5 w-full shrink-0', variant === 'completed' ? 'bg-red-500' : 'bg-blue-500')} />

      <div className="p-6 text-left">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ff6600]/40 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
          >
            Kapat
          </button>
        </div>

        <div className="mb-2 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4">
          <h2 className="text-2xl font-bold text-white">{session.programName}</h2>
          <p className="text-orange-400 font-semibold sm:justify-self-end sm:text-right">🏷️ {category}</p>
        </div>

        <p className="mb-6 text-gray-300">Bölüm: {session.title}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={cardClass}>
            <span className="text-white">
              📆 {tarih} {gunAdi}
            </span>
          </div>
          <div className={cardClass}>
            <span className="text-white">⏰ {saat}</span>
          </div>
        </div>

        <div className={cardClass}>
          <span className="text-white">📌 {session.location}</span>
        </div>

        <div className={cardClass}>
          <span className="text-white">🎥 {session.shootingType}</span>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-bold text-orange-400">👤 MODERATÖRLER</div>
          <div className="mt-1 text-white">{mods}</div>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-bold text-orange-400">👥 KONUKLAR</div>
          <div className="mt-1 text-white">{guests}</div>
        </div>

        <div className={cardClass}>
          <div className="text-xs font-bold text-orange-400">📄 NOTLAR</div>
          <div className="mt-1 text-white italic">{notesText}</div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-lg bg-[#ff6600] py-3 font-bold text-black"
        >
          📤 PAYLAŞ
        </button>
      </div>
    </div>
  );
};
