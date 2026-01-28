import clsx from 'clsx';
import type { WeeklySummary } from './types';
import { formatCurrencyCompact } from './utils';

interface WeekSummaryCellProps {
  summary: WeeklySummary;
}

export default function WeekSummaryCell({ summary }: WeekSummaryCellProps) {
  return (
    <div
      className={clsx(
        'h-24 bg-gray-800 rounded-md p-2 flex flex-col justify-center border border-gray-700',
        summary.tradingDays === 0 && 'opacity-50'
      )}
    >
      <div className="text-xs text-gray-400 mb-0.5">Week {summary.weekNumber}</div>
      {summary.tradingDays > 0 ? (
        <>
          <div
            className={clsx(
              'font-semibold text-sm',
              summary.totalPnl > 0
                ? 'text-green-400'
                : summary.totalPnl < 0
                ? 'text-red-400'
                : 'text-gray-300'
            )}
          >
            {formatCurrencyCompact(summary.totalPnl)}
          </div>
          <div className="text-xs text-gray-500">
            {summary.tradingDays} day{summary.tradingDays !== 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div className="text-xs text-gray-600">No trades</div>
      )}
    </div>
  );
}
