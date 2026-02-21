import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useAccountsStore, useThemeStore, useTradesStore, useMetricsStore, useSidebarStore } from '@/stores';
import Dashboard from '@/views/Dashboard';
import CalendarView from '@/views/CalendarView';
import TradeList from '@/views/TradeList';
import TradeDetail from '@/views/TradeDetail';
import Metrics from '@/views/Metrics';
import TradeForm from '@/components/TradeForm';

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-xl border border-stone-300 p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

interface SidebarProps {
  onAddTrade: () => void;
}

function Sidebar({ onAddTrade }: SidebarProps) {
  const { isCollapsed, toggleCollapsed } = useSidebarStore();

  // Text fades out in place without moving
  const textClass = `whitespace-nowrap transition-opacity duration-300 ${
    isCollapsed ? 'opacity-0' : 'opacity-100'
  }`;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-[52px]' : 'w-64'
      } relative z-10 m-3 mr-0 app-panel text-stone-900 dark:text-stone-100 flex flex-col transition-[width] duration-300 ease-in-out`}
    >
      {/* Floating toggle button */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-5 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-stone-100 shadow-sm transition-colors hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center justify-center overflow-hidden border-b border-stone-200 p-4 dark:border-stone-800">
        <div className="text-center">
          <h1 className={`text-xl font-bold tracking-tight ${textClass}`}>Trading Journal</h1>
          {!isCollapsed && <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Local-first</p>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-hidden">
        <button
          onClick={onAddTrade}
          className="mb-4 flex w-full items-center gap-2 rounded-xl bg-amber-600 p-2 font-medium text-white transition-colors hover:bg-amber-700"
          title="Add Trade"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className={textClass}>Add Trade</span>
        </button>
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/"
              title="Dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 w-full rounded-lg ${
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`
              }
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              <span className={textClass}>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/calendar"
              title="Calendar"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 w-full rounded-lg ${
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`
              }
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={textClass}>Calendar</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/metrics"
              title="Metrics"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 w-full rounded-lg ${
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`
              }
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 13l4-4 3 3 5-5" />
              </svg>
              <span className={textClass}>Metrics</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/trades"
              title="Trades"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 w-full rounded-lg ${
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`
              }
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className={textClass}>Trades</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 overflow-hidden border-t border-stone-200 p-2 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
        {!isCollapsed && <span className={textClass}>v0.1.0</span>}
        <ThemeToggle />
      </div>
    </aside>
  );
}

function App() {
  const [showTradeForm, setShowTradeForm] = useState(false);
  const { fetchAccounts, accounts, selectedAccountId } = useAccountsStore();
  const { fetchTrades } = useTradesStore();
  const { fetchAll: fetchMetrics } = useMetricsStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const defaultAccountId = selectedAccountId ?? accounts[0]?.id ?? '';

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-transparent">
        <Sidebar onAddTrade={() => setShowTradeForm(true)} />
        <main className="z-0 flex-1 overflow-auto pr-3 pb-3">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
          </Routes>
        </main>

        {/* Add Trade Modal */}
        {showTradeForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="app-panel max-h-[90vh] w-full max-w-2xl overflow-auto">
              <div className="flex items-center justify-between border-b border-stone-200 p-4 dark:border-stone-700">
                <h2 className="text-lg font-semibold dark:text-stone-100">New Trade</h2>
                <button
                  onClick={() => setShowTradeForm(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                >
                  &times;
                </button>
              </div>
              <div className="p-4">
                <TradeForm
                  defaultAccountId={defaultAccountId}
                  onSuccess={() => {
                    setShowTradeForm(false);
                    fetchTrades();
                    fetchMetrics();
                  }}
                  onCancel={() => setShowTradeForm(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
