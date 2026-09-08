import express from 'express';
import cors from 'cors';

import marketRouter from './routes/market.js';
import portfolioRouter from './routes/portfolio.js';
import watchlistRouter from './routes/watchlist.js';
import historyRouter from './routes/history.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/market', marketRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/history', historyRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`market-tracker server listening on http://localhost:${PORT}`);
});
