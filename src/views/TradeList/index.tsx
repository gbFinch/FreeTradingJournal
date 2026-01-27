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
      className="hover:bg-gray-50 cursor-pointer transition-colors"
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
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
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
            ? 'text-green-600'
            : (trade.net_pnl ?? 0) < 0
            ? 'text-red-600'
            : 'text-gray-500'
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
                ? 'bg-green-100 text-green-800'
                : trade.result === 'loss'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
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
        <h1 className="text-2xl font-bold text-gray-900">Trades</h1>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">New Trade</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
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
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}

      {!isLoading && trades.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p>No trades found.</p>
          <p className="mt-2">Click "New Trade" to add your first trade!</p>
        </div>
      )}

      {!isLoading && trades.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net P&L
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
