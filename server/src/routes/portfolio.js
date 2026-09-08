import { Router } from 'express';
import * as store from '../data/store.js';
import { getQuotes } from '../services/marketData.js';

const router = Router();

function enrich(holding, quote) {
  const marketValue = quote.close * holding.quantity;
  const costTotal = holding.costBasis * holding.quantity;
  const gain = marketValue - costTotal;
  const gainPct = costTotal ? (gain / costTotal) * 100 : 0;
  return {
    ...holding,
    quote,
    marketValue: +marketValue.toFixed(2),
    costTotal: +costTotal.toFixed(2),
    gain: +gain.toFixed(2),
    gainPct: +gainPct.toFixed(2),
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const holdings = await store.listHoldings();
    if (holdings.length === 0) return res.json([]);
    const quotes = await getQuotes(holdings.map((h) => h.symbol));
    res.json(holdings.map((h, i) => enrich(h, quotes[i])));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { symbol, quantity, costBasis, purchaseDate } = req.body;
    if (!symbol || !quantity || costBasis == null) {
      return res.status(400).json({ error: 'symbol, quantity, and costBasis are required' });
    }
    if (Number(quantity) <= 0 || Number(costBasis) < 0) {
      return res.status(400).json({ error: 'quantity must be positive and costBasis cannot be negative' });
    }
    const holding = await store.addHolding({
      symbol: symbol.trim().toUpperCase(),
      quantity: Number(quantity),
      costBasis: Number(costBasis),
      purchaseDate: purchaseDate || null,
    });
    res.status(201).json(holding);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const patch = {};
    if (req.body.quantity != null) patch.quantity = Number(req.body.quantity);
    if (req.body.costBasis != null) patch.costBasis = Number(req.body.costBasis);
    if (req.body.purchaseDate !== undefined) patch.purchaseDate = req.body.purchaseDate;
    const updated = await store.updateHolding(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'holding not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await store.removeHolding(req.params.id);
    if (!ok) return res.status(404).json({ error: 'holding not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
