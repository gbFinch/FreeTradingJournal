import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useTradesStore } from '@/stores';
import Select from '@/components/Select';
import type { TradeWithDerived, CreateTradeInput, UpdateTradeInput, Direction, Status, AssetClass, ExitExecution } from '@/types';

interface ExitRow {
  id: string;
  exit_date: string;
  exit_time: string;
  quantity: string;
  price: string;
  fees: string;
}

interface TradeFormProps {
  trade?: TradeWithDerived;
  defaultAccountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TradeForm({ trade, defaultAccountId, onSuccess, onCancel }: TradeFormProps) {
  const { createTrade, updateTrade, isLoading } = useTradesStore();

  const [symbol, setSymbol] = useState(trade?.symbol ?? '');
  const [assetClass, setAssetClass] = useState<AssetClass>(trade?.asset_class ?? 'stock');
  const [tradeDate, setTradeDate] = useState(
    trade?.trade_date ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [direction, setDirection] = useState<Direction>(trade?.direction ?? 'long');
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? '');
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() ?? '');
  const [stopLossPrice, setStopLossPrice] = useState(trade?.stop_loss_price?.toString() ?? '');
  const [entryFees, setEntryFees] = useState(trade?.fees?.toString() ?? '0');
  const [strategy, setStrategy] = useState(trade?.strategy ?? '');
  const [notes, setNotes] = useState(trade?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  // Exit executions state
  const [exits, setExits] = useState<ExitRow[]>(() => {
    // For editing existing trades, pre-populate with single exit if present
    if (trade?.exit_price) {
      return [{
        id: crypto.randomUUID(),
        exit_date: trade.trade_date,
        exit_time: trade.exit_time ?? '',
        quantity: trade.quantity?.toString() ?? '',
        price: trade.exit_price.toString(),
        fees: '0',
      }];
    }
    return [];
  });

  // Calculate totals from exits
  const exitStats = useMemo(() => {
    const totalQty = exits.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
    const totalFees = exits.reduce((sum, e) => sum + (parseFloat(e.fees) || 0), 0);
    const weightedSum = exits.reduce((sum, e) => {
      const qty = parseFloat(e.quantity) || 0;
      const price = parseFloat(e.price) || 0;
      return sum + (qty * price);
    }, 0);
    const avgPrice = totalQty > 0 ? weightedSum / totalQty : 0;
    return { totalQty, totalFees, avgPrice };
  }, [exits]);

  // Determine status based on exits
  const entryQty = parseFloat(quantity) || 0;
  const computedStatus: Status = exits.length === 0
    ? 'open'
    : (entryQty > 0 && Math.abs(exitStats.totalQty - entryQty) < 0.0001)
      ? 'closed'
      : 'open';

  const addExit = () => {
    setExits([...exits, {
      id: crypto.randomUUID(),
      exit_date: tradeDate,
      exit_time: '',
      quantity: '',
      price: '',
      fees: '0',
    }]);
  };

  const removeExit = (id: string) => {
    setExits(exits.filter(e => e.id !== id));
  };

  const updateExit = (id: string, field: keyof ExitRow, value: string) => {
    setExits(exits.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (trade) {
        // Update existing trade - exits not supported for update yet
        const input: UpdateTradeInput = {
          symbol: symbol || undefined,
          trade_date: tradeDate || undefined,
          direction,
          quantity: quantity ? parseFloat(quantity) : undefined,
          entry_price: entryPrice ? parseFloat(entryPrice) : undefined,
          exit_price: exits.length > 0 ? exitStats.avgPrice : undefined,
          stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          fees: parseFloat(entryFees) + exitStats.totalFees || undefined,
          strategy: strategy || undefined,
          notes: notes || undefined,
          status: computedStatus,
        };
        await updateTrade(trade.id, input);
      } else {
        // Create new trade with exits
        const exitExecutions: ExitExecution[] | undefined = exits.length > 0
          ? exits.map(e => ({
              exit_date: e.exit_date,
              exit_time: e.exit_time || undefined,
              quantity: parseFloat(e.quantity) || 0,
              price: parseFloat(e.price) || 0,
              fees: parseFloat(e.fees) || undefined,
            }))
          : undefined;

        const input: CreateTradeInput = {
          account_id: defaultAccountId,
          symbol,
          asset_class: assetClass,
          trade_date: tradeDate,
          direction,
          quantity: quantity ? parseFloat(quantity) : undefined,
          entry_price: parseFloat(entryPrice),
          stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
          fees: parseFloat(entryFees) || undefined,
          strategy: strategy || undefined,
          notes: notes || undefined,
          exits: exitExecutions,
        };
        await createTrade(input);
      }
      onSuccess();
    } catch (err) {
      setError(String(err));
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100";
  const smallInputClass = "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100";

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
            <span className="flex items-center gap-2">
              Symbol *
              {trade?.asset_class === 'option' && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                  OPT
                </span>
              )}
            </span>
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className={inputClass}
            placeholder="AAPL"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Asset Type
          </label>
          <Select
            value={assetClass}
            onChange={(value) => setAssetClass(value as AssetClass)}
            options={[
              { value: 'stock', label: 'Stock' },
              { value: 'option', label: 'Option' },
            ]}
            disabled={!!trade}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entry Date *
          </label>
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Direction *
          </label>
          <Select
            value={direction}
            onChange={(value) => setDirection(value as Direction)}
            options={[
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
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
            className={inputClass}
            placeholder="150.00"
            min="0"
            step="0.01"
            required
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
            className={inputClass}
            placeholder="148.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entry Fees
          </label>
          <input
            type="number"
            value={entryFees}
            onChange={(e) => setEntryFees(e.target.value)}
            className={inputClass}
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
            className={inputClass}
            placeholder="Breakout"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <div className={`px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400`}>
            {computedStatus === 'closed' ? 'Closed' : 'Open'}
            <span className="text-xs ml-2 text-gray-400">(auto)</span>
          </div>
        </div>
      </div>

      {/* Exits Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Exits
            </h3>
            {entryQty > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Exited: {exitStats.totalQty}/{entryQty} shares
                {exitStats.avgPrice > 0 && (
                  <span className="ml-2">
                    | Avg: ${exitStats.avgPrice.toFixed(2)}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={addExit}
            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            + Add Exit
          </button>
        </div>

        {exits.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic py-3 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            No exits added (position is open)
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
              <div className="col-span-3">Date</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2">Fees</div>
              <div className="col-span-1"></div>
            </div>

            {/* Exit rows */}
            {exits.map((exit) => (
              <div key={exit.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <input
                    type="date"
                    value={exit.exit_date}
                    onChange={(e) => updateExit(exit.id, 'exit_date', e.target.value)}
                    className={smallInputClass}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="time"
                    value={exit.exit_time}
                    onChange={(e) => updateExit(exit.id, 'exit_time', e.target.value)}
                    className={smallInputClass}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={exit.quantity}
                    onChange={(e) => updateExit(exit.id, 'quantity', e.target.value)}
                    className={smallInputClass}
                    placeholder="50"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={exit.price}
                    onChange={(e) => updateExit(exit.id, 'price', e.target.value)}
                    className={smallInputClass}
                    placeholder="155.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={exit.fees}
                    onChange={(e) => updateExit(exit.id, 'fees', e.target.value)}
                    className={smallInputClass}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeExit(exit.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove exit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warning if exit qty exceeds entry qty */}
        {entryQty > 0 && exitStats.totalQty > entryQty && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            Warning: Exit quantity ({exitStats.totalQty}) exceeds entry quantity ({entryQty})
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
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
