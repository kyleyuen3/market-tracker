import { useEffect, useState } from 'react';
import { api } from '../api.js';
import MarketOverview from './MarketOverview.jsx';
import StatCard from './StatCard.jsx';
import { fmtCurrency, fmtPct, toneFor } from '../format.js';

const POLL_MS = 20000;

export default function Dashboard() {
  const [holdings, setHoldings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getPortfolio();
        if (!cancelled) {
          setHoldings(data);
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

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.costTotal, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="dashboard">
      <MarketOverview />
      <section className="panel">
        <h2>Portfolio Summary</h2>
        {error && <div className="error">{error}</div>}
        {holdings.length === 0 ? (
          <p className="empty-hint">No holdings yet — add one from the Portfolio tab.</p>
        ) : (
          <div className="stat-row">
            <StatCard label="Total Value" value={fmtCurrency(totalValue)} />
            <StatCard label="Total Cost" value={fmtCurrency(totalCost)} />
            <StatCard
              label="Total Gain/Loss"
              value={fmtCurrency(totalGain)}
              sub={fmtPct(totalGainPct)}
              tone={toneFor(totalGain)}
            />
            <StatCard label="Positions" value={holdings.length} />
          </div>
        )}
      </section>
    </div>
  );
}
