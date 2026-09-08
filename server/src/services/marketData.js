// Single entry point the rest of the server uses for price data: try the
// live provider first, and transparently fall back to simulated data if it
// fails for any reason (network, rate limit, bad symbol).

import { fetchQuote, fetchHistory } from './quoteProvider.js';
import { mockQuote, mockHistory } from './mockData.js';

export async function getQuote(symbol) {
  try {
    return await fetchQuote(symbol);
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
    return await fetchHistory(symbol, days);
  } catch (err) {
    console.warn(`[history] live fetch failed for ${symbol}: ${err.message}. Using simulated data.`);
    return mockHistory(symbol, days);
  }
}
