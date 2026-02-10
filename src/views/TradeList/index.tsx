import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTradesStore, useAccountsStore, useImportStore } from '@/stores';
import TradeForm from '@/components/TradeForm';
import ImportDialog from '@/components/ImportDialog';
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
  isSelected: boolean;
  onToggleSelect: (tradeId: string) => void;
  onClick: () => void;
}

function TradeRow({ trade, isSelected, onToggleSelect, onClick }: TradeRowProps) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          aria-label={`Select trade ${trade.symbol} on ${trade.trade_date}`}
          checked={isSelected}
          onChange={() => onToggleSelect(trade.id)}
          onClick={event => event.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {format(new Date(trade.trade_date), 'MMM d, yyyy')}
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-medium">
        <span className="flex items-center gap-1.5">
          {trade.symbol}
          {trade.asset_class === 'option' && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
              OPT
            </span>
          )}
        </span>
      </td>
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
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const { trades, fetchTrades, deleteTrades, isLoading } = useTradesStore();
  const { accounts, selectedAccountId } = useAccountsStore();
  const { openDialog: openImportDialog } = useImportStore();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    // Keep only selections for trades still visible in the current list.
    setSelectedTradeIds(current => {
      const validIds = new Set(trades.map(trade => trade.id));
      const next = new Set(Array.from(current).filter(id => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [trades]);

  const allSelected = trades.length > 0 && selectedTradeIds.size === trades.length;

  const toggleTradeSelection = (tradeId: string) => {
    setSelectedTradeIds(current => {
      const next = new Set(current);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTradeIds(new Set());
      return;
    }
    setSelectedTradeIds(new Set(trades.map(trade => trade.id)));
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedTradeIds);
      await deleteTrades(ids);
      setSelectedTradeIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete selected trades', error);
    }
  };

  const defaultAccountId = selectedAccountId ?? accounts[0]?.id ?? '';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trades</h1>
        <div className="flex gap-2">
          <button
            onClick={openImportDialog}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Import
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Trade
          </button>
        </div>
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
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {selectedTradeIds.size > 0
                ? `${selectedTradeIds.size} selected`
                : 'Select trades to perform bulk actions'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {allSelected ? 'Clear selection' : 'Select all'}
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={selectedTradeIds.size === 0}
                className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete selected
              </button>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all trades"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
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
                  isSelected={selectedTradeIds.has(trade.id)}
                  onToggleSelect={toggleTradeSelection}
                  onClick={() => navigate(`/trades/${trade.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md">
            <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Delete Selected Trades?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This will permanently delete {selectedTradeIds.size} selected trade
              {selectedTradeIds.size === 1 ? '' : 's'}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      <ImportDialog />
    </div>
  );
}
