import { useMetricsStore } from '@/stores';
import { format, isSameMonth } from 'date-fns';
import clsx from 'clsx';

type PeriodType = 'month' | 'ytd' | 'all';

export default function PeriodSelector() {
  const {
    periodType,
    selectedMonth,
    setPeriodType,
    goToPrevMonth,
    goToNextMonth,
    fetchAll,
  } = useMetricsStore();

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type);
    fetchAll();
  };

  const handlePrevMonth = () => {
    goToPrevMonth();
    fetchAll();
  };

  const handleNextMonth = () => {
    goToNextMonth();
    fetchAll();
  };

  return (
    <div className="flex items-center gap-4">
      {/* Month Navigator */}
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Previous month"
        >
          <svg
            className="w-4 h-4"
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
        <button
          onClick={() => handlePeriodChange('month')}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-w-[120px]',
            periodType === 'month'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          {format(selectedMonth, 'MMM yyyy')}
          {isCurrentMonth && periodType === 'month' && (
            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">(current)</span>
          )}
        </button>
        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Next month"
        >
          <svg
            className="w-4 h-4"
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
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Other Period Options */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => handlePeriodChange('ytd')}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            periodType === 'ytd'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          YTD
        </button>
        <button
          onClick={() => handlePeriodChange('all')}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            periodType === 'all'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          All Time
        </button>
      </div>
    </div>
  );
}
