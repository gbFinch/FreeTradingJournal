import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useAccountsStore } from '@/stores';
import Dashboard from '@/views/Dashboard';
import CalendarView from '@/views/CalendarView';
import TradeList from '@/views/TradeList';
import TradeDetail from '@/views/TradeDetail';

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Trading Journal</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              Calendar
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/trades"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              Trades
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800 text-sm text-gray-500">
        v0.1.0
      </div>
    </aside>
  );
}

function App() {
  const { fetchAccounts } = useAccountsStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
