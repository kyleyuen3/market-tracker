import { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import WatchlistView from './components/WatchlistView.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'watchlist', label: 'Watchlist' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <h1>📈 Market Tracker</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'portfolio' && <PortfolioView />}
        {tab === 'watchlist' && <WatchlistView />}
      </main>
    </div>
  );
}
