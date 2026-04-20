import 'dotenv/config';

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { sheetsService, type Session, type Kullanici } from "./src/services/sheets.service";

console.log('EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'VAR' : 'YOK');
console.log('KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'VAR' : 'YOK');
console.log('SHEET_ID:', process.env.SHEET_ID ? 'VAR' : 'YOK');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await sheetsService.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const session = req.body as Session;
      if (!session?.id) {
        res.status(400).json({ error: "Session id is required" });
        return;
      }

      const existing = await sheetsService.getSessions();
      const exists = existing.some((item) => item.id === session.id);

      if (exists) {
        await sheetsService.updateSession(session.id, session);
      } else {
        await sheetsService.addSession(session);
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const session = req.body as Session;
      await sheetsService.updateSession(id, { ...session, id });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      await sheetsService.deleteSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.get("/api/kullanicilar", async (req, res) => {
    try {
      const list = await sheetsService.getKullanicilar();
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch kullanicilar" });
    }
  });

  app.post("/api/kullanicilar", async (req, res) => {
    try {
      const k = req.body as Kullanici;
      if (!k?.kullanici_adi?.trim()) {
        res.status(400).json({ error: "kullanici_adi is required" });
        return;
      }
      const existing = await sheetsService.getKullanicilar();
      if (existing.some((x) => x.kullanici_adi === k.kullanici_adi)) {
        await sheetsService.updateKullanici(k.kullanici_adi, k);
      } else {
        await sheetsService.addKullanici(k);
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save kullanici" });
    }
  });

  app.put("/api/kullanicilar/:kullanici_adi", async (req, res) => {
    try {
      const kullaniciAdi = decodeURIComponent(req.params.kullanici_adi);
      const k = req.body as Kullanici;
      await sheetsService.updateKullanici(kullaniciAdi, { ...k, kullanici_adi: k.kullanici_adi || kullaniciAdi });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update kullanici" });
    }
  });

  app.delete("/api/kullanicilar/:kullanici_adi", async (req, res) => {
    try {
      await sheetsService.deleteKullanici(decodeURIComponent(req.params.kullanici_adi));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete kullanici" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
