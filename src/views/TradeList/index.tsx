import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTradesStore, useAccountsStore } from '@/stores';
import TradeForm from '@/components/TradeForm';
import clsx from 'clsx';
import type { TradeWithDerived } from '@/types';

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

interface TradeRowProps {
  trade: TradeWithDerived;
  onClick: () => void;
}

function TradeRow({ trade, onClick }: TradeRowProps) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap">
        {format(new Date(trade.trade_date), 'MMM d, yyyy')}
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-medium">{trade.symbol}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            trade.direction === 'long'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          )}
        >
          {trade.direction.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        ${trade.entry_price.toFixed(2)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {trade.quantity?.toFixed(0) ?? '-'}
      </td>
      <td
        className={clsx(
          'px-4 py-3 whitespace-nowrap text-right font-medium',
          (trade.net_pnl ?? 0) > 0
            ? 'text-green-600 dark:text-green-400'
            : (trade.net_pnl ?? 0) < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {formatCurrency(trade.net_pnl)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {trade.result && (
          <span
            className={clsx(
              'px-2 py-1 rounded text-xs font-medium',
              trade.result === 'win'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : trade.result === 'loss'
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            )}
          >
            {trade.result.toUpperCase()}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function TradeList() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const { trades, fetchTrades, isLoading } = useTradesStore();
  const { accounts, selectedAccountId } = useAccountsStore();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const defaultAccountId = selectedAccountId ?? accounts[0]?.id ?? '';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trades</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Trade
        </button>
      </div>

      {/* Trade Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold dark:text-gray-100">New Trade</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <TradeForm
                defaultAccountId={defaultAccountId}
                onSuccess={() => {
                  setShowForm(false);
                  fetchTrades();
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {!isLoading && trades.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p>No trades found.</p>
          <p className="mt-2">Click "New Trade" to add your first trade!</p>
        </div>
      )}

      {!isLoading && trades.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Net P&L
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {trades.map(trade => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onClick={() => navigate(`/trades/${trade.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
