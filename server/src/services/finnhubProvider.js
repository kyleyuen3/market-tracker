// Finnhub market data provider (requires a free API key).
// https://finnhub.io/docs/api
//
// Free tier: 60 API calls/minute — much more headroom than Alpha Vantage's
// 25/day, which is why this is meant to sit after alphavantage in the
// provider chain (MARKET_DATA_PROVIDERS=alphavantage,finnhub): once Alpha
// Vantage's daily quota is exhausted, Finnhub picks up the slack instead
// of falling straight to simulated data.
//
// Caveat: Finnhub's free tier does not include historical daily candles
// for most symbols (that's a paid feature) — fetchHistory will typically
// throw here, which is expected; the caller falls through to the next
// provider (or simulated data) for charts.

const BASE_URL = 'https://finnhub.io/api/v1';
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_MS = 30 * 1000; // 30 seconds — Finnhub's limit is generous

// Best-effort Yahoo-style index tickers. Index quotes may not be available
// on every Finnhub plan; if this fails, the chain falls through normally.
const INDEX_PROXIES = {
  '^spx': '^GSPC',
  '^ndq': '^IXIC',
  '^dji': '^DJI',
};

const cache = new Map(); // key -> { data, expiresAt }

function cacheTtlMs() {
  const raw = Number(process.env.FINNHUB_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CACHE_TTL_MS;
}

function getCached(key) {
  const hit = cache.get(key);
  return hit && hit.expiresAt > Date.now() ? hit.data : null;
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + cacheTtlMs() });
}

function resolveTicker(symbol) {
  const lower = symbol.trim().toLowerCase();
  return INDEX_PROXIES[lower] || symbol.trim().toUpperCase();
}

function apiKey() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY is not set');
  return key;
}

async function callApi(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('token', apiKey());

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 401 || res.status === 403) throw new Error(`finnhub auth error (${res.status})`);
  if (res.status === 429) throw new Error('finnhub rate limited (429)');
  if (!res.ok) throw new Error(`finnhub responded ${res.status}`);
  return res.json();
}

export async function fetchQuote(symbol) {
  const ticker = resolveTicker(symbol);
  const cacheKey = `quote:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const json = await callApi('/quote', { symbol: ticker });
  // An unknown symbol comes back as all-zero fields rather than an error.
  if (!json || (json.c === 0 && json.o === 0 && json.pc === 0)) {
    throw new Error(`no live data for ${symbol}`);
  }

  const quote = {
    symbol: symbol.toUpperCase(),
    date: json.t ? new Date(json.t * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    open: json.o,
    high: json.h,
    low: json.l,
    close: json.c,
    volume: null, // not included in Finnhub's /quote payload
  };
  setCached(cacheKey, quote);
  return quote;
}

export async function fetchHistory(symbol, days = 90) {
  const ticker = resolveTicker(symbol);
  const cacheKey = `history:${ticker}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const json = await callApi('/stock/candle', { symbol: ticker, resolution: 'D', from, to });

  if (!json || json.s !== 'ok' || !Array.isArray(json.c) || json.c.length === 0) {
    throw new Error(`no history for ${symbol} (${json?.s || 'no data'})`);
  }

  const rows = json.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    open: json.o[i],
    high: json.h[i],
    low: json.l[i],
    close: json.c[i],
    volume: json.v ? json.v[i] : null,
  }));

  setCached(cacheKey, rows);
  return rows;
}
