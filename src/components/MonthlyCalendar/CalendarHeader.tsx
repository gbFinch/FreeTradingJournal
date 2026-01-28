import { format, isSameMonth } from 'date-fns';
import clsx from 'clsx';
import type { MonthStats } from './types';
import { formatCurrencyCompact } from './utils';

interface CalendarHeaderProps {
  month: Date;
  stats: MonthStats;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onThisMonth: () => void;
  showNavigation?: boolean;
}

export default function CalendarHeader({
  month,
  stats,
  onPrevMonth,
  onNextMonth,
  onThisMonth,
  showNavigation = true,
}: CalendarHeaderProps) {
  const isCurrentMonth = isSameMonth(month, new Date());

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {showNavigation && (
          <>
            <button
              onClick={onPrevMonth}
              className="p-2 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
              aria-label="Previous month"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-100 min-w-[160px]">
              {format(month, 'MMMM yyyy')}
            </h2>
            <button
              onClick={onNextMonth}
              className="p-2 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
              aria-label="Next month"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            {isCurrentMonth && (
              <span className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded-md">
                This month
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span
          className={clsx(
            'px-3 py-1 rounded-md font-semibold',
            stats.totalPnl > 0
              ? 'bg-green-600/20 text-green-400'
              : stats.totalPnl < 0
              ? 'bg-red-600/20 text-red-400'
              : 'bg-gray-700 text-gray-300'
          )}
        >
          {formatCurrencyCompact(stats.totalPnl)}
        </span>
        <span className="text-gray-400">
          {stats.tradingDays} day{stats.tradingDays !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
