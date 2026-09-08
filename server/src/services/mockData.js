// Deterministic simulated market data, used only when the live provider
// (Stooq) is unreachable — e.g. no internet access, provider outage, or an
// unknown/delisted symbol. Every quote/history point is clearly flagged
// with `mock: true` so the UI can tell the user it's not real.

const BASE_PRICES = {
  AAPL: 190,
  MSFT: 420,
  GOOGL: 165,
  AMZN: 180,
  TSLA: 250,
  NVDA: 120,
  META: 550,
  SPX: 5500,
  NDQ: 19000,
  DJI: 40500,
};

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function basePrice(upperSymbol) {
  return BASE_PRICES[upperSymbol] ?? 50 + (hashString(upperSymbol) % 450);
}

export function mockQuote(symbol) {
  const upper = symbol.toUpperCase().replace('^', '');
  const base = basePrice(upper);
  // Bucket time into 5s windows so the "live" price drifts a little on
  // every poll, without needing persistent state between requests.
  const bucket = Math.floor(Date.now() / 5000);
  const rand = mulberry32(hashString(upper) ^ bucket);

  const open = +(base + (rand() - 0.5) * base * 0.015).toFixed(2);
  const close = +(open + (rand() - 0.5) * base * 0.012).toFixed(2);
  const high = +(Math.max(open, close) * (1 + rand() * 0.004)).toFixed(2);
  const low = +(Math.min(open, close) * (1 - rand() * 0.004)).toFixed(2);

  return {
    symbol: upper,
    date: new Date().toISOString().slice(0, 10),
    open,
    high,
    low,
    close,
    volume: 1_000_000 + Math.floor(rand() * 5_000_000),
    mock: true,
  };
}

export function mockHistory(symbol, days = 90) {
  const upper = symbol.toUpperCase().replace('^', '');
  const base = basePrice(upper);
  const rand = mulberry32(hashString(upper));

  let price = base * 0.9;
  const out = [];
  const today = new Date();
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    price = Math.max(1, price + (rand() - 0.48) * base * 0.015);
    out.push({ date: d.toISOString().slice(0, 10), close: +price.toFixed(2), mock: true });
  }
  return out;
}
