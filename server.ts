import express from 'express';
import { sheetsService } from './src/services/sheets.service';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/kullanicilar', async (req, res) => {
  try {
    const kullanicilar = await sheetsService.getKullanicilar();
    res.json(kullanicilar);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch kullanicilar' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
