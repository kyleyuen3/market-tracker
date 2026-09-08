export const fmtCurrency = (n) =>
  n == null || Number.isNaN(n) ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const fmtPct = (n) =>
  n == null || Number.isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export const toneFor = (n) => (n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral');
