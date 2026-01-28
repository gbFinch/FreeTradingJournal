import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useAccountsStore, useThemeStore, useTradesStore, useMetricsStore } from '@/stores';
import Dashboard from '@/views/Dashboard';
import CalendarView from '@/views/CalendarView';
import TradeList from '@/views/TradeList';
import TradeDetail from '@/views/TradeDetail';
import TradeForm from '@/components/TradeForm';

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-bold">Trading Journal</h1>
        <ThemeToggle />
      </div>
      <nav className="flex-1 p-4">
        <button
          onClick={onAddTrade}
          className="w-full mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Trade
        </button>
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`
              }
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`
              }
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/trades"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`
              }
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Trades
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
        v0.1.0
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
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar onAddTrade={() => setShowTradeForm(true)} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
          </Routes>
        </main>

        {/* Add Trade Modal */}
        {showTradeForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold dark:text-gray-100">New Trade</h2>
                <button
                  onClick={() => setShowTradeForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
