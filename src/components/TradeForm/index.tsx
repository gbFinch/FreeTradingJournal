import { useState } from 'react';
import { format } from 'date-fns';
import { useTradesStore } from '@/stores';
import type { TradeWithDerived, CreateTradeInput, UpdateTradeInput, Direction, Status } from '@/types';

interface TradeFormProps {
  trade?: TradeWithDerived;
  defaultAccountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TradeForm({ trade, defaultAccountId, onSuccess, onCancel }: TradeFormProps) {
  const { createTrade, updateTrade, isLoading } = useTradesStore();

  const [symbol, setSymbol] = useState(trade?.symbol ?? '');
  const [tradeDate, setTradeDate] = useState(
    trade?.trade_date ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [direction, setDirection] = useState<Direction>(trade?.direction ?? 'long');
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? '');
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() ?? '');
  const [stopLossPrice, setStopLossPrice] = useState(trade?.stop_loss_price?.toString() ?? '');
  const [fees, setFees] = useState(trade?.fees?.toString() ?? '0');
  const [strategy, setStrategy] = useState(trade?.strategy ?? '');
  const [notes, setNotes] = useState(trade?.notes ?? '');
  const [status, setStatus] = useState<Status>(trade?.status ?? 'closed');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (trade) {
        // Update existing trade
        const input: UpdateTradeInput = {
          symbol: symbol || undefined,
          trade_date: tradeDate || undefined,
          direction,
          quantity: quantity ? parseFloat(quantity) : undefined,
          entry_price: entryPrice ? parseFloat(entryPrice) : undefined,
          exit_price: exitPrice ? parseFloat(exitPrice) : undefined,
          stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          fees: fees ? parseFloat(fees) : undefined,
          strategy: strategy || undefined,
          notes: notes || undefined,
          status,
        };
        await updateTrade(trade.id, input);
      } else {
        // Create new trade
        const input: CreateTradeInput = {
          account_id: defaultAccountId,
          symbol,
          trade_date: tradeDate,
          direction,
          quantity: quantity ? parseFloat(quantity) : undefined,
          entry_price: parseFloat(entryPrice),
          exit_price: exitPrice ? parseFloat(exitPrice) : undefined,
          stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          fees: fees ? parseFloat(fees) : undefined,
          strategy: strategy || undefined,
          notes: notes || undefined,
          status,
        };
        await createTrade(input);
      }
      onSuccess();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Symbol *
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="AAPL"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date *
          </label>
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Direction *
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="closed">Closed</option>
            <option value="open">Open</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="100"
            min="0"
            step="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entry Price *
          </label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="150.00"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Exit Price
          </label>
          <input
            type="number"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="155.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stop Loss
          </label>
          <input
            type="number"
            value={stopLossPrice}
            onChange={(e) => setStopLossPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="148.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fees
          </label>
          <input
            type="number"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Strategy
          </label>
          <input
            type="text"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="Breakout"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          rows={3}
          placeholder="Trade notes..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : trade ? 'Update Trade' : 'Create Trade'}
        </button>
      </div>
    </form>
  );
}
