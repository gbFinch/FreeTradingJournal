import { useState } from 'react';
import { useImportStore, useSelectedTradeCount, useTradesToImportCount, useOpenPositionsCount, useParseErrorCount } from '@/stores';
import { groupTradesByUnderlying } from '@/types';
import clsx from 'clsx';
import TradeRow from './TradeRow';

interface ImportPreviewProps {
  onImport: () => Promise<void>;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function ImportPreview({ onImport }: ImportPreviewProps) {
  const { preview, selectedTradeKeys, selectAllTrades, deselectAllTrades, toggleTradeSelection, isLoading } = useImportStore();
  const selectedCount = useSelectedTradeCount();
  const totalCount = useTradesToImportCount();
  const openCount = useOpenPositionsCount();
  const errorCount = useParseErrorCount();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOpenPositions, setShowOpenPositions] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  if (!preview) return null;

  const tradeGroups = groupTradesByUnderlying(preview.trades_to_import);
  const openGroups = groupTradesByUnderlying(preview.open_positions);

  const toggleGroup = (underlying: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(underlying)) {
      newExpanded.delete(underlying);
    } else {
      newExpanded.add(underlying);
    }
    setExpandedGroups(newExpanded);
  };

  const totalSelectedPnl = preview.trades_to_import
    .filter(t => selectedTradeKeys.has(t.key))
    .reduce((sum, t) => (t.net_pnl !== null ? (sum ?? 0) + t.net_pnl : sum), null as number | null);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCount}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Trades Found</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedCount}</div>
          <div className="text-xs text-green-600 dark:text-green-400">Selected</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{openCount}</div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">Open Positions</div>
        </div>
        {preview.duplicate_count > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{preview.duplicate_count}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Duplicates Skipped</div>
          </div>
        )}
        {errorCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg cursor-pointer" onClick={() => setShowErrors(!showErrors)}>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errorCount}</div>
            <div className="text-xs text-red-600 dark:text-red-400">Parse Errors</div>
          </div>
        )}
      </div>

      {/* Parse Errors */}
      {showErrors && errorCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
          <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Parse Errors:</h4>
          <div className="max-h-32 overflow-auto space-y-1">
            {preview.parse_errors.map((err, i) => (
              <div key={i} className="text-xs text-red-600 dark:text-red-400">
                Line {err.line_number}: {err.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={selectAllTrades}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAllTrades}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Deselect All
          </button>
        </div>
        {totalSelectedPnl !== null && (
          <div className="text-sm">
            Total P&L: <span className={clsx(
              'font-medium',
              totalSelectedPnl > 0 ? 'text-green-600 dark:text-green-400' :
              totalSelectedPnl < 0 ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            )}>{formatCurrency(totalSelectedPnl)}</span>
          </div>
        )}
      </div>

      {/* Trade Groups */}
      <div className="space-y-2 max-h-64 overflow-auto">
        {tradeGroups.map(group => (
          <div key={group.underlying} className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div
              onClick={() => toggleGroup(group.underlying)}
              className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'transition-transform',
                  expandedGroups.has(group.underlying) ? 'rotate-90' : ''
                )}>
                  &rsaquo;
                </span>
                <span className="font-medium dark:text-gray-100">{group.underlying}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({group.trades.length} trade{group.trades.length !== 1 ? 's' : ''})
                </span>
              </div>
              {group.totalPnl !== null && (
                <span className={clsx(
                  'text-sm font-medium',
                  group.totalPnl > 0 ? 'text-green-600 dark:text-green-400' :
                  group.totalPnl < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-600 dark:text-gray-400'
                )}>
                  {formatCurrency(group.totalPnl)}
                </span>
              )}
            </div>

            {expandedGroups.has(group.underlying) && (
              <div className="divide-y dark:divide-gray-700">
                {group.trades.map(trade => (
                  <TradeRow
                    key={trade.key}
                    trade={trade}
                    isSelected={selectedTradeKeys.has(trade.key)}
                    onToggle={() => toggleTradeSelection(trade.key)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Open Positions */}
      {openCount > 0 && (
        <div>
          <button
            onClick={() => setShowOpenPositions(!showOpenPositions)}
            className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
          >
            {showOpenPositions ? 'Hide' : 'Show'} {openCount} open position{openCount !== 1 ? 's' : ''}
          </button>

          {showOpenPositions && (
            <div className="mt-2 space-y-2 max-h-48 overflow-auto">
              {openGroups.map(group => (
                <div key={group.underlying} className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="font-medium text-yellow-700 dark:text-yellow-300">{group.underlying}</div>
                  {group.trades.map(trade => (
                    <div key={trade.key} className="text-sm text-yellow-600 dark:text-yellow-400">
                      {trade.symbol} - {trade.direction.toUpperCase()} {trade.total_quantity} @ {formatCurrency(trade.avg_entry_price)}
                      {trade.asset_class === 'option' && (
                        <span className="text-xs ml-1">
                          ({trade.option_type?.toUpperCase()} ${trade.strike_price} exp {trade.expiration_date})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <button
          onClick={onImport}
          disabled={selectedCount === 0 || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Import {selectedCount} Trade{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
