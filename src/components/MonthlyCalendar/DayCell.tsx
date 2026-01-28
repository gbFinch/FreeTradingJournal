import clsx from 'clsx';
import type { DayCellData } from './types';
import { formatCurrencyCompact } from './utils';

interface DayCellProps {
  data: DayCellData;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function DayCell({ data, isSelected, onClick }: DayCellProps) {
  const { dayNumber, isCurrentMonth, pnl, tradeCount, winRate } = data;
  const hasData = tradeCount > 0;

  const getColorClasses = () => {
    if (!isCurrentMonth) return 'bg-gray-100/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    if (!hasData) return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    if (pnl > 0) return 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600';
    if (pnl < 0) return 'bg-red-100 dark:bg-[#6b1c1c] border-red-300 dark:border-red-700';
    return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
  };

  return (
    <button
      onClick={onClick}
      disabled={!hasData}
      className={clsx(
        'relative h-24 p-2 rounded-md transition-all border',
        getColorClasses(),
        isCurrentMonth ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
        hasData && 'hover:opacity-90 cursor-pointer',
        !hasData && 'cursor-default',
        isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
      )}
    >
      {/* Date number */}
      <span
        className={clsx(
          'absolute top-1.5 right-2 text-xs',
          !isCurrentMonth && 'text-gray-400 dark:text-gray-600'
        )}
      >
        {dayNumber}
      </span>

      {/* Trade data */}
      {hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="text-base font-bold">{formatCurrencyCompact(pnl)}</span>
          <span className="text-xs text-gray-600 dark:text-white/90">
            {tradeCount} trade{tradeCount !== 1 ? 's' : ''}
          </span>
          {winRate !== null && (
            <span className="text-xs text-gray-500 dark:text-white/80">{winRate.toFixed(1)}%</span>
          )}
        </div>
      )}
    </button>
  );
}
