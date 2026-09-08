import { Router } from 'express';
import * as store from '../data/store.js';
import { getQuotes } from '../services/marketData.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const items = await store.listWatchlist();
    if (items.length === 0) return res.json([]);
    const quotes = await getQuotes(items.map((i) => i.symbol));
    res.json(items.map((item, i) => ({ ...item, quote: quotes[i] })));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { symbol } = req.body;
    if (!symbol || !symbol.trim()) return res.status(400).json({ error: 'symbol is required' });
    const item = await store.addWatch({ symbol: symbol.trim().toUpperCase() });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await store.removeWatch(req.params.id);
    if (!ok) return res.status(404).json({ error: 'watch item not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
