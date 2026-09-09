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

### Using real API keys (Alpha Vantage, Finnhub — with fallback)

`MARKET_DATA_PROVIDERS` is an ordered, comma-separated list — each provider
is tried in turn, falling through to the next on failure (rate limit,
missing data, network error), and only falling back to simulated data if
every one of them fails. This lets you chain a low-quota provider with a
higher-quota one as backup, e.g. **Alpha Vantage → Finnhub**:

1. Get free keys:
   - Alpha Vantage: https://www.alphavantage.co/support/#api-key
   - Finnhub: https://finnhub.io/register (no credit card required)
2. `cp server/.env.example server/.env`
3. Edit `server/.env`:
   ```
   MARKET_DATA_PROVIDERS=alphavantage,finnhub
   ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
   FINNHUB_API_KEY=your-finnhub-key
   ```
4. Restart the server (`npm run dev:server` or `npm run dev`).

`server/.env` is gitignored — your keys are never committed. Indices (S&P
500, Nasdaq, Dow) are mapped to standard proxies for each provider (ETFs
SPY/QQQ/DIA for Alpha Vantage; Yahoo-style tickers ^GSPC/^IXIC/^DJI for
Finnhub) since neither free tier exposes a universal raw index ticker.

**Rate limits matter here — that's the whole reason for the fallback
chain.** Alpha Vantage's free tier allows only **25 requests/day and
5/minute**; this app polls every 20s across every symbol on screen
(indices + holdings + watchlist), so it exhausts that quota within
minutes on its own. Its provider module caches responses for 5 minutes by
default (`ALPHA_VANTAGE_CACHE_TTL_MS`) to soften that, but once the daily
quota is gone, requests to it fail — and with `finnhub` next in the chain,
the app keeps pulling live data instead of dropping straight to simulated
values. Finnhub's free tier (60 requests/minute, cached 30s by default via
`FINNHUB_CACHE_TTL_MS`) is far more generous, but **does not include free
historical daily candles** for most symbols — so `fetchHistory` (the
sparkline charts) will typically still fail over to simulated data on
Finnhub even when live quotes are working fine. Only when every provider
in the chain fails does the **sim** badge appear — that's expected
behavior on free tiers, not a bug.

To wire in a different provider entirely (e.g. IEX Cloud, Polygon.io), add
a module implementing `fetchQuote(symbol)` and `fetchHistory(symbol, days)`
next to `server/src/services/finnhubProvider.js`, then register it in the
`PROVIDER_MODULES` map in `server/src/services/marketData.js` and add its
name to your `MARKET_DATA_PROVIDERS` list.

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
        ├── services/       Stooq/Alpha Vantage/Finnhub clients, mock-data fallback, provider-chain marketData layer
        └── data/store.js   JSON-file persistence
```
