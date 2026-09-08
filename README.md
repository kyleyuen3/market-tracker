# Market Tracker

A simple stock market & portfolio tracker: track holdings with cost basis and
live gain/loss, keep a watchlist of symbols you're interested in, and see an
overview of the major indices — all in one dashboard.

## Stack

- **Client:** React + Vite (`client/`)
- **Server:** Node.js + Express (`server/`), JSON-file persistence (`server/data/db.json`)
- **Market data:** [Stooq](https://stooq.com) free CSV endpoints — no API key required

## Features

- **Dashboard** — market indices (S&P 500, Nasdaq, Dow) and a portfolio summary (total value, cost, gain/loss).
- **Portfolio** — add/remove holdings (symbol, quantity, avg cost per share, purchase date), with live price, day change, market value, and gain/loss ($ and %) per position. Click a symbol to expand a price-history sparkline.
- **Watchlist** — track symbols you don't own, with live price and day change.

All views auto-refresh every 20 seconds.

## Getting started

```bash
npm install
npm run dev
```

This starts the API server on `http://localhost:4000` and the Vite dev
server on `http://localhost:5173` (which proxies `/api` to the server).
Open `http://localhost:5173`.

Run them individually if you prefer:

```bash
npm run dev:server   # API on :4000
npm run dev:client   # Vite dev server on :5173
```

### Production build

```bash
npm run build   # builds client/dist
npm start        # serves the API on :4000 (PORT env var to override)
```

Serve `client/dist` with any static host (or point a reverse proxy at it)
and proxy `/api` to the Express server.

## How price data works

The server calls Stooq's free quote/history endpoints directly — no
signup or API key needed. If that call fails for any reason (offline
environment, rate limiting, an unrecognized symbol, provider outage), the
server **transparently falls back to deterministic simulated data** so the
app keeps working instead of erroring out. Simulated values are always
flagged with `mock: true` in the API response and shown with a small
**sim** badge in the UI, so you can tell live prices from placeholders at a
glance.

To swap in a different provider (e.g. Alpha Vantage or Finnhub with an API
key), edit `server/src/services/quoteProvider.js` — it just needs to
implement `fetchQuote(symbol)` and `fetchHistory(symbol, days)`.

## Data persistence

Holdings and watchlist entries are stored in `server/data/db.json`, created
automatically on first write. It's gitignored since it's per-deployment
user data — back it up yourself if it matters to you.

## Project layout

```
market-tracker/
├── client/               React + Vite frontend
│   └── src/
│       ├── components/   Dashboard, PortfolioView, WatchlistView, etc.
│       ├── api.js        Fetch wrapper for the backend API
│       └── format.js     Currency/percent formatting helpers
└── server/                Express backend
    └── src/
        ├── routes/        /api/market, /api/portfolio, /api/watchlist, /api/history
        ├── services/       Stooq client, mock-data fallback, unified marketData layer
        └── data/store.js   JSON-file persistence
```
