import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Plus, X } from 'lucide-react';
import { SmartInput } from './SmartInput';
import type { ShootingSession, ShootingType } from '../types';
import { cn } from '../utils/cn';
import { toSentenceCaseTR, toTitleCaseTR, toUpperTR } from '../utils/textTransform';

export interface SessionFormProps {
  open: boolean;
  editingSession: ShootingSession | null;
  moderatorInputs: string[];
  guestInputs: string[];
  setModeratorInputs: React.Dispatch<React.SetStateAction<string[]>>;
  setGuestInputs: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onSubmit: (session: ShootingSession) => Promise<void>;
  variant?: 'modal' | 'inline';
}

export const SessionForm: React.FC<SessionFormProps> = ({
  open,
  editingSession,
  moderatorInputs,
  guestInputs,
  setModeratorInputs,
  setGuestInputs,
  onClose,
  onSubmit,
}) => {
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(() => new Set());
  const [formError, setFormError] = useState('');

  if (!open) return null;

  const handleClose = () => {
    onClose();
    setModeratorInputs(['']);
    setGuestInputs(['']);
    setFieldErrors(new Set());
    setFormError('');
  };

  return (
    <div className="w-full rounded-2xl border border-[#ff6600]/30 bg-[rgba(255,255,255,0.05)] p-3 backdrop-blur-[10px] md:p-4">
      {editingSession && <h3 className="mb-3 text-base md:text-lg font-black text-[#ff6600]">Çekimi Düzenle</h3>}

      {formError && (
        <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          {formError}
        </p>
      )}

      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const nextErr = new Set<string>();
          if (!String(formData.get('programName') ?? '').trim()) nextErr.add('programName');
          if (!String(formData.get('title') ?? '').trim()) nextErr.add('title');
          if (!String(formData.get('location') ?? '').trim()) nextErr.add('location');
          if (!String(formData.get('startDate') ?? '').trim()) nextErr.add('startDate');
          if (!String(formData.get('startTime') ?? '').trim()) nextErr.add('startTime');
          if (!moderatorInputs.some((m) => m.trim() !== '')) nextErr.add('moderators');
          if (nextErr.size > 0) {
            setFieldErrors(nextErr);
            setFormError('Lütfen kırmızı ile vurgulanan zorunlu alanları doldurun (en az bir moderatör).');
            return;
          }
          setFieldErrors(new Set());
          setFormError('');

          const date = formData.get('startDate') as string;
          const time = formData.get('startTime') as string;
          const baseDate = editingSession ? parseISO(editingSession.startTime) : new Date();
          const startDateTime = new Date(baseDate);
          if (date) {
            const parsedDate = new Date(`${date}T00:00`);
            startDateTime.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          }
          if (time) {
            const [hours, minutes] = time.split(':');
            startDateTime.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
          }

          const sessionData: ShootingSession = {
            id: editingSession ? editingSession.id : Math.random().toString(36).slice(2, 11),
            programName: toUpperTR(formData.get('programName') as string),
            title: toSentenceCaseTR(formData.get('title') as string),
            startTime: startDateTime.toISOString(),
            endTime: startDateTime.toISOString(),
            location: toTitleCaseTR(formData.get('location') as string),
            shootingType: formData.get('shootingType') as ShootingType,
            category: formData.get('category') as string,
            crew: editingSession ? editingSession.crew : [],
            moderators: moderatorInputs.filter((m) => m.trim() !== '').map((m) => toTitleCaseTR(m)),
            guests: guestInputs.filter((g) => g.trim() !== '').map((g) => toTitleCaseTR(g)),
            equipment: editingSession ? editingSession.equipment : [],
            status: editingSession ? editingSession.status : 'Planlandı',
            notes: formData.get('notes') as string,
          };

          await onSubmit(sessionData);
          setModeratorInputs(['']);
          setGuestInputs(['']);
          setFieldErrors(new Set());
          setFormError('');
        }}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300">Program Adı</label>
            <SmartInput
              storageKey="session_programName"
              name="programName"
              required
              type="text"
              transform="uppercase"
              defaultValue={editingSession?.programName}
              placeholder="Program adı"
              className={cn(
                'w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]',
                fieldErrors.has('programName') && 'ring-2 ring-rose-500 border-rose-500/70'
              )}
            />
            </div>

            <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300">Bölüm</label>
            <SmartInput
              storageKey="session_title"
              name="title"
              required
              type="text"
              transform="sentence"
              defaultValue={editingSession?.title}
              placeholder="Bölüm adı"
              className={cn(
                'w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]',
                fieldErrors.has('title') && 'ring-2 ring-rose-500 border-rose-500/70'
              )}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-300">Kategori</label>
              <select
                name="category"
                required
                defaultValue={editingSession?.category || 'HABER'}
                className="w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
              >
                <option value="SİNEMA">SİNEMA</option>
                <option value="KİTAP">KİTAP</option>
                <option value="ARKEOLOJİ">ARKEOLOJİ</option>
                <option value="MÜZİK">MÜZİK</option>
                <option value="TİYATRO">TİYATRO</option>
                <option value="KİŞİSEL GELİŞİM">KİŞİSEL GELİŞİM</option>
                <option value="PSİKOLOJİ">PSİKOLOJİ</option>
                <option value="BİLİM">BİLİM</option>
                <option value="ÇOCUK">ÇOCUK</option>
                <option value="KÜLTÜR">KÜLTÜR</option>
                <option value="TOPLUM">TOPLUM</option>
                <option value="HABER">HABER</option>
                <option value="POPÜLER KÜLTÜR">POPÜLER KÜLTÜR</option>
                <option value="DİĞER">DİĞER</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-300">Çekim Türü</label>
              <select
                name="shootingType"
                required
                defaultValue={editingSession?.shootingType || 'İç Çekim'}
                className="w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
              >
                <option value="İç Çekim">İç Çekim</option>
                <option value="Dış Çekim">Dış Çekim</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-300">Konum</label>
              <SmartInput
                storageKey="session_location"
                name="location"
                required
                type="text"
                transform="title"
                defaultValue={editingSession?.location}
                placeholder="Çekim yeri"
                className={cn(
                  'w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]',
                  fieldErrors.has('location') && 'ring-2 ring-rose-500 border-rose-500/70'
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300">Tarih</label>
            <input
              name="startDate"
              type="date"
              defaultValue={editingSession ? format(parseISO(editingSession.startTime), 'yyyy-MM-dd') : ''}
              className={cn(
                'w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]',
                fieldErrors.has('startDate') && 'ring-2 ring-rose-500 border-rose-500/70'
              )}
            />
            </div>

            <div>
            <label className="mb-1 block text-xs font-bold text-zinc-300">Saat</label>
            <input
              name="startTime"
              type="time"
              defaultValue={editingSession ? format(parseISO(editingSession.startTime), 'HH:mm') : ''}
              className={cn(
                'w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]',
                fieldErrors.has('startTime') && 'ring-2 ring-rose-500 border-rose-500/70'
              )}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className={cn(
                'space-y-2 rounded-xl',
                fieldErrors.has('moderators') && 'ring-2 ring-rose-500 ring-offset-2 ring-offset-[rgba(0,0,0,0.2)]'
              )}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Moderatörler</label>
                <button
                  type="button"
                  onClick={() => setModeratorInputs([...moderatorInputs, ''])}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ff6600]/40 px-2 py-0.5 text-xs font-bold text-[#ff6600] hover:bg-[#ff6600]/10"
                >
                  <Plus size={12} /> Ekle
                </button>
              </div>
              <div className="space-y-1.5">
                {moderatorInputs.map((mod, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <SmartInput
                      storageKey="session_moderator"
                      value={mod}
                      transform="title"
                      onChange={(ev) => {
                        const next = [...moderatorInputs];
                        next[index] = ev.target.value;
                        setModeratorInputs(next);
                      }}
                      type="text"
                      placeholder="Moderatör adı"
                      className="flex-1 rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setModeratorInputs(
                          moderatorInputs.length > 1 ? moderatorInputs.filter((_, i) => i !== index) : ['']
                        )
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ff6600]/40 text-zinc-200 hover:bg-rose-500/20"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Konuklar</label>
                <button
                  type="button"
                  onClick={() => setGuestInputs([...guestInputs, ''])}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#ff6600]/40 px-2 py-0.5 text-xs font-bold text-[#ff6600] hover:bg-[#ff6600]/10"
                >
                  <Plus size={12} /> Ekle
                </button>
              </div>
              <div className="space-y-1.5">
                {guestInputs.map((guest, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <SmartInput
                      storageKey="session_guest"
                      value={guest}
                      transform="title"
                      onChange={(ev) => {
                        const next = [...guestInputs];
                        next[index] = ev.target.value;
                        setGuestInputs(next);
                      }}
                      type="text"
                      placeholder="Konuk adı"
                      className="flex-1 rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestInputs(guestInputs.length > 1 ? guestInputs.filter((_, i) => i !== index) : [''])}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ff6600]/40 text-zinc-200 hover:bg-rose-500/20"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
            <label className="mb-1 block text-xs font-bold text-zinc-300">Notlar</label>
            <div className="col-start-1 row-start-2">
              <SmartInput
                storageKey="session_notes"
                name="notes"
                type="text"
                defaultValue={editingSession?.notes}
                placeholder="Çekim notları..."
                className="w-full rounded-xl border border-[#ff6600]/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="İptal"
              className="col-start-2 row-start-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/70 bg-rose-500/20 text-white hover:bg-rose-500/30"
            >
              <X size={16} />
            </button>
            <button
              type="submit"
              aria-label="Kaydet"
              className="col-start-3 row-start-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#ff6600] bg-[#ff6600]/15 text-[#ff6600] hover:bg-[#ff6600]/25"
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
