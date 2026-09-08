import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SymbolSparkline({ symbol, days = 30 }) {
  const [points, setPoints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setError(null);
    api
      .getHistory(symbol, days)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, days]);

  if (error) return <div className="sparkline-error">Chart unavailable: {error}</div>;
  if (!points) return <div className="sparkline-error">Loading chart…</div>;
  if (points.length < 2) return <div className="sparkline-error">Not enough data for a chart.</div>;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 220;
  const h = 48;
  const step = w / (closes.length - 1);
  const coords = closes
    .map((c, i) => `${(i * step).toFixed(1)},${(h - ((c - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const trendUp = closes[closes.length - 1] >= closes[0];
  const isMock = points.some((p) => p.mock);

  return (
    <div className="sparkline-wrap">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`sparkline ${trendUp ? 'up' : 'down'}`}>
        <polyline points={coords} fill="none" strokeWidth="2" />
      </svg>
      <span className="sparkline-range">
        {days}d: {min.toFixed(2)} – {max.toFixed(2)}
        {isMock && (
          <span className="mock-badge" title="Live data unavailable — showing simulated values">
            sim
          </span>
        )}
      </span>
    </div>
  );
}
