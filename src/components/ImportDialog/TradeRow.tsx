import { useState } from 'react';
import type { AggregatedTrade, Execution } from '@/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface TradeRowProps {
  trade: AggregatedTrade;
  isSelected: boolean;
  onToggle: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export default function TradeRow({ trade, isSelected, onToggle }: TradeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMultipleExecutions = trade.entries.length > 1 || trade.exits.length > 1;

  return (
    <div className="bg-white dark:bg-gray-800">
      <div
        className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        onClick={onToggle}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 mr-3"
        />

        {/* Expand button */}
        {hasMultipleExecutions && (
          <button
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={clsx(
              'mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform',
              isExpanded ? 'rotate-90' : ''
            )}
          >
            &rsaquo;
          </button>
        )}
        {!hasMultipleExecutions && <div className="w-4 mr-2" />}

        {/* Trade Info */}
        <div className="flex-1 grid grid-cols-6 gap-4 text-sm">
          <div className="truncate">
            <span className="font-medium dark:text-gray-100">{trade.symbol}</span>
            {trade.asset_class === 'option' && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {trade.option_type?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium',
                trade.direction === 'long'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              )}
            >
              {trade.direction.toUpperCase()}
            </span>
          </div>
          <div className="text-right dark:text-gray-300">{trade.total_quantity.toFixed(0)}</div>
          <div className="text-right dark:text-gray-300">{formatPrice(trade.avg_entry_price)}</div>
          <div className="text-right dark:text-gray-300">{trade.avg_exit_price ? formatPrice(trade.avg_exit_price) : '-'}</div>
          <div
            className={clsx(
              'text-right font-medium',
              (trade.net_pnl ?? 0) > 0
                ? 'text-green-600 dark:text-green-400'
                : (trade.net_pnl ?? 0) < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {formatCurrency(trade.net_pnl)}
          </div>
        </div>
      </div>

      {/* Expanded Executions */}
      {isExpanded && hasMultipleExecutions && (
        <div className="px-12 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs">
          <div className="mb-2">
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Entries:</div>
            {trade.entries.map((exec, i) => (
              <ExecutionRow key={`entry-${i}`} execution={exec} />
            ))}
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Exits:</div>
            {trade.exits.map((exec, i) => (
              <ExecutionRow key={`exit-${i}`} execution={exec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionRow({ execution }: { execution: Execution }) {
  return (
    <div className="flex gap-4 text-gray-600 dark:text-gray-400 py-0.5">
      <span className="w-20">{format(new Date(execution.execution_date), 'MMM d')}</span>
      <span className="w-16">{execution.execution_time?.substring(0, 8) ?? '-'}</span>
      <span className="w-12 text-right">{execution.quantity.toFixed(0)}</span>
      <span className="w-20 text-right">{formatPrice(execution.price)}</span>
      <span className="w-16 text-right text-gray-400">{formatCurrency(execution.fees)}</span>
      <span className="flex-1 truncate text-gray-400">{execution.exchange ?? '-'}</span>
    </div>
  );
}
