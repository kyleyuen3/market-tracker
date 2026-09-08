const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getMarketOverview: () => request('/market/overview'),

  getPortfolio: () => request('/portfolio'),
  addHolding: (data) => request('/portfolio', { method: 'POST', body: JSON.stringify(data) }),
  updateHolding: (id, data) => request(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeHolding: (id) => request(`/portfolio/${id}`, { method: 'DELETE' }),

  getWatchlist: () => request('/watchlist'),
  addWatch: (data) => request('/watchlist', { method: 'POST', body: JSON.stringify(data) }),
  removeWatch: (id) => request(`/watchlist/${id}`, { method: 'DELETE' }),

  getHistory: (symbol, days = 90) => request(`/history/${symbol}?days=${days}`),
};
