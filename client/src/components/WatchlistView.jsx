import { Fragment, useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtCurrency, fmtPct, toneFor } from '../format.js';
import SymbolSparkline from './SymbolSparkline.jsx';

const POLL_MS = 20000;

export default function WatchlistView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [symbolInput, setSymbolInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    try {
      const data = await api.getWatchlist();
      setItems(data);
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

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!symbolInput.trim()) {
      setFormError('Enter a symbol.');
      return;
    }
    setSubmitting(true);
    try {
      await api.addWatch({ symbol: symbolInput.trim() });
      setSymbolInput('');
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    await api.removeWatch(id);
    await load();
  };

  return (
    <div className="watchlist-view">
      <section className="panel">
        <h2>Add to Watchlist</h2>
        <form className="add-form" onSubmit={handleAdd}>
          <input
            placeholder="Symbol (e.g. TSLA)"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </form>
        {formError && <div className="error">{formError}</div>}
      </section>

      <section className="panel">
        <h2>Watchlist</h2>
        {error && <div className="error">{error}</div>}
        {items.length === 0 ? (
          <p className="empty-hint">Your watchlist is empty. Add a symbol above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Day Chg</th>
                <th>Volume</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const chgPct = item.quote.open ? ((item.quote.close - item.quote.open) / item.quote.open) * 100 : 0;
                return (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        >
                          {item.symbol}
                          {item.quote.mock && (
                            <span className="mock-badge" title="Live data unavailable — showing simulated price">
                              sim
                            </span>
                          )}
                        </button>
                      </td>
                      <td>{fmtCurrency(item.quote.close)}</td>
                      <td className={toneFor(chgPct)}>{fmtPct(chgPct)}</td>
                      <td>{item.quote.volume?.toLocaleString() ?? '—'}</td>
                      <td>
                        <button type="button" className="danger-btn" onClick={() => handleRemove(item.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                    {expanded === item.id && (
                      <tr className="chart-row">
                        <td colSpan={5}>
                          <SymbolSparkline symbol={item.symbol} />
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
