// Single entry point the rest of the server uses for price data: try each
// configured live provider in order, and transparently fall back to
// simulated data if all of them fail (network, rate limit, missing API
// key, bad symbol).

import * as stooq from './quoteProvider.js';
import * as alphaVantage from './alphaVantageProvider.js';
import * as finnhub from './finnhubProvider.js';
import { mockQuote, mockHistory } from './mockData.js';

const PROVIDER_MODULES = { stooq, alphavantage: alphaVantage, finnhub };

// MARKET_DATA_PROVIDERS selects the live sources to try, in order, as a
// comma-separated list, e.g. "alphavantage,finnhub" — if the first fails
// (or its quota is exhausted) the next is tried before giving up and
// simulating data. MARKET_DATA_PROVIDER (singular) is also accepted for a
// single provider, kept for backwards compatibility. Defaults to "stooq".
// See server/.env.example.
function providerChain() {
  const raw = process.env.MARKET_DATA_PROVIDERS || process.env.MARKET_DATA_PROVIDER || 'stooq';
  const names = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((name) => PROVIDER_MODULES[name]);
  return names.length ? names : ['stooq'];
}

export async function getQuote(symbol) {
  const failures = [];
  for (const name of providerChain()) {
    try {
      return await PROVIDER_MODULES[name].fetchQuote(symbol);
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
    }
  }
  console.warn(`[quotes] all providers failed for ${symbol} (${failures.join('; ')}). Using simulated data.`);
  return mockQuote(symbol);
}

export function getQuotes(symbols) {
  return Promise.all(symbols.map((s) => getQuote(s)));
}

export async function getHistory(symbol, days = 90) {
  const failures = [];
  for (const name of providerChain()) {
    try {
      return await PROVIDER_MODULES[name].fetchHistory(symbol, days);
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
    }
  }
  console.warn(`[history] all providers failed for ${symbol} (${failures.join('; ')}). Using simulated data.`);
  return mockHistory(symbol, days);
}
