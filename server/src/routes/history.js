import { Router } from 'express';
import { getHistory } from '../services/marketData.js';

const router = Router();

router.get('/:symbol', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 90, 365);
    const history = await getHistory(req.params.symbol, days);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
