// Alpha Vantage market data provider (requires a free API key).
// https://www.alphavantage.co/documentation/
//
// Free-tier limits are tight: 25 requests/day, 5 requests/minute. This
// module caches every quote/history response in memory (TTL configurable
// via ALPHA_VANTAGE_CACHE_TTL_MS, default 5 minutes) to stretch that
// budget across a UI that polls every 20s. When the key is missing, or
// Alpha Vantage returns a rate-limit/error message, this throws — the
// caller (marketData.js) catches it and falls back to simulated data.

const BASE_URL = 'https://www.alphavantage.co/query';
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// The free tier has no raw index tickers; these highly-liquid ETFs are the
// standard tracking proxies for the indices this app shows.
const INDEX_PROXIES = {
  '^spx': 'SPY',
  '^ndq': 'QQQ',
  '^dji': 'DIA',
};

const cache = new Map(); // key -> { data, expiresAt }

function cacheTtlMs() {
  const raw = Number(process.env.ALPHA_VANTAGE_CACHE_TTL_MS);
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
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error('ALPHA_VANTAGE_API_KEY is not set');
  return key;
}

async function callApi(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', apiKey());

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`alpha vantage responded ${res.status}`);
  const json = await res.json();

  // Rate-limit and error responses still come back as 200 OK with a
  // message in place of the expected payload.
  if (json.Note) throw new Error(`alpha vantage rate limited: ${json.Note}`);
  if (json.Information) throw new Error(`alpha vantage: ${json.Information}`);
  if (json['Error Message']) throw new Error(`alpha vantage: ${json['Error Message']}`);
  return json;
}

export async function fetchQuote(symbol) {
  const ticker = resolveTicker(symbol);
  const cacheKey = `quote:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const json = await callApi({ function: 'GLOBAL_QUOTE', symbol: ticker });
  const row = json['Global Quote'];
  if (!row || !row['05. price']) throw new Error(`no live data for ${symbol}`);

  const quote = {
    symbol: symbol.toUpperCase(),
    date: row['07. latest trading day'],
    open: parseFloat(row['02. open']),
    high: parseFloat(row['03. high']),
    low: parseFloat(row['04. low']),
    close: parseFloat(row['05. price']),
    volume: row['06. volume'] ? parseInt(row['06. volume'], 10) : null,
  };
  setCached(cacheKey, quote);
  return quote;
}

export async function fetchHistory(symbol, days = 90) {
  const ticker = resolveTicker(symbol);
  const cacheKey = `history:${ticker}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const json = await callApi({
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: days > 100 ? 'full' : 'compact',
  });
  const series = json['Time Series (Daily)'];
  if (!series) throw new Error(`no history for ${symbol}`);

  const rows = Object.entries(series)
    .map(([date, v]) => ({
      date,
      open: parseFloat(v['1. open']),
      high: parseFloat(v['2. high']),
      low: parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
      volume: v['5. volume'] ? parseInt(v['5. volume'], 10) : null,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-days);

  if (rows.length === 0) throw new Error(`no history for ${symbol}`);
  setCached(cacheKey, rows);
  return rows;
}
