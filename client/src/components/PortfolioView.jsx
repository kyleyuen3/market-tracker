import { Fragment, useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtCurrency, fmtPct, toneFor } from '../format.js';
import SymbolSparkline from './SymbolSparkline.jsx';

const POLL_MS = 20000;
const EMPTY_FORM = { symbol: '', quantity: '', costBasis: '', purchaseDate: '' };

export default function PortfolioView() {
  const [holdings, setHoldings] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    try {
      const data = await api.getPortfolio();
      setHoldings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.symbol.trim() || !form.quantity || !form.costBasis) {
      setFormError('Symbol, quantity, and cost basis are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.addHolding({
        symbol: form.symbol.trim(),
        quantity: Number(form.quantity),
        costBasis: Number(form.costBasis),
        purchaseDate: form.purchaseDate || null,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    await api.removeHolding(id);
    await load();
  };

  return (
    <div className="portfolio-view">
      <section className="panel">
        <h2>Add Holding</h2>
        <form className="add-form" onSubmit={handleSubmit}>
          <input
            placeholder="Symbol (e.g. AAPL)"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
          />
          <input
            placeholder="Quantity"
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <input
            placeholder="Avg cost / share"
            type="number"
            min="0"
            step="any"
            value={form.costBasis}
            onChange={(e) => setForm({ ...form, costBasis: e.target.value })}
          />
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Holding'}
          </button>
        </form>
        {formError && <div className="error">{formError}</div>}
      </section>

      <section className="panel">
        <h2>Holdings</h2>
        {error && <div className="error">{error}</div>}
        {holdings.length === 0 ? (
          <p className="empty-hint">No holdings yet. Add your first position above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg Cost</th>
                <th>Price</th>
                <th>Day Chg</th>
                <th>Market Value</th>
                <th>Gain/Loss</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const dayChgPct = h.quote.open ? ((h.quote.close - h.quote.open) / h.quote.open) * 100 : 0;
                return (
                  <Fragment key={h.id}>
                    <tr>
                      <td>
                        <button type="button" className="link-btn" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                          {h.symbol}
                          {h.quote.mock && (
                            <span className="mock-badge" title="Live data unavailable — showing simulated price">
                              sim
                            </span>
                          )}
                        </button>
                      </td>
                      <td>{h.quantity}</td>
                      <td>{fmtCurrency(h.costBasis)}</td>
                      <td>{fmtCurrency(h.quote.close)}</td>
                      <td className={toneFor(dayChgPct)}>{fmtPct(dayChgPct)}</td>
                      <td>{fmtCurrency(h.marketValue)}</td>
                      <td className={toneFor(h.gain)}>
                        {fmtCurrency(h.gain)} ({fmtPct(h.gainPct)})
                      </td>
                      <td>
                        <button type="button" className="danger-btn" onClick={() => handleRemove(h.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                    {expanded === h.id && (
                      <tr className="chart-row">
                        <td colSpan={8}>
                          <SymbolSparkline symbol={h.symbol} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
