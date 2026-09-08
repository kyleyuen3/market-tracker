import { Router } from 'express';
import { getQuotes } from '../services/marketData.js';

const router = Router();

const INDICES = [
  { symbol: '^spx', label: 'S&P 500' },
  { symbol: '^ndq', label: 'Nasdaq Composite' },
  { symbol: '^dji', label: 'Dow Jones' },
];

router.get('/overview', async (_req, res, next) => {
  try {
    const quotes = await getQuotes(INDICES.map((i) => i.symbol));
    const overview = INDICES.map((idx, i) => ({ ...idx, ...quotes[i] }));
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

export default router;
