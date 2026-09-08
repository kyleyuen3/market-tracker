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

By default the server calls **Stooq**'s free quote/history endpoints — no
signup or API key needed. If that call fails for any reason (offline
environment, rate limiting, an unrecognized symbol, provider outage, or a
restrictive network policy that blocks it), the server **transparently
falls back to deterministic simulated data** so the app keeps working
instead of erroring out. Simulated values are always flagged with
`mock: true` in the API response and shown with a small **sim** badge in
the UI, so you can tell live prices from placeholders at a glance.

### Using a real API key (Alpha Vantage)

To pull quotes from [Alpha Vantage](https://www.alphavantage.co) instead:

1. Get a free key: https://www.alphavantage.co/support/#api-key
2. `cp server/.env.example server/.env`
3. Edit `server/.env`:
   ```
   MARKET_DATA_PROVIDER=alphavantage
   ALPHA_VANTAGE_API_KEY=your-key-here
   ```
4. Restart the server (`npm run dev:server` or `npm run dev`).

`server/.env` is gitignored — your key is never committed. Indices (S&P
500, Nasdaq, Dow) are mapped to their standard ETF proxies (SPY, QQQ, DIA)
since Alpha Vantage's free tier doesn't expose raw index tickers.

**Rate limits matter here.** Alpha Vantage's free tier allows only **25
requests/day and 5/minute**. This app polls every 20s and requests every
symbol currently on screen (indices + holdings + watchlist) each time, so
without caching it would exhaust the daily quota in minutes. To manage
this, the Alpha Vantage provider caches each symbol's quote/history in
memory for 5 minutes by default — tune it with `ALPHA_VANTAGE_CACHE_TTL_MS`
in `server/.env` (e.g. `900000` for 15 minutes). Once the daily quota is
used up, requests will fail and the app falls back to simulated data (the
**sim** badge) until the quota resets — that's expected behavior on the
free tier, not a bug. A paid Alpha Vantage plan removes this ceiling.

To wire in a different provider entirely (e.g. Finnhub, IEX Cloud), add a
module implementing `fetchQuote(symbol)` and `fetchHistory(symbol, days)`
next to `server/src/services/alphaVantageProvider.js`, then register it in
the `PROVIDERS` map in `server/src/services/marketData.js`.

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
    ├── .env.example        Provider config template (copy to .env)
    └── src/
        ├── routes/        /api/market, /api/portfolio, /api/watchlist, /api/history
        ├── services/       Stooq + Alpha Vantage clients, mock-data fallback, unified marketData layer
        └── data/store.js   JSON-file persistence
```
