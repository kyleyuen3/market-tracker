// Live market data via Stooq's free, no-API-key CSV endpoints.
// https://stooq.com — delayed quotes and daily historical data, no signup required.

const QUOTE_URL = 'https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv';
const HISTORY_URL = 'https://stooq.com/q/d/l/?s={symbol}&i=d';
const FETCH_TIMEOUT_MS = 6000;

// Stooq expects US tickers suffixed with ".us" (e.g. aapl.us). Indices and
// symbols that already carry an exchange suffix are passed through as-is.
function normalizeSymbol(raw) {
  const s = raw.trim().toLowerCase();
  if (s.startsWith('^') || s.includes('.')) return s;
  return `${s}.us`;
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map((h) => h.trim());
  const values = lines[1].split(',');
  return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
}

export async function fetchQuote(symbol) {
  const url = QUOTE_URL.replace('{symbol}', encodeURIComponent(normalizeSymbol(symbol)));
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`stooq responded ${res.status}`);
  const row = parseCsv(await res.text());
  if (!row || !row.Close || row.Close === 'N/D') {
    throw new Error(`no live data for ${symbol}`);
  }
  return {
    symbol: symbol.toUpperCase(),
    date: row.Date,
    open: parseFloat(row.Open),
    high: parseFloat(row.High),
    low: parseFloat(row.Low),
    close: parseFloat(row.Close),
    volume: row.Volume ? parseInt(row.Volume, 10) : null,
  };
}

export async function fetchHistory(symbol, days = 90) {
  const url = HISTORY_URL.replace('{symbol}', encodeURIComponent(normalizeSymbol(symbol)));
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`stooq responded ${res.status}`);
  const text = (await res.text()).trim();
  const lines = text.split('\n');
  if (lines.length < 2) throw new Error(`no history for ${symbol}`);

  const rows = lines
    .slice(1)
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(',');
      return {
        date,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: volume ? parseInt(volume, 10) : null,
      };
    })
    .filter((r) => Number.isFinite(r.close));

  if (rows.length === 0) throw new Error(`no history for ${symbol}`);
  return rows.slice(-days);
}
