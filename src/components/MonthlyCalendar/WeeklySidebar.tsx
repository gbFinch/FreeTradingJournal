import clsx from 'clsx';
import type { WeeklySummary } from './types';
import { formatCurrencyCompact } from './utils';

interface WeeklySidebarProps {
  summaries: WeeklySummary[];
}

export default function WeeklySidebar({ summaries }: WeeklySidebarProps) {
  return (
    <div className="w-28 flex-shrink-0 flex flex-col gap-1">
      {summaries.map((week) => (
        <div
          key={week.weekNumber}
          className={clsx(
            'h-24 bg-gray-800 rounded-md p-2 flex flex-col justify-center',
            week.tradingDays === 0 && 'opacity-50'
          )}
        >
          <div className="text-xs text-gray-400 mb-0.5">Week {week.weekNumber}</div>
          {week.tradingDays > 0 ? (
            <>
              <div
                className={clsx(
                  'font-semibold text-sm',
                  week.totalPnl > 0
                    ? 'text-green-400'
                    : week.totalPnl < 0
                    ? 'text-red-400'
                    : 'text-gray-300'
                )}
              >
                {formatCurrencyCompact(week.totalPnl)}
              </div>
              <div className="text-xs text-gray-500">
                {week.tradingDays} day{week.tradingDays !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-600">No trades</div>
          )}
        </div>
      ))}
    </div>
  );
}
