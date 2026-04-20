import "dotenv/config";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";

/** API / App ile uyumlu oturum modeli (kayitlar sayfasıyla eşlenir) */
export interface Session {
  id: string;
  programName: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  shootingType: string;
  category: string;
  crew: unknown[];
  moderators: unknown[];
  guests: unknown[];
  equipment: unknown[];
  status: string;
  notes: string;
}

/** "kayitlar" sekmesi sütunları */
export interface KayitRow {
  id: string;
  baslik: string;
  tarih: string;
  saat: string;
  mekan: string;
  durum: string;
  tur: string;
  maderatorler: string;
  konuklar: string;
  aciklama: string;
  notlar: string;
}

/** "kullanicilar" sekmesi sütunları */
export interface Kullanici {
  kullanici_adi: string;
  isim: string;
  durum: string;
  sifre: string;
}

const SHEET_KAYITLAR = "kayitlar";
const SHEET_KULLANICILAR = "kullanicilar";

class SheetsService {
  private readonly doc?: GoogleSpreadsheet;
  private readonly sheetCache = new Map<string, GoogleSpreadsheetWorksheet>();
  private readonly useFallback: boolean;
  private fallbackSessions: Session[] = [];
  private fallbackKullanicilar: Kullanici[] = [];

  constructor() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const sheetId = process.env.SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      this.useFallback = true;
      console.warn(
        "Google Sheets env vars are missing. Running in fallback in-memory mode until env is configured."
      );
      return;
    }

    this.useFallback = false;
    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.doc = new GoogleSpreadsheet(sheetId, auth);
  }

  private safeJsonParse(value: string): unknown[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private logGoogleError(context: string, error: unknown): void {
    const err = error as {
      message?: string;
      code?: number | string;
      status?: number;
      response?: { status?: number; data?: unknown };
      errors?: unknown;
    };

    console.error(`[SheetsService:${context}]`, {
      message: err?.message,
      code: err?.code,
      status: err?.status ?? err?.response?.status,
      responseData: err?.response?.data,
      errors: err?.errors,
      raw: error,
    });
  }

  /** kayitlar satırı -> Session */
  private kayitToSession(row: Record<string, string>): Session {
    const tarih = row.tarih || "";
    const saat = row.saat || "";
    let startTime = "";
    if (tarih && saat) {
      const iso = `${tarih}T${saat.length === 5 ? saat + ":00" : saat}`;
      const d = new Date(iso);
      startTime = Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }

    let programName = "";
    let title = row.baslik || "";
    let category = "";
    let crew: unknown[] = [];
    let equipment: unknown[] = [];
    let endTime = "";

    const aciklama = row.aciklama || "";
    if (aciklama.trim().startsWith("{")) {
      try {
        const extra = JSON.parse(aciklama) as {
          programName?: string;
          title?: string;
          category?: string;
          crew?: unknown[];
          equipment?: unknown[];
          endTime?: string;
        };
        if (extra.programName) programName = extra.programName;
        if (extra.title) title = extra.title;
        if (extra.category) category = extra.category;
        if (Array.isArray(extra.crew)) crew = extra.crew;
        if (Array.isArray(extra.equipment)) equipment = extra.equipment;
        if (extra.endTime) endTime = extra.endTime;
      } catch {
        programName = aciklama;
      }
    } else if (aciklama) {
      const parts = aciklama.split(" | ");
      if (parts.length >= 2) {
        programName = parts[0]?.trim() || "";
        title = parts.slice(1).join(" | ").trim() || title;
      } else {
        programName = aciklama;
      }
    }

    return {
      id: row.id || "",
      programName,
      title,
      startTime,
      endTime: endTime || startTime,
      location: row.mekan || "",
      shootingType: row.tur || "",
      category,
      crew,
      moderators: this.safeJsonParse(row.maderatorler || "[]"),
      guests: this.safeJsonParse(row.konuklar || "[]"),
      equipment,
      status: row.durum || "",
      notes: row.notlar || "",
    };
  }

  /** Session -> kayitlar satırı */
  private sessionToKayit(session: Session): Record<string, string> {
    let tarih = "";
    let saat = "";
    if (session.startTime) {
      const d = new Date(session.startTime);
      if (!Number.isNaN(d.getTime())) {
        tarih = d.toISOString().slice(0, 10);
        saat = d.toISOString().slice(11, 16);
      }
    }

    const baslik =
      session.programName && session.title
        ? `${session.programName} | ${session.title}`
        : session.title || session.programName || "";

    const aciklama = JSON.stringify({
      programName: session.programName || "",
      title: session.title || "",
      category: session.category || "",
      crew: session.crew || [],
      equipment: session.equipment || [],
      endTime: session.endTime || session.startTime || "",
    });

    return {
      id: session.id || "",
      baslik,
      tarih,
      saat,
      mekan: session.location || "",
      durum: session.status || "",
      tur: session.shootingType || "",
      maderatorler: JSON.stringify(session.moderators || []),
      konuklar: JSON.stringify(session.guests || []),
      aciklama,
      notlar: session.notes || "",
    };
  }

  private async getSheetByTitle(title: string): Promise<GoogleSpreadsheetWorksheet> {
    if (this.useFallback || !this.doc) {
      throw new Error("Sheets API is not configured");
    }

    const cached = this.sheetCache.get(title);
    if (cached) return cached;

    await this.doc.loadInfo();
    const sheet = this.doc.sheetsByTitle[title];
    if (!sheet) {
      const names = this.doc.sheetsByIndex.map((s) => s.title).join(", ");
      throw new Error(`Sheet tab "${title}" not found. Available: ${names || "(none)"}`);
    }
    this.sheetCache.set(title, sheet);
    return sheet;
  }

  // ---------- kayitlar (sessions API) ----------

  async getSessions(): Promise<Session[]> {
    if (this.useFallback) {
      return [...this.fallbackSessions];
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KAYITLAR);
      const rows = await sheet.getRows<Record<string, string>>();
      return rows
        .map((row) => this.kayitToSession(row.toObject()))
        .filter((s) => s.id.trim() !== "");
    } catch (error) {
      this.logGoogleError("getSessions", error);
      throw new Error(`Failed to get sessions: ${String(error)}`);
    }
  }

  async addSession(session: Session): Promise<void> {
    if (this.useFallback) {
      this.fallbackSessions.push(session);
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KAYITLAR);
      await sheet.addRow(this.sessionToKayit(session));
    } catch (error) {
      this.logGoogleError("addSession", error);
      throw new Error(`Failed to add session: ${String(error)}`);
    }
  }

  async updateSession(id: string, session: Session): Promise<void> {
    if (this.useFallback) {
      const index = this.fallbackSessions.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`Session with id '${id}' not found`);
      this.fallbackSessions[index] = { ...session, id };
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KAYITLAR);
      const rows = await sheet.getRows<Record<string, string>>();
      const row = rows.find((r) => r.get("id") === id);
      if (!row) throw new Error(`Session with id '${id}' not found`);

      const payload = this.sessionToKayit({ ...session, id });
      Object.entries(payload).forEach(([key, value]) => row.set(key, value));
      await row.save();
    } catch (error) {
      this.logGoogleError("updateSession", error);
      throw new Error(`Failed to update session: ${String(error)}`);
    }
  }

  async deleteSession(id: string): Promise<void> {
    if (this.useFallback) {
      const before = this.fallbackSessions.length;
      this.fallbackSessions = this.fallbackSessions.filter((item) => item.id !== id);
      if (this.fallbackSessions.length === before) {
        throw new Error(`Session with id '${id}' not found`);
      }
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KAYITLAR);
      const rows = await sheet.getRows<Record<string, string>>();
      const row = rows.find((r) => r.get("id") === id);
      if (!row) throw new Error(`Session with id '${id}' not found`);
      await row.delete();
    } catch (error) {
      this.logGoogleError("deleteSession", error);
      throw new Error(`Failed to delete session: ${String(error)}`);
    }
  }

  // ---------- kullanicilar ----------

  private kullaniciToRow(k: Kullanici): Record<string, string> {
    return {
      kullanici_adi: k.kullanici_adi || "",
      isim: k.isim || "",
      durum: k.durum || "",
      sifre: k.sifre || "",
    };
  }

  private rowToKullanici(row: Record<string, string>): Kullanici {
    return {
      kullanici_adi: row.kullanici_adi || row.eposta || "",
      isim: row.isim || "",
      durum: row.durum || "",
      sifre: row.sifre || "",
    };
  }

  async getKullanicilar(): Promise<Kullanici[]> {
    if (this.useFallback) {
      return [...this.fallbackKullanicilar];
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KULLANICILAR);
      const rows = await sheet.getRows<Record<string, string>>();
      return rows
        .map((row) => this.rowToKullanici(row.toObject()))
        .filter((k) => (k.kullanici_adi || "").trim() !== "");
    } catch (error) {
      this.logGoogleError("getKullanicilar", error);
      throw new Error(`Failed to get kullanicilar: ${String(error)}`);
    }
  }

  async addKullanici(k: Kullanici): Promise<void> {
    if (this.useFallback) {
      this.fallbackKullanicilar.push(k);
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KULLANICILAR);
      await sheet.addRow(this.kullaniciToRow(k));
    } catch (error) {
      this.logGoogleError("addKullanici", error);
      throw new Error(`Failed to add kullanici: ${String(error)}`);
    }
  }

  async updateKullanici(kullaniciAdi: string, k: Kullanici): Promise<void> {
    if (this.useFallback) {
      const idx = this.fallbackKullanicilar.findIndex((x) => x.kullanici_adi === kullaniciAdi);
      if (idx === -1) throw new Error(`Kullanici '${kullaniciAdi}' not found`);
      this.fallbackKullanicilar[idx] = { ...k, kullanici_adi: k.kullanici_adi || kullaniciAdi };
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KULLANICILAR);
      const rows = await sheet.getRows<Record<string, string>>();
      const row = rows.find((r) => r.get("kullanici_adi") === kullaniciAdi || r.get("eposta") === kullaniciAdi);
      if (!row) throw new Error(`Kullanici '${kullaniciAdi}' not found`);

      const payload = this.kullaniciToRow({ ...k, kullanici_adi: k.kullanici_adi || kullaniciAdi });
      Object.entries(payload).forEach(([key, value]) => row.set(key, value));
      await row.save();
    } catch (error) {
      this.logGoogleError("updateKullanici", error);
      throw new Error(`Failed to update kullanici: ${String(error)}`);
    }
  }

  async deleteKullanici(kullaniciAdi: string): Promise<void> {
    if (this.useFallback) {
      const before = this.fallbackKullanicilar.length;
      this.fallbackKullanicilar = this.fallbackKullanicilar.filter((x) => x.kullanici_adi !== kullaniciAdi);
      if (this.fallbackKullanicilar.length === before) {
        throw new Error(`Kullanici '${kullaniciAdi}' not found`);
      }
      return;
    }

    try {
      const sheet = await this.getSheetByTitle(SHEET_KULLANICILAR);
      const rows = await sheet.getRows<Record<string, string>>();
      const row = rows.find((r) => r.get("kullanici_adi") === kullaniciAdi || r.get("eposta") === kullaniciAdi);
      if (!row) throw new Error(`Kullanici '${kullaniciAdi}' not found`);
      await row.delete();
    } catch (error) {
      this.logGoogleError("deleteKullanici", error);
      throw new Error(`Failed to delete kullanici: ${String(error)}`);
    }
  }
}

export const sheetsService = new SheetsService();
