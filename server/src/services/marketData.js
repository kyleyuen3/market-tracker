// Single entry point the rest of the server uses for price data: try the
// configured live provider first, and transparently fall back to
// simulated data if it fails for any reason (network, rate limit, missing
// API key, bad symbol).

import * as stooq from './quoteProvider.js';
import * as alphaVantage from './alphaVantageProvider.js';
import { mockQuote, mockHistory } from './mockData.js';

const PROVIDERS = { stooq, alphavantage: alphaVantage };

// MARKET_DATA_PROVIDER selects the live source: "stooq" (default, free,
// no key) or "alphavantage" (requires ALPHA_VANTAGE_API_KEY). See
// server/.env.example.
function activeProvider() {
  const name = (process.env.MARKET_DATA_PROVIDER || 'stooq').toLowerCase();
  return PROVIDERS[name] || stooq;
}

export async function getQuote(symbol) {
  try {
    return await activeProvider().fetchQuote(symbol);
  } catch (err) {
    console.warn(`[quotes] live fetch failed for ${symbol}: ${err.message}. Using simulated data.`);
    return mockQuote(symbol);
  }
}

export function getQuotes(symbols) {
  return Promise.all(symbols.map((s) => getQuote(s)));
}

export async function getHistory(symbol, days = 90) {
  try {
    return await activeProvider().fetchHistory(symbol, days);
  } catch (err) {
    console.warn(`[history] live fetch failed for ${symbol}: ${err.message}. Using simulated data.`);
    return mockHistory(symbol, days);
  }
}
