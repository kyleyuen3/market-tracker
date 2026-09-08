import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtPct, toneFor } from '../format.js';

const POLL_MS = 20000;

export default function MarketOverview() {
  const [indices, setIndices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getMarketOverview();
        if (!cancelled) {
          setIndices(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="panel">
      <h2>Market Overview</h2>
      {error && <div className="error">Market data unavailable: {error}</div>}
      {!error && indices.length === 0 && <p className="empty-hint">Loading…</p>}
      {indices.length > 0 && (
        <div className="index-row">
          {indices.map((idx) => {
            const chg = idx.close - idx.open;
            const chgPct = idx.open ? (chg / idx.open) * 100 : 0;
            return (
              <div key={idx.symbol} className={`index-card ${toneFor(chg)}`}>
                <div className="index-label">
                  {idx.label}
                  {idx.mock && (
                    <span className="mock-badge" title="Live data unavailable — showing simulated values">
                      sim
                    </span>
                  )}
                </div>
                <div className="index-value">
                  {idx.close?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <div className="index-change">{fmtPct(chgPct)}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
